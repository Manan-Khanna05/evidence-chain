import type { SensorAdapter } from "./adapter";
import type { SensorReading } from "@/lib/domain/types";
import { MOCK_READINGS, MOCK_SENSOR_ID, MOCK_SENSOR_TYPE } from "./mock_readings";

/**
 * MockSensorAdapter — returns scripted readings from the readings file.
 * Deterministic: the same cursor always yields the same reading, so a demo
 * runs identically every time.
 */
export class MockSensorAdapter implements SensorAdapter {
  readonly id = "mock-trace-adapter";
  readonly label = "Mock Sensor Adapter";
  readonly simulated = true;

  read(cursor: number): SensorReading {
    const reading = MOCK_READINGS[cursor % MOCK_READINGS.length];
    return {
      raw_value: reading.raw_value,
      tier: reading.tier,
      sensor_type: MOCK_SENSOR_TYPE,
      sensor_id: MOCK_SENSOR_ID,
      taken_at: new Date().toISOString(),
      simulated: true,
      adapter: "MockSensorAdapter",
    };
  }
}

export const sensorAdapter: SensorAdapter = new MockSensorAdapter();
