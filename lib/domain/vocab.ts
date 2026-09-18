/**
 * Controlled vocabularies.
 *
 * Evidence report §1E: the Bombay High Court in *Sagar Parshuram Joshi*
 * (15 Jan 2021) found that "all and every aspect of field testing is left to
 * the experience, knowledge and perception of Law Enforcement Officer", which
 * it called arbitrary. Read as a requirements document that judgment specifies
 * reagent identity and manufacturer, lot number, expiry, storage condition,
 * operator identity, ambient conditions, observed colour FROM A FIXED
 * VOCABULARY, the reference table matched against, and a machine-readable
 * presumptive-only flag.
 *
 * Every value here is deliberately synthetic. No Indian standard prescribes a
 * colour-to-substance table (audited absence, report §1C), so this build ships
 * demo reference tables and says so.
 */

import type { FieldTestResult, ReferralTier, SealState } from "./types";

export const KIT_TYPES = [
  "Demo Reagent Kit — Type A",
  "Demo Reagent Kit — Type B",
  "Demo Reagent Kit — Type C",
] as const;

export const MANUFACTURERS = [
  "Demo Manufacturer One",
  "Demo Manufacturer Two",
] as const;

/** Fixed colour list — never free text (Implementation Plan, Step 15). */
export const OBSERVED_COLOURS = [
  "No colour change",
  "Pale yellow",
  "Yellow",
  "Orange",
  "Red",
  "Pink",
  "Purple",
  "Blue",
  "Blue-green",
  "Green",
  "Brown",
  "Black",
  "Indeterminate / mixed",
] as const;

export const REFERENCE_TABLES = [
  "Demo Reference Table A (kit insert)",
  "Demo Reference Table B (kit insert)",
  "No reference table available",
] as const;

export const RESULT_STATUSES: { value: FieldTestResult; label: string }[] = [
  { value: "presumptive_positive", label: "Presumptive positive" },
  { value: "presumptive_negative", label: "Presumptive negative" },
  { value: "inconclusive", label: "Inconclusive" },
];

export const PRESUMPTIVE_NOTICE = "Presumptive — not a chemical identification";

export const SEAL_STATES: { value: SealState; label: string }[] = [
  { value: "intact", label: "Intact" },
  { value: "resealed_documented", label: "Resealed — documented" },
  { value: "broken", label: "Broken" },
];

/**
 * Non-probabilistic referral tiers.
 *
 * Report §3: "The defensible design is to emit a non-probabilistic referral
 * tier, never a probability. The sentence never to say is *73% anomaly at
 * Coach S4*. The sentence to say is *tier-2 referral, confirmatory step
 * pending*."
 */
export const REFERRAL_TIERS: Record<ReferralTier, { label: string; note: string; weight: number }> = {
  no_referral: { label: "No referral", note: "No confirmatory step indicated", weight: 0 },
  tier_1: { label: "Tier 1 referral", note: "Routine — confirmatory step optional", weight: 1 },
  tier_2: { label: "Tier 2 referral", note: "Confirmatory step pending", weight: 2 },
  tier_3: { label: "Tier 3 referral", note: "Priority — confirmatory step pending", weight: 3 },
};

export const PLACE_KINDS = [
  "Platform",
  "Concourse",
  "Coach / carriage",
  "Parcel office",
  "Foot over-bridge",
  "Circulating area",
] as const;

export const OFFICER_ACTIONS = [
  { value: "searched", label: "Searched" },
  { value: "not_searched", label: "Not searched" },
] as const;

export const SEARCH_OUTCOMES = [
  { value: "material_recovered", label: "Material recovered" },
  { value: "nothing_recovered", label: "Nothing recovered" },
  { value: "not_applicable", label: "Not applicable (no search)" },
] as const;

export const RECORD_TYPE_LABEL: Record<string, string> = {
  trigger: "s.43 Trigger",
  field_test: "Field Test",
  handoff_transfer: "Handoff — Transfer",
  handoff_receipt: "Handoff — Receipt",
};

export const RECORD_TYPE_SHORT: Record<string, string> = {
  trigger: "Trigger",
  field_test: "Field test",
  handoff_transfer: "Transfer",
  handoff_receipt: "Receipt",
};
