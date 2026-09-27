/**
 * Record construction, hashing and the per-device hash chain.
 *
 * Implementation Plan, Step 8: "each new record on a device links to the
 * previous one. Use a secure-element monotonic counter for seq so the device
 * cannot silently reorder or re-issue." In this prototype the counter is the
 * store's per-device max(seq)+1; the discontinuity check on ingest is the same
 * one a server would run against a hardware counter.
 */

import { hashCanonical } from "@/lib/crypto/hash";
import { recordSigningInputV2, signMessage } from "@/lib/crypto/keys";
import type { Device, EvidenceRecord, RecordPayload, RecordType } from "./types";

/**
 * Identity hash of a whole record — the value the next record links to.
 *
 * Records that carry a case-chain position hash it too, so their place in the
 * case cannot be altered without breaking both chains. Records written before
 * per-case chaining hash exactly as they always did, so their stored links
 * keep verifying.
 */
export async function recordHash(record: EvidenceRecord): Promise<string> {
  const base = {
    record_id: record.record_id,
    type: record.type,
    case_ref: record.case_ref,
    device_id: record.device_id,
    officer_id: record.officer_id,
    claimed_time: record.claimed_time,
    seq: record.seq,
    prev_hash: record.prev_hash,
    payload_hash: record.payload_hash,
    signature: record.signature,
  };
  if (record.case_seq === null || record.case_seq === undefined) return hashCanonical(base);
  return hashCanonical({
    ...base,
    case_seq: record.case_seq,
    case_prev_hash: record.case_prev_hash ?? null,
  });
}

/* ------------------------------------------------------------ case chain */

/** Every record of one case, in its own chain order. */
export function caseChain(records: EvidenceRecord[], caseRef: string): EvidenceRecord[] {
  return records
    .filter((r) => r.case_ref === caseRef)
    .sort((a, b) => {
      const ac = a.case_seq ?? 0;
      const bc = b.case_seq ?? 0;
      if (ac !== bc) return ac - bc;
      // Records from before per-case chaining fall back to device order.
      return a.seq - b.seq;
    });
}

/**
 * The next position in a case chain. Always 1 for a case with no records,
 * whatever any other case or device has reached.
 */
export function nextCaseSeq(records: EvidenceRecord[], caseRef: string): number {
  const chain = caseChain(records, caseRef);
  if (chain.length === 0) return 1;
  const highest = chain.reduce((acc, r, i) => Math.max(acc, r.case_seq ?? i + 1), 0);
  return highest + 1;
}

/** The hash the next record of this case must link to, or null at genesis. */
export async function previousCaseHashFor(
  records: EvidenceRecord[],
  caseRef: string,
): Promise<string | null> {
  const chain = caseChain(records, caseRef);
  if (chain.length === 0) return null;
  return recordHash(chain[chain.length - 1]);
}

export function deviceChain(records: EvidenceRecord[], deviceId: string): EvidenceRecord[] {
  return records.filter((r) => r.device_id === deviceId).sort((a, b) => a.seq - b.seq);
}

export function nextSeq(records: EvidenceRecord[], deviceId: string): number {
  const chain = deviceChain(records, deviceId);
  return chain.length === 0 ? 1 : chain[chain.length - 1].seq + 1;
}

export async function previousHashFor(
  records: EvidenceRecord[],
  deviceId: string,
): Promise<string | null> {
  const chain = deviceChain(records, deviceId);
  if (chain.length === 0) return null;
  return recordHash(chain[chain.length - 1]);
}

export function makeRecordId(seed: number): string {
  return `REC-2026-${String(seed).padStart(5, "0")}`;
}

export interface BuildRecordInput {
  record_id: string;
  type: RecordType;
  case_ref: string;
  device: Device;
  officer_id: string;
  claimed_time: string;
  payload: RecordPayload;
  seq: number;
  prev_hash: string | null;
  /** Position in this case's chain. Required for every new record. */
  case_seq: number;
  case_prev_hash: string | null;
  status: EvidenceRecord["status"];
}

/**
 * Build a signed record. The signature is produced with a real ECDSA P-256
 * key — but a SOFTWARE key, surfaced everywhere as "DEMO SIGNATURE".
 */
export async function buildSignedRecord(input: BuildRecordInput): Promise<EvidenceRecord> {
  const payload_hash = await hashCanonical(input.payload);
  // v2: the signature also covers the case reference and the record's place in
  // that case's chain, so a signed record cannot be moved between cases.
  const signature = await signMessage(
    input.device.privateKeyJwk,
    recordSigningInputV2(
      payload_hash,
      input.prev_hash,
      input.seq,
      input.case_ref,
      input.case_seq,
      input.case_prev_hash,
    ),
  );
  return {
    record_id: input.record_id,
    type: input.type,
    case_ref: input.case_ref,
    device_id: input.device.device_id,
    officer_id: input.officer_id,
    claimed_time: input.claimed_time,
    seq: input.seq,
    prev_hash: input.prev_hash,
    case_seq: input.case_seq,
    case_prev_hash: input.case_prev_hash,
    payload: input.payload,
    payload_hash,
    signature,
    status: input.status,
    received_at: null,
    anchor_id: null,
  };
}

/**
 * Records that have reached the server log, in the order the server accepted
 * them.
 *
 * Accepted order is `log_index`. Records from before that field existed have
 * none; they predate every indexed record, so they come first, in the order
 * their ingest time and id give — which is how they were anchored.
 */
export function serverLog(records: EvidenceRecord[]): EvidenceRecord[] {
  return records
    .filter((r) => r.status === "pushed" || r.status === "anchored")
    .sort((a, b) => {
      const ai = a.log_index;
      const bi = b.log_index;
      if (ai !== undefined && bi !== undefined) return ai - bi;
      if (ai === undefined && bi !== undefined) return -1;
      if (ai !== undefined && bi === undefined) return 1;
      const at = a.received_at ?? "";
      const bt = b.received_at ?? "";
      if (at === bt) return a.record_id.localeCompare(b.record_id);
      return at < bt ? -1 : 1;
    });
}

/** The next free position in the server log. */
export function nextLogIndex(records: EvidenceRecord[]): number {
  return records.reduce((acc, r) => Math.max(acc, r.log_index ?? -1), -1) + 1;
}

export function recordsForCase(records: EvidenceRecord[], caseRef: string): EvidenceRecord[] {
  return records
    .filter((r) => r.case_ref === caseRef)
    .sort((a, b) => {
      if (a.claimed_time === b.claimed_time) return a.seq - b.seq;
      return a.claimed_time < b.claimed_time ? -1 : 1;
    });
}
