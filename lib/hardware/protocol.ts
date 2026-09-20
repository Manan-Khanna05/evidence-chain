/**
 * Evidence Chain hardware protocol, v1.
 *
 * One wire format for both transports. The ESP32-S3 emits exactly these
 * objects as newline-delimited JSON over USB serial and as WebSocket text
 * frames over Wi-Fi, so the parser below is the only place that knows the
 * shape of a device message.
 *
 * HONESTY BOUNDARY — read before extending:
 * The attached sensors instrument the SAMPLING ACT. A load cell measures the
 * force applied while collecting a swab; the MLX90640 measures a temperature
 * field; a microswitch reports whether the collector is fitted. None of them
 * identifies a substance, and nothing in this protocol carries a detection,
 * a probability or a referral tier. If a future board gains a trace detector,
 * that is a new field and a new claim — not a reinterpretation of these.
 */

export const PROTOCOL = "evidence-chain-v1";

export type DeviceStatus = "BOOTING" | "READY" | "ACQUIRING" | "FAULT";

/** Which physical link the browser is holding, if any. */
export type TransportKind = "wifi" | "usb" | "demo" | "none";

/** Which device the console is talking to, for naming in the UI. */
export type DeviceBrand = "PRAMAAN" | "Evidence device";

export type LinkState =
  | "disconnected"
  | "searching"
  | "connecting"
  | "syncing"
  | "connected"
  | "error";

/** Per-peripheral health, reported by the firmware at boot and on change. */
export interface SensorHealth {
  load_cell: boolean;
  thermal: boolean;
  collector_switch: boolean;
  acquire_button: boolean;
  reset_button: boolean;
}

export interface ThermalSummary {
  min_c: number;
  max_c: number;
  avg_c: number;
  /** 32×24 row-major, °C, rounded to 1dp. Omitted from high-rate telemetry. */
  frame?: number[];
}

export interface SensorSample {
  load_cell_g: number | null;
  load_cell_stable: boolean;
  thermal: ThermalSummary | null;
  /** Null when the device has no collector switch — never guessed as false. */
  collector_installed: boolean | null;
  /** Temperature, with the input it came from. Null when unavailable. */
  temperature_c?: number | null;
  temperature_source?: "potentiometer" | "thermal_camera" | null;
}

/* --------------------------------------------------------- device → host */

export interface HelloMessage {
  protocol: typeof PROTOCOL;
  type: "hello";
  device_id: string;
  firmware: string;
  /** Milliseconds since the device booted. Not a wall clock — see below. */
  uptime_ms: number;
  /**
   * The device has no real-time clock and no network time. It never asserts a
   * calendar time, and the host must not treat any device value as one.
   */
  has_rtc: false;
  sensors: SensorHealth;
  calibrated: boolean;
  wifi: { mode: "ap" | "sta" | "off"; ip: string | null; rssi: number | null };
}

export interface TelemetryMessage {
  protocol: typeof PROTOCOL;
  type: "telemetry";
  device_id: string;
  seq: number;
  uptime_ms: number;
  status: DeviceStatus;
  sensors: SensorSample;
}

/** Emitted the instant the physical ACQUIRE button is pressed. */
export interface AcquisitionMessage {
  protocol: typeof PROTOCOL;
  type: "acquisition";
  device_id: string;
  acquisition_id: string;
  uptime_ms: number;
  sensors: SensorSample;
  /** False when the collector was not fitted; the host must warn, not hide. */
  collector_ok: boolean;
}

export interface AckMessage {
  protocol: typeof PROTOCOL;
  type: "ack";
  device_id: string;
  /** "reset" is a session reset. It never deletes an evidence record. */
  action: "reset" | "acquire" | "tare" | "calibrate" | "fault_cleared";
  ok: boolean;
  detail?: string;
}

export interface FaultMessage {
  protocol: typeof PROTOCOL;
  type: "fault";
  device_id: string;
  code: string;
  detail: string;
}

export type DeviceMessage =
  | HelloMessage
  | TelemetryMessage
  | AcquisitionMessage
  | AckMessage
  | FaultMessage;

/* --------------------------------------------------------- host → device */

export type HostCommand =
  | { type: "acquire" }
  | { type: "reset" }
  | { type: "tare" }
  | { type: "calibrate"; known_mass_g: number }
  | { type: "identify" };

/* ------------------------------------------------------------- validation */

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown) => v === true;

function parseThermal(v: unknown): ThermalSummary | null {
  if (!isObj(v)) return null;
  const min = num(v.min_c);
  const max = num(v.max_c);
  const avg = num(v.avg_c);
  if (min === null || max === null || avg === null) return null;
  const frame = Array.isArray(v.frame)
    ? (v.frame as unknown[]).map((x) => num(x) ?? 0)
    : undefined;
  return { min_c: min, max_c: max, avg_c: avg, ...(frame && frame.length === 768 ? { frame } : {}) };
}

function parseSensors(v: unknown): SensorSample {
  const o = isObj(v) ? v : {};
  return {
    load_cell_g: num(o.load_cell_g),
    load_cell_stable: bool(o.load_cell_stable),
    thermal: parseThermal(o.thermal),
    collector_installed: bool(o.collector_installed),
  };
}

/**
 * Parse one line or frame from the device.
 *
 * Returns null for anything malformed or from an unknown protocol version —
 * a garbled serial line must never become half a reading on screen.
 */
