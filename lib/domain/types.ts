/**
 * Record schema — Implementation Plan, Step 2.
 *
 * Three record families are captured (Phase D):
 *   1. s.43 trigger          — what caused the stop
 *   2. presumptive field test — the record a High Court effectively specified
 *   3. RPF -> GRP handoff     — the seam, carried as a transfer + a receipt
 */

export type RecordType =
  | "trigger"
  | "field_test"
  | "screening_flag"
  | "handoff_transfer"
  | "handoff_receipt";

/** What a screening node observed. Never a detection and never an identification. */
export type ScreeningCue =
  | "surface_trace_cue"
  | "thermal_observation_cue"
  | "visual_cue"
  | "operator_observation";

/** How much of the item or region could actually be reached. */
export type AccessClass = "AC0" | "AC1" | "AC2" | "AC3" | "AC4";

/** captured -> queued -> pushed -> anchored (Implementation Plan, Step 9). */
export type RecordStatus = "captured" | "queued" | "pushed" | "anchored";

export type ReferralTier = "no_referral" | "tier_1" | "tier_2" | "tier_3";

export type FieldTestResult = "presumptive_positive" | "presumptive_negative" | "inconclusive";

export type SealState = "intact" | "resealed_documented" | "broken";

export type OfficerForce = "RPF" | "GRP" | "VERIFIER";

export type Role = "rpf" | "grp" | "verifier";

export interface Officer {
  officer_id: string;
  name: string;
  force: OfficerForce;
  rank: string;
  /** NDPS empowerment recorded per the report §7E (Tofan Singh design note). */
  ndps_empowerment: string[];
  role: Role;
}

export interface Device {
  device_id: string;
  make: string;
  model: string;
  device_type: string;
  serial: string;
  /** Schedule Part A asks for IMEI/UIN/UID/MAC/Cloud ID as applicable. */
  hardware_identifier: string;
  hardware_identifier_kind: string;
  /**
   * What this build ACTUALLY uses. A web prototype has no secure element, so
   * this is always "Software". Never claim StrongBox where it is TEE — and
   * never claim TEE where it is a software key.
   */
  key_security_level: "Software";
  /** What the production handheld is specified to provide (Impl. Plan, Step 7). */
  target_key_security_level: "TEE" | "StrongBox";
  verified_boot_state: "Not attested in this build";
  target_verified_boot_state: string;
  attestation_status: "simulated";
  attestation_note: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  assigned_officer_id: string;
  force: OfficerForce;
}

export interface SensorReading {
  raw_value: string;
  tier: ReferralTier;
  sensor_type: string;
  sensor_id: string;
  taken_at: string;
  /** Always true in this build. There is no IMS detector and none is faked. */
  simulated: true;
  adapter: string;
}

export interface TriggerPayload {
  place: string;
  place_kind: string;
  train_or_location_ref: string;
  sensor: SensorReading;
  officer_action: "searched" | "not_searched";
  search_outcome: "material_recovered" | "nothing_recovered" | "not_applicable";
  grounds_note: string;
  /** s.43 NDPS imposes no writing duty; this record is voluntary. */
  statutory_basis: "NDPS s.43 — public place; no statutory writing duty";
}

/**
 * Instrumentation of the sampling act, captured from the ESP32-S3 gateway.
 *
 * These numbers describe HOW the swab was taken — the force applied, the
 * ambient temperature field, whether the collector was fitted. They are not a
 * detection and carry no referral tier. `source` distinguishes a real board
 * from the demo device and is hashed and signed with the rest of the payload,
 * so a record cannot later be mistaken for one it is not.
 */
