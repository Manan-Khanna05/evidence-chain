/**
 * Compatibility with the earlier `evidence-chain-v1` firmware.
 *
 * A board flashed with the older sketch speaks a different JSON dialect on the
 * same USB port. Rather than leaving the operator with a silent, open port,
 * those lines are translated into PRAMAAN messages so the readings still
 * appear — with their real sources preserved: that board has an actual thermal
 * sensor, so its temperature is labelled as such, not as a potentiometer.
 *
 * Nothing is invented here. Only fields the older firmware really sends are
 * carried across; anything it does not report stays null.
 */

import { parseDeviceMessage } from "@/lib/hardware/protocol";
import { PRAMAAN_PROTOCOL, type PramaanMessage } from "./types";

export function adaptLegacyLine(line: string): PramaanMessage | null {
  const msg = parseDeviceMessage(line);
  if (!msg) return null;

  switch (msg.type) {
    case "hello":
      return {
        type: "device_hello",
        protocol: PRAMAAN_PROTOCOL,
        device_id: msg.device_id,
        firmware: msg.firmware,
        capabilities: {
          // The older board has no potentiometer; its temperature is measured.
          potentiometer: false,
          load_cell: msg.sensors.load_cell,
          thermal_sensor: msg.sensors.thermal,
          oled: false,
          acquire_button: msg.sensors.acquire_button,
          reset_button: msg.sensors.reset_button,
        },
      };

    case "telemetry":
      return {
        type: "telemetry",
        device_id: msg.device_id,
        seq: msg.seq,
        temperature: msg.sensors.thermal?.avg_c ?? null,
        weight_g: msg.sensors.load_cell_g,
        temperature_source: msg.sensors.thermal ? "thermal_sensor" : null,
        weight_source: msg.sensors.load_cell_g === null ? null : "load_cell",
        connected: {
          potentiometer: false,
          load_cell: msg.sensors.load_cell_g !== null,
          thermal_sensor: msg.sensors.thermal !== null,
        },
        state: msg.status === "ACQUIRING" ? "ACQUIRED" : "READY",
      };

    case "acquisition":
      return {
        type: "acquire",
        device_id: msg.device_id,
        seq: 0,
        temperature: msg.sensors.thermal?.avg_c ?? null,
        weight_g: msg.sensors.load_cell_g,
        temperature_source: msg.sensors.thermal ? "thermal_sensor" : null,
        weight_source: msg.sensors.load_cell_g === null ? null : "load_cell",
        event: "ACQUIRED",
      };

    case "fault":
      return { type: "error", device_id: msg.device_id, code: msg.code, detail: msg.detail };

    default:
      return null;
  }
}
