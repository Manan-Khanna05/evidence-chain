/**
 * PRAMAAN-1 wire format: newline-delimited JSON, one complete message per line.
 *
 * Everything arriving from the serial port is untrusted input. It is parsed
 * here, field by field, and anything malformed is rejected with a reason
 * instead of becoming half a reading on screen. Nothing read from the port is
 * ever executed, and only the message types below are acted on.
 */

import {
  PRAMAAN_PROTOCOL,
  type PramaanAcquireEvent,
  type PramaanCapabilities,
  type PramaanCommand,
  type PramaanDeviceHello,
  type PramaanDeviceState,
  type PramaanErrorMessage,
  type PramaanMessage,
  type PramaanResetEvent,
  type PramaanTelemetry,
  type PramaanTemperatureSource,
  type PramaanWeightSource,
} from "./types";

/* ----------------------------------------------------------- primitives */

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** A finite number within a sane physical range, or null. */
function num(v: unknown, min: number, max: number): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < min || v > max) return null;
  return v;
}

function int(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.trunc(v);
}

const bool = (v: unknown) => v === true;

function str(v: unknown, max = 64): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > max) return null;
  // Device identifiers and firmware strings are shown in the UI and written
  // into signed payloads; keep them to plain, printable identifiers.
  return /^[\x20-\x7E]+$/.test(s) ? s : null;
}

/* ------------------------------------------------------------- ranges */

/** Plausible operating ranges. Outside these, the value is dropped. */
export const PRAMAAN_LIMITS = {
  temperature_c: { min: -40, max: 150 },
  weight_g: { min: -10_000, max: 10_000 },
} as const;

const STATES: PramaanDeviceState[] = ["READY", "ACQUIRED", "RESETTING"];

function parseState(v: unknown): PramaanDeviceState | null {
  return STATES.includes(v as PramaanDeviceState) ? (v as PramaanDeviceState) : null;
}

function parseTemperatureSource(v: unknown): PramaanTemperatureSource | null {
  return v === "potentiometer" || v === "thermal_sensor" ? v : null;
}

function parseWeightSource(v: unknown): PramaanWeightSource | null {
  return v === "load_cell" ? v : null;
}

function parseCapabilities(v: unknown): PramaanCapabilities {
  const o = isObj(v) ? v : {};
  return {
    potentiometer: bool(o.potentiometer),
    load_cell: bool(o.load_cell),
    thermal_sensor: bool(o.thermal_sensor),
    oled: bool(o.oled),
    acquire_button: bool(o.acquire_button),
    reset_button: bool(o.reset_button),
  };
}

/* ------------------------------------------------------------ decoding */

export type ParseResult =
  | { ok: true; message: PramaanMessage }
  | { ok: false; reason: string };

/**
 * Parse one line from PRAMAAN.
 *
 * Boot banners and stray text from the ESP32 are common on a serial port, so a
 * non-JSON line is a normal, quiet rejection rather than an error condition.
 */
