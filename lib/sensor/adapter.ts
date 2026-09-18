/**
 * Sensor adapter — Implementation Plan, Step 6.
 *
 *   "We do not have an IMS detector and will not fabricate one. Define the
 *    interface now so a real device can be dropped in later, and ship a mock
 *    behind it."
 *
 * Acceptance: swapping implementations requires changing one config line;
 * mock readings are loaded from a file, not hard-coded in the app; every
 * reading is labelled with sensor_type so a record can never imply a
 * capability we lack.
 */

import type { SensorReading } from "@/lib/domain/types";

export interface SensorAdapter {
  readonly id: string;
  readonly label: string;
  readonly simulated: boolean;
  read(cursor: number): SensorReading;
}

/** The one config line. Change this to swap in SerialSensorAdapter later. */
export const ACTIVE_ADAPTER = "mock" as const;
