/**
 * Scripted mock readings — the "config file" of Implementation Plan Step 6.
 * Kept out of the app code so the adapter loads them rather than hard-coding.
 *
 * These are SIMULATED values from a SIMULATED trace sensor. They are not
 * measurements, and nothing in this repository claims otherwise.
 */

import type { ReferralTier } from "@/lib/domain/types";

export interface MockReading {
  raw_value: string;
  tier: ReferralTier;
}

export const MOCK_SENSOR_ID = "MOCK-TRACE-07";
export const MOCK_SENSOR_TYPE = "MOCK TRACE SENSOR";

export const MOCK_READINGS: MockReading[] = [
  { raw_value: "Elevated trace response", tier: "tier_2" },
  { raw_value: "Trace response above local baseline", tier: "tier_2" },
  { raw_value: "Strong trace response, repeated on re-sample", tier: "tier_3" },
  { raw_value: "Marginal response, within baseline drift", tier: "tier_1" },
  { raw_value: "No response above baseline", tier: "no_referral" },
];