export function parseDeviceMessage(raw: string): DeviceMessage | null {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(v) || v.protocol !== PROTOCOL || typeof v.type !== "string") return null;
  const device_id = typeof v.device_id === "string" ? v.device_id : null;
  if (!device_id) return null;

  switch (v.type) {
    case "hello": {
      const s = isObj(v.sensors) ? v.sensors : {};
      const w = isObj(v.wifi) ? v.wifi : {};
      return {
        protocol: PROTOCOL,
        type: "hello",
        device_id,
        firmware: typeof v.firmware === "string" ? v.firmware : "unknown",
        uptime_ms: num(v.uptime_ms) ?? 0,
        has_rtc: false,
        sensors: {
          load_cell: bool(s.load_cell),
          thermal: bool(s.thermal),
          collector_switch: bool(s.collector_switch),
          acquire_button: bool(s.acquire_button),
          reset_button: bool(s.reset_button),
        },
        calibrated: bool(v.calibrated),
        wifi: {
          mode: w.mode === "ap" || w.mode === "sta" ? w.mode : "off",
          ip: typeof w.ip === "string" ? w.ip : null,
          rssi: num(w.rssi),
        },
      };
    }
    case "telemetry":
      return {
        protocol: PROTOCOL,
        type: "telemetry",
        device_id,
        seq: num(v.seq) ?? 0,
        uptime_ms: num(v.uptime_ms) ?? 0,
        status: STATUSES.includes(v.status as DeviceStatus)
          ? (v.status as DeviceStatus)
          : "READY",
        sensors: parseSensors(v.sensors),
      };
    case "acquisition":
      return {
        protocol: PROTOCOL,
        type: "acquisition",
        device_id,
        acquisition_id:
          typeof v.acquisition_id === "string" ? v.acquisition_id : `ACQ-${Date.now()}`,
        uptime_ms: num(v.uptime_ms) ?? 0,
        sensors: parseSensors(v.sensors),
        collector_ok: bool(v.collector_ok),
      };
    case "ack":
      return {
        protocol: PROTOCOL,
        type: "ack",
        device_id,
        action: ACK_ACTIONS.includes(v.action as AckMessage["action"])
          ? (v.action as AckMessage["action"])
          : "reset",
        ok: bool(v.ok),
        detail: typeof v.detail === "string" ? v.detail : undefined,
      };
    case "fault":
      return {
        protocol: PROTOCOL,
        type: "fault",
        device_id,
        code: typeof v.code === "string" ? v.code : "UNKNOWN",
        detail: typeof v.detail === "string" ? v.detail : "",
      };
    default:
      return null;
  }
}

const STATUSES: DeviceStatus[] = ["BOOTING", "READY", "ACQUIRING", "FAULT"];
const ACK_ACTIONS: AckMessage["action"][] = [
  "reset",
  "acquire",
  "tare",
  "calibrate",
  "fault_cleared",
];

/* ------------------------------------------------- evidence payload block */

/**
 * The block written into an evidence record's payload.
 *
 * `source` is the single most important field here: it says whether these
 * numbers came off a real board or out of the in-browser simulator, and it is
 * hashed and signed along with everything else, so a record can never quietly
 * change its mind about which it was.
 */
export interface HardwareObservation {
  source: "esp32" | "pramaan" | "demo";
  transport: TransportKind;
  device_id: string;
  firmware: string;
  acquisition_id: string;
  load_cell_g: number | null;
  load_cell_stable: boolean;
  thermal_min_c: number | null;
  thermal_max_c: number | null;
  thermal_avg_c: number | null;
  collector_installed: boolean | null;
  temperature_c?: number | null;
  temperature_source?: "potentiometer" | "thermal_camera" | null;
  weight_source?: "load_cell" | null;
  capture_trigger?: "device_button" | "app";
  device_sequence?: number | null;
  /** Restates the boundary inside the signed payload, not just in the UI. */
  note: string;
}

export const HARDWARE_NOTE =
  "Sampling instrumentation only — force, temperature field and collector state. Not a chemical identification and not a detection.";

/**
 * Device ids the development simulator uses. Over Wi-Fi a simulator is
 * indistinguishable from a board at the wire level — it is the same protocol —
 * so identity is what separates them, and anything answering to one of these
 * prefixes is recorded as simulated no matter which transport carried it.
 */
const SIMULATED_ID_PREFIXES = ["EC-SIM", "EC-DEMO"];

export function isSimulatedDeviceId(id: string): boolean {
  return SIMULATED_ID_PREFIXES.some((p) => id.toUpperCase().startsWith(p));
}

export function toObservation(
  msg: AcquisitionMessage,
  meta: { source: "esp32" | "demo"; transport: TransportKind; firmware: string },
): HardwareObservation {
  const source = isSimulatedDeviceId(msg.device_id) ? "demo" : meta.source;
  return {
    source,
    transport: meta.transport,
    device_id: msg.device_id,
    firmware: meta.firmware,
    acquisition_id: msg.acquisition_id,
    load_cell_g: msg.sensors.load_cell_g,
    load_cell_stable: msg.sensors.load_cell_stable,
    thermal_min_c: msg.sensors.thermal?.min_c ?? null,
    thermal_max_c: msg.sensors.thermal?.max_c ?? null,
    thermal_avg_c: msg.sensors.thermal?.avg_c ?? null,
    collector_installed: msg.sensors.collector_installed,
    temperature_c: msg.sensors.thermal?.avg_c ?? null,
    temperature_source: msg.sensors.thermal ? "thermal_camera" : null,
    weight_source: msg.sensors.load_cell_g === null ? null : "load_cell",
    capture_trigger: "device_button",
    note: HARDWARE_NOTE,
  };
}
