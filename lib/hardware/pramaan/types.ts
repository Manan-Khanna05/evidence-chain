/**
 * PRAMAAN — Evidence Integrity Hardware Device.
 *
 * Types for the PRAMAAN-1 serial protocol. These describe what the device
 * actually has: a potentiometer standing in for a temperature input, a load
 * cell, an OLED, two buttons and three LEDs. There is no thermal camera on
 * this board, and nothing in these types invents one — `thermal_sensor` is a
 * capability flag that PRAMAAN currently reports as false.
 */

export const PRAMAAN_PROTOCOL = "PRAMAAN-1";
export const PRAMAAN_DEFAULT_DEVICE_ID = "PRAMAAN-ESP32-001";
export const PRAMAAN_BAUD_RATE = 115200;

/** Device state machine, mirrored from the firmware. */
export type PramaanDeviceState = "READY" | "ACQUIRED" | "RESETTING";

export interface PramaanCapabilities {
  potentiometer: boolean;
  load_cell: boolean;
  /** False on the current hardware: no thermal imaging sensor is fitted. */
  thermal_sensor: boolean;
  oled: boolean;
  acquire_button: boolean;
  reset_button: boolean;
}

/** Where a displayed value came from. Never guessed. */
export type PramaanTemperatureSource = "potentiometer" | "thermal_sensor";
export type PramaanWeightSource = "load_cell";

export interface PramaanDeviceHello {
  type: "device_hello";
  protocol: typeof PRAMAAN_PROTOCOL;
  device_id: string;
  firmware: string;
  capabilities: PramaanCapabilities;
}

export interface PramaanTelemetry {
  type: "telemetry";
  device_id: string;
  seq: number;
  /** Null when the potentiometer is not available — never fabricated. */
  temperature: number | null;
  /** Null when the load cell is not available — never fabricated. */
  weight_g: number | null;
  temperature_source: PramaanTemperatureSource | null;
  weight_source: PramaanWeightSource | null;
  connected: {
    potentiometer: boolean;
    load_cell: boolean;
    thermal_sensor: boolean;
  };
  state: PramaanDeviceState;
}

export interface PramaanAcquireEvent {
  type: "acquire";
  device_id: string;
  seq: number;
  temperature: number | null;
  weight_g: number | null;
  temperature_source: PramaanTemperatureSource | null;
  weight_source: PramaanWeightSource | null;
  event: "ACQUIRED";
}

export interface PramaanResetEvent {
  type: "reset";
  device_id: string;
  /** The sequence the device moved to after the reset. */
  seq: number;
  event: "RESET";
}

export interface PramaanErrorMessage {
  type: "error";
  device_id: string;
  code: string;
  detail: string;
}

export type PramaanMessage =
  | PramaanDeviceHello
  | PramaanTelemetry
  | PramaanAcquireEvent
  | PramaanResetEvent
  | PramaanErrorMessage;

/** Host → device. Only these four are ever sent. */
export type PramaanCommand =
  | { type: "acquire" }
  | { type: "reset" }
  | { type: "identify" }
  | { type: "tare" };

export type PramaanConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/** One entry in the developer diagnostics log. */
export interface PramaanLogEntry {
  at: number;
  level: "info" | "warn" | "error";
  message: string;
}

/**
 * Everything the UI knows about PRAMAAN. `connected` means valid telemetry
 * arrived recently — not merely that a port is open.
 */
export interface PramaanState {
  connectionState: PramaanConnectionState;
  connected: boolean;
  /** Present while the serial port is open, even before the first telemetry. */
  portOpen: boolean;
  deviceId: string | null;
  firmware: string | null;
  protocol: string | null;
  lastSeen: number | null;
  state: PramaanDeviceState | null;
  seq: number | null;
  temperature: number | null;
  weightGrams: number | null;
  sources: {
    temperature: PramaanTemperatureSource | "manual" | null;
    weight: PramaanWeightSource | "manual" | null;
  };
  capabilities: PramaanCapabilities | null;
  /** Operator-facing message for the last problem, or null. */
  error: string | null;
  /** Developer diagnostics; newest first, capped. */
  log: PramaanLogEntry[];
  telemetryCount: number;
  lastEvent: { kind: "acquire" | "reset"; seq: number; at: number } | null;
  /** Raw serial lines, newest first, for the diagnostics view. */
  rawLines: { at: number; text: string; accepted: boolean }[];
}
