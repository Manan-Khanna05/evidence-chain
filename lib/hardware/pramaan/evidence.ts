/**
 * PRAMAAN → evidence payload.
 *
 * The only bridge between the serial layer and the evidence model. It copies
 * what PRAMAAN actually measured and records where each number came from.
 * Nothing is substituted for a missing input: an absent value stays null.
 *
 * PRAMAAN has no thermal camera, so the thermal fields stay null and the
 * temperature is labelled with its real source — a potentiometer standing in
 * for a temperature probe. That label is hashed and signed with the record.
 */

import type { HardwareObservation } from "@/lib/hardware/protocol";
import type { PramaanAcquisition } from "./store";

export const PRAMAAN_HARDWARE_NOTE =
  "PRAMAAN sampling instrumentation: load-cell weight and a potentiometer-simulated temperature input. No thermal imaging sensor is fitted. Not a chemical identification and not a detection.";

export function pramaanObservation(acq: PramaanAcquisition): HardwareObservation {
  const e = acq.event;
  const temperatureSource =
    e.temperature === null
      ? null
      : e.temperature_source === "thermal_sensor"
        ? "thermal_camera"
        : "potentiometer";

  return {
    source: "pramaan",
    transport: "usb",
    device_id: e.device_id,
    firmware: acq.firmware ?? "unknown",
    acquisition_id: `PRAMAAN-${e.seq}-${acq.receivedAt}`,
    load_cell_g: e.weight_g,
    // The device reports a settled reading at the moment ACQUIRE is pressed.
    load_cell_stable: e.weight_g !== null,
    // No thermal imaging sensor on this hardware.
    thermal_min_c: null,
    thermal_max_c: null,
    thermal_avg_c: null,
    // No collector microswitch on this hardware: unknown, not "absent".
    collector_installed: null,
    temperature_c: e.temperature,
    temperature_source: temperatureSource,
    weight_source: e.weight_g === null ? null : "load_cell",
    capture_trigger: acq.trigger,
    device_sequence: e.seq,
    note: PRAMAAN_HARDWARE_NOTE,
  };
}