export interface HardwareObservationPayload {
  /** Which device produced these numbers. "pramaan" is the USB hardware. */
  source: "esp32" | "pramaan" | "demo";
  transport: "wifi" | "usb" | "demo" | "none";
  device_id: string;
  firmware: string;
  acquisition_id: string;
  load_cell_g: number | null;
  load_cell_stable: boolean;
  thermal_min_c: number | null;
  thermal_max_c: number | null;
  thermal_avg_c: number | null;
  /** Null when no collector switch exists on the device — not "absent". */
  collector_installed: boolean | null;
  /**
   * Temperature as reported, with the input that produced it. On PRAMAAN that
   * input is a potentiometer standing in for a temperature probe, and the
   * payload says so rather than implying a thermal camera.
   */
  temperature_c?: number | null;
  temperature_source?: "potentiometer" | "thermal_camera" | null;
  weight_source?: "load_cell" | null;
  /** Which button started the capture. */
  capture_trigger?: "device_button" | "app";
  /** The device's own sequence counter at capture. */
  device_sequence?: number | null;
  note: string;
}

export interface FieldTestPayload {
  kit_type: string;
  manufacturer: string;
  lot_number: string;
  expiry_date: string;
  lot_expired: boolean;
  observed_colour: string;
  reference_table: string;
  ambient_temperature_c: number | null;
  operator_id: string;
  result_status: FieldTestResult;
  /** Printed on the face of every rendering. */
  epistemic_status: "Presumptive — not a chemical identification";
  linked_trigger_record_id: string | null;
  /** Present only when the record came from an instrumented acquisition. */
  hardware?: HardwareObservationPayload;
}

export interface HandoffTransferPayload {
  transferor_officer_id: string;
  transferor_force: "RPF";
  receiving_agency: "GRP";
  receiving_post: string;
  sample_count: number;
  seal_state: SealState;
  seal_marks: string;
  article_description: string;
  gross_weight_g: number;
  linked_record_ids: string[];
  handoff_id: string;
}

export interface HandoffReceiptPayload {
  handoff_id: string;
  transfer_record_id: string;
  receiving_officer_id: string;
  receiving_force: "GRP";
  sample_count: number;
  seal_state: SealState;
  seal_marks: string;
  remarks: string;
}

/**
 * A screening flag raised at a node (today: the TTE demo console).
 *
 * It records that something warranted a closer look, who raised it, and how
 * much access was available. It carries no result, no probability and no
 * identification — an RPF officer decides what to do next.
 */
export interface ScreeningFlagPayload {
  screening_node_id: string;
  operator_id: string;
  train_id: string;
  coach: string;
  seat: string;
  cue_type: ScreeningCue;
  cue_note: string;
  access_class: AccessClass;
  /** Always true while no TTE hardware exists. Hashed into the record. */
  demo: true;
  demo_note: string;
  referred_to: "RPF";
}

export type RecordPayload =
  | TriggerPayload
  | FieldTestPayload
  | ScreeningFlagPayload
  | HandoffTransferPayload
  | HandoffReceiptPayload;

export interface EvidenceRecord {
  record_id: string;
  type: RecordType;
  case_ref: string;
  device_id: string;
  officer_id: string;
  /** Device clock at capture. UNTRUSTED — never presented as proven time. */
  claimed_time: string;
  /** Monotonic counter, per device. */
  seq: number;
  /** record_hash of the previous record on this device, or null at genesis. */
  prev_hash: string | null;
  /**
   * Position in this case's own chain: 1 for the first record of the case.
   * Independent of every other case and of the device counter.
   * Null only on records written before per-case chaining existed.
   */
  case_seq?: number | null;
  /** record_hash of the previous record IN THE SAME CASE, null at case genesis. */
  case_prev_hash?: string | null;
  payload: RecordPayload;
  /** SHA-256 over the canonicalised payload. */
  payload_hash: string;
  /** Over payload_hash + prev_hash + seq. */
  signature: string;
  status: RecordStatus;
  /** Server ingest time. Trusted only as "not before"; the anchor bounds it. */
  received_at: string | null;
  anchor_id: string | null;
}

export type TsaStatus = "verified" | "unavailable";