export function parsePramaanLine(raw: string): ParseResult {
  const line = raw.trim();
  if (!line) return { ok: false, reason: "empty line" };
  if (!line.startsWith("{")) return { ok: false, reason: "not JSON" };

  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return { ok: false, reason: "malformed JSON" };
  }
  if (!isObj(v)) return { ok: false, reason: "not an object" };

  const type = typeof v.type === "string" ? v.type : null;
  if (!type) return { ok: false, reason: "missing type" };

  const device_id = str(v.device_id);
  if (!device_id) return { ok: false, reason: "missing or invalid device_id" };

  switch (type) {
    case "device_hello": {
      if (v.protocol !== PRAMAAN_PROTOCOL) {
        return { ok: false, reason: `unsupported protocol ${String(v.protocol)}` };
      }
      const hello: PramaanDeviceHello = {
        type: "device_hello",
        protocol: PRAMAAN_PROTOCOL,
        device_id,
        firmware: str(v.firmware, 32) ?? "unknown",
        capabilities: parseCapabilities(v.capabilities),
      };
      return { ok: true, message: hello };
    }

    case "telemetry": {
      const connected = isObj(v.connected) ? v.connected : {};
      const caps = {
        potentiometer: bool(connected.potentiometer),
        load_cell: bool(connected.load_cell),
        thermal_sensor: bool(connected.thermal_sensor),
      };
      const telemetry: PramaanTelemetry = {
        type: "telemetry",
        device_id,
        seq: int(v.seq) ?? 0,
        // A value is only kept when the device says that input is connected.
        temperature: caps.potentiometer || caps.thermal_sensor
          ? num(v.temperature, PRAMAAN_LIMITS.temperature_c.min, PRAMAAN_LIMITS.temperature_c.max)
          : null,
        weight_g: caps.load_cell
          ? num(v.weight_g, PRAMAAN_LIMITS.weight_g.min, PRAMAAN_LIMITS.weight_g.max)
          : null,
        temperature_source: parseTemperatureSource(v.temperature_source),
        weight_source: parseWeightSource(v.weight_source),
        connected: caps,
        state: parseState(v.state) ?? "READY",
      };
      return { ok: true, message: telemetry };
    }

    case "acquire": {
      if (v.event !== "ACQUIRED") return { ok: false, reason: "acquire without ACQUIRED event" };
      const acquire: PramaanAcquireEvent = {
        type: "acquire",
        device_id,
        seq: int(v.seq) ?? 0,
        temperature: num(
          v.temperature,
          PRAMAAN_LIMITS.temperature_c.min,
          PRAMAAN_LIMITS.temperature_c.max,
        ),
        weight_g: num(v.weight_g, PRAMAAN_LIMITS.weight_g.min, PRAMAAN_LIMITS.weight_g.max),
        temperature_source: parseTemperatureSource(v.temperature_source),
        weight_source: parseWeightSource(v.weight_source),
        event: "ACQUIRED",
      };
      return { ok: true, message: acquire };
    }

    case "reset": {
      const reset: PramaanResetEvent = {
        type: "reset",
        device_id,
        seq: int(v.seq) ?? 0,
        event: "RESET",
      };
      return { ok: true, message: reset };
    }

    case "error": {
      const err: PramaanErrorMessage = {
        type: "error",
        device_id,
        code: str(v.code, 40) ?? "UNKNOWN",
        detail: typeof v.detail === "string" ? v.detail.slice(0, 200) : "",
      };
      return { ok: true, message: err };
    }

    default:
      return { ok: false, reason: `unknown message type "${type}"` };
  }
}

/* ------------------------------------------------------------ encoding */

export function encodePramaanCommand(cmd: PramaanCommand): string {
  return `${JSON.stringify({ protocol: PRAMAAN_PROTOCOL, ...cmd })}\n`;
}

/* --------------------------------------------------------- friendly text */

/** Operator-facing wording for a serial problem. Never "Something went wrong". */
export function pramaanErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "");
  const text = raw.toLowerCase();
  if (text.includes("no port selected") || text.includes("cancel")) {
    return "No device was selected. Click Connect PRAMAAN and choose the PRAMAAN serial port.";
  }
  if (text.includes("denied") || text.includes("permission") || text.includes("security")) {
    return "The browser blocked access to the serial port. Allow the port, then try again.";
  }
  if (text.includes("already open") || text.includes("in use") || text.includes("busy")) {
    return "The PRAMAAN port is already in use. Close the Arduino Serial Monitor or other tabs, then try again.";
  }
  if (text.includes("device has been lost") || text.includes("disconnected") || text.includes("network")) {
    return "PRAMAAN disconnected. Check the USB cable and connect again.";
  }
  if (text.includes("break") || text.includes("parity") || text.includes("frame") || text.includes("overrun")) {
    return "Unable to read PRAMAAN telemetry — the serial link reported a transmission error.";
  }
  return "Unable to read PRAMAAN telemetry. Reconnect the USB cable and try again.";
}

/** Chromium desktop only; Web Serial does not exist elsewhere. */
export function serialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}
