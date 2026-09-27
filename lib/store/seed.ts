/**
 * Seeded demo data.
 *
 * Everything here is SYNTHETIC. No real officer, device, station, seizure or
 * person is represented. The records are nonetheless genuinely constructed:
 * every payload_hash is a real SHA-256 over the canonical payload, every
 * signature is a real ECDSA P-256 signature, every chain link is real, and the
 * Merkle roots and anchor tokens are computed rather than typed in.
 *
 * Six cases are seeded so the whole application is demonstrable on first load:
 *
 *   CASE-2026-00421  flagship — anchored, two-party handoff verified,
 *                    Section 63 certificate generated. Interval 14:02–14:19.
 *   CASE-2026-00422  transfer created, awaiting the GRP receipt.
 *   CASE-2026-00423  a row was altered in storage after ingest — the verifier
 *                    catches it. Kept OUTSIDE every anchored prefix so the
 *                    breakage is scoped to this case.
 *   CASE-2026-00424  trigger only, nothing recovered — negatives are recorded.
 *   CASE-2026-00425  captured offline, still queued on the device.
 *   CASE-2026-00426  anchored and handed off, certificate not yet generated.
 */

import { hashCanonical } from "@/lib/crypto/hash";
import { generateKeyPair, signMessage, tsaSigningInput } from "@/lib/crypto/keys";
import { leafHash, merkleRoot } from "@/lib/crypto/merkle";
import { buildSignedRecord, recordHash } from "@/lib/domain/records";
import { buildCertificate } from "@/lib/domain/certificate";
import type {
  Anchor,
  CaseRecord,
  Device,
  EvidenceRecord,
  FieldTestPayload,
  Handoff,
  HandoffReceiptPayload,
  HandoffTransferPayload,
  Officer,
  RecordType,
  StoreShape,
  TriggerPayload,
  TsaAuthority,
  TsaToken,
} from "@/lib/domain/types";
import { MOCK_SENSOR_ID, MOCK_SENSOR_TYPE } from "@/lib/sensor/mock_readings";

/**
 * Seed times, written as clock times in a notional shift, then placed so the
 * whole shift ends half an hour before the store is seeded.
 *
 * They must never be in the future: a capture made "before" a seeded record
 * would otherwise read as older than history that has already been anchored.
 * The relative spacing between seeded events is preserved exactly.
 */
const SEED_SHIFT_END_MIN = 15 * 60 + 15; // 15:15, just after the last seeded event
const SEED_LEAD_MIN = 30;

function at(h: number, m: number): string {
  const minutesBeforeEnd = SEED_SHIFT_END_MIN - (h * 60 + m);
  return new Date(Date.now() - (minutesBeforeEnd + SEED_LEAD_MIN) * 60_000).toISOString();
}

function plusMinutes(iso: string, mins: number): string {
  return new Date(new Date(iso).getTime() + mins * 60_000).toISOString();
}

const recId = (n: number) => `REC-2026-${String(n).padStart(5, "0")}`;

function trigger(
  place: string,
  placeKind: string,
  locRef: string,
  tier: TriggerPayload["sensor"]["tier"],
  raw: string,
  takenAt: string,
  action: TriggerPayload["officer_action"],
  outcome: TriggerPayload["search_outcome"],
  note: string,
): TriggerPayload {
  return {
    place,
    place_kind: placeKind,
    train_or_location_ref: locRef,
    sensor: {
      raw_value: raw,
      tier,
      sensor_type: MOCK_SENSOR_TYPE,
      sensor_id: MOCK_SENSOR_ID,
      taken_at: takenAt,
      simulated: true,
      adapter: "MockSensorAdapter",
    },
    officer_action: action,
    search_outcome: outcome,
    grounds_note: note,
    statutory_basis: "NDPS s.43 — public place; no statutory writing duty",
  };
}

function fieldTest(
  lot: string,
  expiry: string,
  colour: string,
  result: FieldTestPayload["result_status"],
  operator: string,
  linkedTrigger: string,
  ambient: number | null,
  expired = false,
  kit = "Demo Reagent Kit — Type A",
  manufacturer = "Demo Manufacturer One",
  table = "Demo Reference Table A (kit insert)",
): FieldTestPayload {
  return {
    kit_type: kit,
    manufacturer,
    lot_number: lot,
    expiry_date: expiry,
    lot_expired: expired,
    observed_colour: colour,
    reference_table: table,
    ambient_temperature_c: ambient,
    operator_id: operator,
    result_status: result,
    epistemic_status: "Presumptive — not a chemical identification",
    linked_trigger_record_id: linkedTrigger,
  };
}