export interface TsaToken {
  tsa_id: string;
  tsa_name: string;
  trust_domain: string;
  status: TsaStatus;
  anchor_time: string | null;
  token_signature: string | null;
  publicKeyJwk: JsonWebKey | null;
  simulated: true;
}

export interface Anchor {
  anchor_id: string;
  tree_head: string;
  tree_size: number;
  anchor_time: string;
  /** Previous anchor time; with anchor_time this is the bounded interval. */
  interval_start: string | null;
  interval_end: string;
  record_ids: string[];
  tsa: [TsaToken, TsaToken];
}

export type CaseStage =
  | "triggered"
  | "field_test_recorded"
  | "queued_offline"
  | "pushed"
  | "anchored"
  | "handoff_pending"
  | "handoff_verified"
  | "certificate_ready";

export interface CaseRecord {
  case_ref: string;
  title: string;
  place: string;
  opened_at: string;
  opened_by_officer_id: string;
  device_id: string;
  notes: string;
}

export type HandoffStatus =
  | "not_started"
  | "transfer_created"
  | "awaiting_receipt"
  | "receipt_signed"
  | "verified"
  | "mismatch";

export interface Handoff {
  handoff_id: string;
  case_ref: string;
  transfer_record_id: string | null;
  receipt_record_id: string | null;
  transfer_officer_id: string | null;
  receiving_officer_id: string | null;
  sample_count: number | null;
  seal_state: SealState | null;
  status: HandoffStatus;
  created_at: string | null;
  received_at: string | null;
}

export interface Certificate {
  certificate_id: string;
  case_ref: string;
  /** SHA-256 over the canonical certificate subject (records + tree head). */
  hash: string;
  algorithm: "SHA-256";
  generated_at: string;
  record_ids: string[];
  tree_head: string;
  anchor_id: string | null;
  part_a_signatory_officer_id: string;
  /** Part B is never auto-signed. The system is not the expert. */
  part_b_expert_name: null;
  verification_status: "verified" | "failed" | "unknown";
}

export interface Connectivity {
  online: boolean;
  changed_at: string;
  /** Set by the demo controls so the narrative reads honestly. */
  label: string;
}

export interface TamperEntry {
  record_id: string;
  /** The untouched record, kept so "Restore" is a real restoration. */
  original: EvidenceRecord;
  applied_at: string;
  /** "seed" entries survive Restore; "demo" entries are what Restore undoes. */
  source: "seed" | "demo";
  note: string;
}

export interface StoreShape {
  version: number;
  seeded_at: string;
  officers: Officer[];
  devices: Device[];
  cases: CaseRecord[];
  records: EvidenceRecord[];
  anchors: Anchor[];
  handoffs: Handoff[];
  certificates: Certificate[];
  connectivity: Connectivity;
  /** Records currently altered in the store. Empty when nothing is tampered. */
  tamper: TamperEntry[];
  sensor_cursor: number;
  demo_device_role: Role;
  /**
   * SIMULATED timestamp authorities. Real RFC 3161 authorities are external
   * services; nothing here contacts one. These sign with local keys and every
   * surface says "SIMULATED TSA".
   */
  tsa_authorities: TsaAuthority[];
}

export interface TsaAuthority {
  tsa_id: string;
  tsa_name: string;
  trust_domain: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  /** Flipped by the "Simulate TSA outage" demo control. */
  available: boolean;
  simulated: true;
}

/** Signing keys never cross the wire. This is what the browser receives. */
export type ClientDevice = Omit<Device, "privateKeyJwk">;

export type ClientTsaAuthority = Omit<TsaAuthority, "privateKeyJwk">;

export interface ClientStore
  extends Omit<StoreShape, "devices" | "tamper" | "tsa_authorities"> {
  devices: ClientDevice[];
  tamper: Omit<TamperEntry, "original">[];
  tsa_authorities: ClientTsaAuthority[];
}
