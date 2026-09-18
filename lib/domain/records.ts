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
import { recordSigningInput, signMessage } from "@/lib/crypto/keys";
import type { Device, EvidenceRecord, RecordPayload, RecordType } from "./types";

/** Identity hash of a whole record — the value the next record links to. */
export async function recordHash(record: EvidenceRecord): Promise<string> {
  return hashCanonical({
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
  });
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
  status: EvidenceRecord["status"];
}

/**
 * Build a signed record. The signature is produced with a real ECDSA P-256
 * key — but a SOFTWARE key, surfaced everywhere as "DEMO SIGNATURE".
 */
export async function buildSignedRecord(input: BuildRecordInput): Promise<EvidenceRecord> {
  const payload_hash = await hashCanonical(input.payload);
  const signature = await signMessage(
    input.device.privateKeyJwk,
    recordSigningInput(payload_hash, input.prev_hash, input.seq),
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
    payload: input.payload,
    payload_hash,
    signature,
    status: input.status,
    received_at: null,
    anchor_id: null,
  };
}

/** Records that have reached the server log, in ingest order. */
export function serverLog(records: EvidenceRecord[]): EvidenceRecord[] {
  return records
    .filter((r) => r.status === "pushed" || r.status === "anchored")
    .sort((a, b) => {
      const at = a.received_at ?? "";
      const bt = b.received_at ?? "";
      if (at === bt) return a.record_id.localeCompare(b.record_id);
      return at < bt ? -1 : 1;
    });
}

export function recordsForCase(records: EvidenceRecord[], caseRef: string): EvidenceRecord[] {
  return records
    .filter((r) => r.case_ref === caseRef)
    .sort((a, b) => {
      if (a.claimed_time === b.claimed_time) return a.seq - b.seq;
      return a.claimed_time < b.claimed_time ? -1 : 1;
    });
}