interface Plan {
  case_ref: string;
  type: RecordType;
  device: string;
  officer: string;
  claimed: string;
  payload: TriggerPayload | FieldTestPayload | HandoffTransferPayload | HandoffReceiptPayload;
  /** "queued" stays on the device; "pushed"/"anchored" reach the server. */
  disposition: "queued" | "pushed" | "anchored";
}

export async function buildSeed(): Promise<StoreShape> {
  const seeded_at = new Date().toISOString();

  // --- officers ----------------------------------------------------------
  const officers: Officer[] = [
    {
      officer_id: "RPF-104",
      name: "ASI A. Nair",
      force: "RPF",
      rank: "Assistant Sub-Inspector",
      ndps_empowerment: ["NDPS s.42", "NDPS s.67"],
      role: "rpf",
    },
    {
      officer_id: "RPF-231",
      name: "SI M. Rao",
      force: "RPF",
      rank: "Sub-Inspector",
      ndps_empowerment: ["NDPS s.42", "NDPS s.67"],
      role: "rpf",
    },
    {
      officer_id: "GRP-076",
      name: "SI K. Bose",
      force: "GRP",
      rank: "Sub-Inspector",
      ndps_empowerment: ["NDPS s.53", "BNSS investigation"],
      role: "grp",
    },
    {
      officer_id: "GRP-118",
      name: "Insp. S. Iyer",
      force: "GRP",
      rank: "Inspector",
      ndps_empowerment: ["NDPS s.53", "BNSS investigation"],
      role: "grp",
    },
    {
      officer_id: "VER-001",
      name: "Independent verifier",
      force: "VERIFIER",
      rank: "Read-only",
      ndps_empowerment: [],
      role: "verifier",
    },
  ];

  // --- devices -----------------------------------------------------------
  const deviceSpecs: Omit<Device, "publicKeyJwk" | "privateKeyJwk">[] = [
    {
      device_id: "EC-RPF-042",
      make: "Demo Devices Ltd",
      model: "EC-H1 Handheld",
      device_type: "Handheld evidence terminal",
      serial: "DEMO-SN-042-8817",
      hardware_identifier: "35-981070-402117-3",
      hardware_identifier_kind: "IMEI (synthetic)",
      key_security_level: "Software",
      target_key_security_level: "TEE",
      verified_boot_state: "Not attested in this build",
      target_verified_boot_state: "Verified",
      attestation_status: "simulated",
      attestation_note:
        "Android key attestation is not available to a web prototype. The production build requests a Keystore key with setAttestationChallenge and reads the security level and Verified Boot state from the certificate chain.",
      assigned_officer_id: "RPF-104",
      force: "RPF",
    },
    {
      device_id: "EC-RPF-017",
      make: "Demo Devices Ltd",
      model: "EC-H1 Handheld",
      device_type: "Handheld evidence terminal",
      serial: "DEMO-SN-017-4402",
      hardware_identifier: "35-981070-401774-9",
      hardware_identifier_kind: "IMEI (synthetic)",
      key_security_level: "Software",
      target_key_security_level: "TEE",
      verified_boot_state: "Not attested in this build",
      target_verified_boot_state: "Verified",
      attestation_status: "simulated",
      attestation_note:
        "Android key attestation is not available to a web prototype. Security level would be read from the attestation certificate, not asserted by the app.",
      assigned_officer_id: "RPF-231",
      force: "RPF",
    },
    {
      device_id: "EC-GRP-008",
      make: "Demo Devices Ltd",
      model: "EC-H1 Handheld",
      device_type: "Handheld evidence terminal",
      serial: "DEMO-SN-008-2291",
      hardware_identifier: "35-981070-400829-1",
      hardware_identifier_kind: "IMEI (synthetic)",
      key_security_level: "Software",
      target_key_security_level: "StrongBox",
      verified_boot_state: "Not attested in this build",
      target_verified_boot_state: "Verified",
      attestation_status: "simulated",
      attestation_note:
        "StrongBox is the production target for this unit only because the candidate handset exposes a discrete secure element. Whether it does is a week-zero spike, not an assumption.",
      assigned_officer_id: "GRP-076",
      force: "GRP",
    },
    {
      device_id: "EC-GRP-021",
      make: "Demo Devices Ltd",
      model: "EC-H1 Handheld",
      device_type: "Handheld evidence terminal",
      serial: "DEMO-SN-021-7736",
      hardware_identifier: "35-981070-402173-6",
      hardware_identifier_kind: "IMEI (synthetic)",
      key_security_level: "Software",
      target_key_security_level: "TEE",
      verified_boot_state: "Not attested in this build",
      target_verified_boot_state: "Verified",
      attestation_status: "simulated",
      attestation_note:
        "Android key attestation is not available to a web prototype.",
      assigned_officer_id: "GRP-118",
      force: "GRP",
    },
  ];

  const devices: Device[] = [];
  for (const spec of deviceSpecs) {
    const keys = await generateKeyPair();
    devices.push({ ...spec, publicKeyJwk: keys.publicKeyJwk, privateKeyJwk: keys.privateKeyJwk });
  }
  const deviceById = new Map(devices.map((d) => [d.device_id, d]));

  // --- simulated timestamp authorities ------------------------------------
  const tsaSpecs = [
    { tsa_id: "TSA-01", tsa_name: "Simulated TSA 01", trust_domain: "Trust domain A — national time service (simulated)" },
    { tsa_id: "TSA-02", tsa_name: "Simulated TSA 02", trust_domain: "Trust domain B — independent authority (simulated)" },
  ];
  const tsa_authorities: TsaAuthority[] = [];
  for (const spec of tsaSpecs) {
    const keys = await generateKeyPair();
    tsa_authorities.push({
      ...spec,
      publicKeyJwk: keys.publicKeyJwk,
      privateKeyJwk: keys.privateKeyJwk,
      available: true,
      simulated: true,
    });
  }

  // --- cases --------------------------------------------------------------
  const cases: CaseRecord[] = [
    {
      case_ref: "CASE-2026-00421",
      title: "Presumptive field-test event — Platform 3",
      place: "Platform 3, Demo Junction (DMJ)",
      opened_at: at(14, 4),
      opened_by_officer_id: "RPF-104",
      device_id: "EC-RPF-042",
      notes: "Full chain: trigger, presumptive field test, RPF → GRP handoff, dual-anchored.",
    },
    {
      case_ref: "CASE-2026-00422",
      title: "Presumptive field-test event — Coach S4",
      place: "Coach S4, Demo Express 10000",
      opened_at: at(14, 24),
      opened_by_officer_id: "RPF-104",
      device_id: "EC-RPF-042",
      notes: "Transfer signed by RPF; GRP receipt outstanding.",
    },
    {
      case_ref: "CASE-2026-00423",
      title: "Presumptive field-test event — Parcel office",
      place: "Parcel office, Demo Junction (DMJ)",
      opened_at: at(14, 46),
      opened_by_officer_id: "RPF-104",
      device_id: "EC-RPF-042",
      notes: "Pushed to the server, awaiting the next anchor. One row was altered in storage.",
    },
    {
      case_ref: "CASE-2026-00424",
      title: "Trigger only — nothing recovered",
      place: "Platform 1, Demo Junction (DMJ)",
      opened_at: at(13, 26),
      opened_by_officer_id: "RPF-231",
      device_id: "EC-RPF-017",
      notes: "Negative outcome recorded. A log of only the hits cannot tell anyone whether the programme works.",
    },
    {
      case_ref: "CASE-2026-00425",
      title: "Captured offline — queued on device",
      place: "Foot over-bridge, Demo Junction (DMJ)",
      opened_at: at(15, 4),
      opened_by_officer_id: "RPF-104",
      device_id: "EC-RPF-042",
      notes: "Signed and chained on the handheld; not yet pushed. Time not yet bounded.",
    },
    {
      case_ref: "CASE-2026-00426",
      title: "Presumptive field-test event — Concourse",
      place: "Concourse, Demo Junction (DMJ)",
      opened_at: at(13, 33),
      opened_by_officer_id: "RPF-231",
      device_id: "EC-RPF-017",
      notes: "Anchored and handed off. Certificate not yet generated.",
    },
  ];

  // --- record plan, in claimed-time order ---------------------------------
  const H1 = "HO-2026-0421";
  const H2 = "HO-2026-0422";
  const H3 = "HO-2026-0423";
  const H4 = "HO-2026-0426";

  const plan: Plan[] = [
    // CASE-00424 — trigger only, nothing recovered
    {
      case_ref: "CASE-2026-00424",
      type: "trigger",
      device: "EC-RPF-017",
      officer: "RPF-231",
      claimed: at(13, 26),
      disposition: "anchored",
      payload: trigger(
        "Platform 1, Demo Junction (DMJ)",
        "Platform",
        "PF-01",
        "tier_1",
        "Marginal response, within baseline drift",
        at(13, 25),
        "searched",
        "nothing_recovered",
        "Referral tier reviewed; person searched in a public place under s.43. Nothing recovered.",
      ),
    },
    // CASE-00426 — complete, anchored, handed off
    {
      case_ref: "CASE-2026-00426",
      type: "trigger",
      device: "EC-RPF-017",
      officer: "RPF-231",
      claimed: at(13, 33),
      disposition: "anchored",
      payload: trigger(
        "Concourse, Demo Junction (DMJ)",
        "Concourse",
        "CONC-A",
        "tier_2",
        "Trace response above local baseline",
        at(13, 32),
        "searched",
        "material_recovered",
        "Tier 2 referral, confirmatory step pending. Search conducted in a public place.",
      ),
    },
    {
      case_ref: "CASE-2026-00426",
      type: "field_test",
      device: "EC-RPF-017",
      officer: "RPF-231",
      claimed: at(13, 38),
      disposition: "anchored",
      payload: fieldTest("LOT-26B47", "2027-02-28", "Purple", "presumptive_positive", "RPF-231", recId(2), 31),
    },
    {
      case_ref: "CASE-2026-00426",
      type: "handoff_transfer",
      device: "EC-RPF-017",
      officer: "RPF-231",
      claimed: at(13, 44),
      disposition: "anchored",
      payload: {
        transferor_officer_id: "RPF-231",
        transferor_force: "RPF",
        receiving_agency: "GRP",
        receiving_post: "GRP Post, Demo Junction",
        sample_count: 2,
        seal_state: "intact",
        seal_marks: "SEAL-DMJ-26-0114 / SEAL-DMJ-26-0115",
        article_description: "Two sealed packets, synthetic demo article",
        gross_weight_g: 410,
        linked_record_ids: [recId(2), recId(3)],
        handoff_id: H4,
      },
    },
    {
      case_ref: "CASE-2026-00426",
      type: "handoff_receipt",
      device: "EC-GRP-021",
      officer: "GRP-118",
      claimed: at(13, 47),
      disposition: "anchored",
      payload: {
        handoff_id: H4,
        transfer_record_id: recId(4),
        receiving_officer_id: "GRP-118",
        receiving_force: "GRP",
        sample_count: 2,
        seal_state: "intact",
        seal_marks: "SEAL-DMJ-26-0114 / SEAL-DMJ-26-0115",
        remarks: "Received in hand. Seals compared against the transfer record and found to match.",
      },
    },
    // CASE-00421 — flagship, interval 14:02–14:19
    {
      case_ref: "CASE-2026-00421",
      type: "trigger",
      device: "EC-RPF-042",
      officer: "RPF-104",
      claimed: at(14, 4),
      disposition: "anchored",
      payload: trigger(
        "Platform 3, Demo Junction (DMJ)",
        "Platform",
        "PF-03",
        "tier_2",
        "Elevated trace response",
        at(14, 3),
        "searched",
        "material_recovered",
        "Tier 2 referral, confirmatory step pending. Grounds of belief formed before the search.",
      ),
    },
    {
      case_ref: "CASE-2026-00421",
      type: "field_test",
      device: "EC-RPF-042",
      officer: "RPF-104",
      claimed: at(14, 9),
      disposition: "anchored",
      payload: fieldTest("LOT-26A91", "2027-04-30", "Blue", "presumptive_positive", "RPF-104", recId(6), 28),
    },
    {
      case_ref: "CASE-2026-00421",
      type: "handoff_transfer",
      device: "EC-RPF-042",
      officer: "RPF-104",
      claimed: at(14, 14),
      disposition: "anchored",
      payload: {
        transferor_officer_id: "RPF-104",
        transferor_force: "RPF",
        receiving_agency: "GRP",
        receiving_post: "GRP Post, Demo Junction",
        sample_count: 3,
        seal_state: "intact",
        seal_marks: "SEAL-DMJ-26-0207 / 0208 / 0209",
        article_description: "Three sealed packets, synthetic demo article",
        gross_weight_g: 985,
        linked_record_ids: [recId(6), recId(7)],
        handoff_id: H1,
      },
    },
    {
      case_ref: "CASE-2026-00421",
      type: "handoff_receipt",
      device: "EC-GRP-008",
      officer: "GRP-076",
      claimed: at(14, 16),
      disposition: "anchored",
      payload: {
        handoff_id: H1,
        transfer_record_id: recId(8),
        receiving_officer_id: "GRP-076",
        receiving_force: "GRP",
        sample_count: 3,
        seal_state: "intact",
        seal_marks: "SEAL-DMJ-26-0207 / 0208 / 0209",
        remarks: "Received in hand under RPF Crime Manual para 13. Sample count and seals verified against the transfer record.",
      },
    },
    // CASE-00422 — awaiting GRP receipt
    {
      case_ref: "CASE-2026-00422",
      type: "trigger",
      device: "EC-RPF-042",
      officer: "RPF-104",
      claimed: at(14, 24),
      disposition: "anchored",
      payload: trigger(
        "Coach S4, Demo Express 10000",
        "Coach / carriage",
        "TRN-10000/S4",
        "tier_3",
        "Strong trace response, repeated on re-sample",
        at(14, 23),
        "searched",
        "material_recovered",
        "Tier 3 referral, confirmatory step pending. Public conveyance within the s.43 Explanation.",
      ),
    },
    {
      case_ref: "CASE-2026-00422",
      type: "field_test",
      device: "EC-RPF-042",
      officer: "RPF-104",
      claimed: at(14, 29),
      disposition: "anchored",
      payload: fieldTest(
        "LOT-25C08",
        "2026-01-31",
        "Orange",
        "inconclusive",
        "RPF-104",
        recId(10),
        33,
        true,
        "Demo Reagent Kit — Type B",
        "Demo Manufacturer Two",
        "Demo Reference Table B (kit insert)",
      ),
    },
    {
      case_ref: "CASE-2026-00422",
      type: "handoff_transfer",
      device: "EC-RPF-042",
      officer: "RPF-104",
      claimed: at(14, 34),
      disposition: "anchored",
      payload: {
        transferor_officer_id: "RPF-104",
        transferor_force: "RPF",
        receiving_agency: "GRP",
        receiving_post: "GRP Post, Demo Junction",
        sample_count: 3,
        seal_state: "intact",
        seal_marks: "SEAL-DMJ-26-0311 / 0312 / 0313",
        article_description: "Three sealed packets, synthetic demo article",
        gross_weight_g: 1240,
        linked_record_ids: [recId(10), recId(11)],
        handoff_id: H2,
      },
    },
    // CASE-00423 — pushed, awaiting anchor; one row altered in storage
    {
      case_ref: "CASE-2026-00423",
      type: "trigger",
      device: "EC-RPF-042",
      officer: "RPF-104",
      claimed: at(14, 46),
      disposition: "pushed",
      payload: trigger(
        "Parcel office, Demo Junction (DMJ)",
        "Parcel office",
        "PARCEL-01",
        "tier_2",
        "Elevated trace response",
        at(14, 45),
        "searched",
        "material_recovered",
        "Tier 2 referral, confirmatory step pending.",
      ),
    },
    {
      case_ref: "CASE-2026-00423",
      type: "field_test",
      device: "EC-RPF-042",
      officer: "RPF-104",
      claimed: at(14, 51),
      disposition: "pushed",
      payload: fieldTest("LOT-26A91", "2027-04-30", "Blue", "presumptive_positive", "RPF-104", recId(13), 29),
    },
    {
      case_ref: "CASE-2026-00423",
      type: "handoff_transfer",
      device: "EC-RPF-042",
      officer: "RPF-104",
      claimed: at(14, 56),
      disposition: "pushed",
      payload: {
        transferor_officer_id: "RPF-104",
        transferor_force: "RPF",
        receiving_agency: "GRP",
        receiving_post: "GRP Post, Demo Junction",
        sample_count: 3,
        seal_state: "intact",
        seal_marks: "SEAL-DMJ-26-0402 / 0403 / 0404",
        article_description: "Three sealed packets, synthetic demo article",
        gross_weight_g: 760,
        linked_record_ids: [recId(13), recId(14)],
        handoff_id: H3,
      },
    },
    {
      case_ref: "CASE-2026-00423",
      type: "handoff_receipt",
      device: "EC-GRP-008",
      officer: "GRP-076",
      claimed: at(14, 58),
      disposition: "pushed",
      payload: {
        handoff_id: H3,
        transfer_record_id: recId(15),
        receiving_officer_id: "GRP-076",
        receiving_force: "GRP",
        sample_count: 3,
        seal_state: "intact",
        seal_marks: "SEAL-DMJ-26-0402 / 0403 / 0404",
        remarks: "Received in hand. Sample count and seals verified against the transfer record.",
      },
    },
    // CASE-00425 — offline, still queued on the handheld
    {
      case_ref: "CASE-2026-00425",
      type: "trigger",
      device: "EC-RPF-042",
      officer: "RPF-104",
      claimed: at(15, 4),
      disposition: "queued",
      payload: trigger(
        "Foot over-bridge, Demo Junction (DMJ)",
        "Foot over-bridge",
        "FOB-02",
        "tier_2",
        "Elevated trace response",
        at(15, 3),
        "searched",
        "material_recovered",
        "Tier 2 referral, confirmatory step pending. Captured with no connectivity.",
      ),
    },
    {
      case_ref: "CASE-2026-00425",
      type: "field_test",
      device: "EC-RPF-042",
      officer: "RPF-104",
      claimed: at(15, 9),
      disposition: "queued",
      payload: fieldTest("LOT-26A91", "2027-04-30", "Pink", "presumptive_negative", "RPF-104", recId(17), 30),
    },
  ];

  // --- build the signed records ------------------------------------------
  const seqByDevice = new Map<string, number>();
  const prevByDevice = new Map<string, string | null>();
  // Each case counts from 1 and links only to its own previous record.
  const seqByCase = new Map<string, number>();
  const prevByCase = new Map<string, string | null>();
  const records: EvidenceRecord[] = [];

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    const device = deviceById.get(p.device) as Device;
    const seq = (seqByDevice.get(p.device) ?? 0) + 1;
    seqByDevice.set(p.device, seq);
    const prev_hash = prevByDevice.get(p.device) ?? null;
    const case_seq = (seqByCase.get(p.case_ref) ?? 0) + 1;
    seqByCase.set(p.case_ref, case_seq);
    const case_prev_hash = prevByCase.get(p.case_ref) ?? null;

    const record = await buildSignedRecord({
      record_id: recId(i + 1),
      type: p.type,
      case_ref: p.case_ref,
      device,
      officer_id: p.officer,
      claimed_time: p.claimed,
      payload: p.payload,
      seq,
      prev_hash,
      case_seq,
      case_prev_hash,
      status: p.disposition === "queued" ? "queued" : "pushed",
    });
    if (p.disposition !== "queued") record.received_at = plusMinutes(p.claimed, 2);
    const identity = await recordHash(record);
    prevByDevice.set(p.device, identity);
    prevByCase.set(p.case_ref, identity);
    records.push(record);
  }

  // --- anchors ------------------------------------------------------------
  // Anchor 1 covers the first 5 server records; anchor 2 the first 9;
  // anchor 3 the first 12. CASE-2026-00423 (records 13–16) sits after the last
  // anchor, so altering one of its rows cannot disturb an anchored prefix.
  const serverRecords = records
    .filter((r) => r.status !== "queued")
    .sort((a, b) => {
      const at = a.received_at ?? "";
      const bt = b.received_at ?? "";
      if (at === bt) return a.record_id.localeCompare(b.record_id);
      return at < bt ? -1 : 1;
    });
  serverRecords.forEach((r, i) => {
    r.log_index = i;
  });
  const leaves: string[] = [];
  for (const r of serverRecords) leaves.push(await leafHash(await recordHash(r)));

  const anchorPlan = [
    { size: 5, time: at(14, 2), start: null as string | null },
    { size: 9, time: at(14, 19), start: at(14, 2) },
    { size: 12, time: at(14, 41), start: at(14, 19) },
  ];

  const anchors: Anchor[] = [];
  let covered = 0;
  for (let i = 0; i < anchorPlan.length; i++) {
    const spec = anchorPlan[i];
    const tree_head = await merkleRoot(leaves.slice(0, spec.size));
    const newIds = serverRecords.slice(covered, spec.size).map((r) => r.record_id);
    covered = spec.size;

    const tokens: TsaToken[] = [];
    for (const authority of tsa_authorities) {
      const signature = await signMessage(
        authority.privateKeyJwk,
        tsaSigningInput(tree_head, spec.size, spec.time),
      );
      tokens.push({
        tsa_id: authority.tsa_id,
        tsa_name: authority.tsa_name,
        trust_domain: authority.trust_domain,
        status: "verified",
        anchor_time: spec.time,
        token_signature: signature,
        publicKeyJwk: authority.publicKeyJwk,
        simulated: true,
      });
    }

    const anchor: Anchor = {
      anchor_id: `ANC-2026-${String(i + 1).padStart(4, "0")}`,
      tree_head,
      tree_size: spec.size,
      anchor_time: spec.time,
      interval_start: spec.start,
      interval_end: spec.time,
      record_ids: newIds,
      tsa: [tokens[0], tokens[1]],
    };
    anchors.push(anchor);

    for (const r of serverRecords.slice(0, spec.size)) {
      if (!r.anchor_id) {
        r.anchor_id = anchor.anchor_id;
        r.status = "anchored";
      }
    }
  }

  // --- handoffs -----------------------------------------------------------
  const handoffs: Handoff[] = [
    {
      handoff_id: H4,
      case_ref: "CASE-2026-00426",
      transfer_record_id: recId(4),
      receipt_record_id: recId(5),
      transfer_officer_id: "RPF-231",
      receiving_officer_id: "GRP-118",
      sample_count: 2,
      seal_state: "intact",
      status: "verified",
      created_at: at(13, 44),
      received_at: at(13, 47),
    },
    {
      handoff_id: H1,
      case_ref: "CASE-2026-00421",
      transfer_record_id: recId(8),
      receipt_record_id: recId(9),
      transfer_officer_id: "RPF-104",
      receiving_officer_id: "GRP-076",
      sample_count: 3,
      seal_state: "intact",
      status: "verified",
      created_at: at(14, 14),
      received_at: at(14, 16),
    },
    {
      handoff_id: H2,
      case_ref: "CASE-2026-00422",
      transfer_record_id: recId(12),
      receipt_record_id: null,
      transfer_officer_id: "RPF-104",
      receiving_officer_id: null,
      sample_count: 3,
      seal_state: "intact",
      status: "awaiting_receipt",
      created_at: at(14, 34),
      received_at: null,
    },
    {
      handoff_id: H3,
      case_ref: "CASE-2026-00423",
      transfer_record_id: recId(15),
      receipt_record_id: recId(16),
      transfer_officer_id: "RPF-104",
      receiving_officer_id: "GRP-076",
      sample_count: 3,
      seal_state: "intact",
      status: "verified",
      created_at: at(14, 56),
      received_at: at(14, 58),
    },
  ];

  const store: StoreShape = {
    version: 1,
    seeded_at,
    officers,
    devices,
    cases,
    records,
    anchors,
    handoffs,
    certificates: [],
    connectivity: { online: true, changed_at: seeded_at, label: "Connected" },
    tamper: [],
    sensor_cursor: 0,
    demo_device_role: "rpf",
    tsa_authorities,
    audit: [],
  };

  // --- certificate for the flagship case ----------------------------------
  const cert = await buildCertificate(store, "CASE-2026-00421", "RPF-104", at(14, 22));
  cert.verification_status = "verified";
  store.certificates.push(cert);

  // --- the seeded alteration ---------------------------------------------
  // CASE-2026-00423's receipt is edited the way an administrator with database
  // access would edit it: the sample count is reduced from three to two and the
  // payload hash is recomputed to cover the tracks. The signature was made over
  // the ORIGINAL payload hash, so it no longer verifies — and the transfer says
  // three samples while the receipt now says two.
  const target = store.records.find((r) => r.record_id === recId(16));
  if (target) {
    const original: EvidenceRecord = JSON.parse(JSON.stringify(target));
    const altered = { ...(target.payload as HandoffReceiptPayload), sample_count: 2 };
    target.payload = altered;
    target.payload_hash = await hashCanonical(altered);
    store.tamper.push({
      record_id: target.record_id,
      original,
      applied_at: seeded_at,
      source: "seed",
      note: "Seeded demonstration: the receipt's sample count was reduced from 3 to 2 directly in storage.",
    });
    const h = store.handoffs.find((x) => x.handoff_id === H3);
    if (h) h.status = "mismatch";
  }

  return store;
}
