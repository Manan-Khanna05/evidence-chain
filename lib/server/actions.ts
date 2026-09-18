/**
 * Server-side domain operations. Every route handler is a thin wrapper over one
 * of these, so the workflow rules live in one place.
 */

import { hashCanonical } from "@/lib/crypto/hash";
import { signMessage, tsaSigningInput } from "@/lib/crypto/keys";
import { leafHash, merkleRoot } from "@/lib/crypto/merkle";
import { buildCertificate } from "@/lib/domain/certificate";
import { buildSignedRecord, recordHash, serverLog } from "@/lib/domain/records";
import type {
  Anchor,
  Device,
  EvidenceRecord,
  FieldTestPayload,
  HardwareObservationPayload,
  Handoff,
  HandoffReceiptPayload,
  HandoffTransferPayload,
  RecordType,
  SealState,
  StoreShape,
  TriggerPayload,
  TsaToken,
} from "@/lib/domain/types";
import { appendRecord } from "@/lib/store/store";

export class WorkflowError extends Error {}

/* ------------------------------------------------------------- identifiers */

function nextRecordId(store: StoreShape): string {
  const max = store.records.reduce((acc, r) => {
    const n = Number(r.record_id.split("-").pop());
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `REC-2026-${String(max + 1).padStart(5, "0")}`;
}

function nextCaseRef(store: StoreShape): string {
  const max = store.cases.reduce((acc, c) => {
    const n = Number(c.case_ref.split("-").pop());
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `CASE-2026-${String(max + 1).padStart(5, "0")}`;
}

function deviceOrThrow(store: StoreShape, deviceId: string): Device {
  const d = store.devices.find((x) => x.device_id === deviceId);
  if (!d) throw new WorkflowError(`Unknown device ${deviceId}`);
  return d;
}

/* -------------------------------------------------------------- capture */

interface CaptureBase {
  case_ref?: string | null;
  device_id: string;
  officer_id: string;
}

/**
 * Sign, chain and enqueue a record on a device.
 *
 * Offline or online, capture always produces a signed, chained, queued record
 * first. Reaching the server is a separate step (Implementation Plan, Step 9).
 */
async function captureRecord(
  store: StoreShape,
  base: CaptureBase,
  type: RecordType,
  payload: TriggerPayload | FieldTestPayload | HandoffTransferPayload | HandoffReceiptPayload,
  caseRef: string,
): Promise<EvidenceRecord> {
  const device = deviceOrThrow(store, base.device_id);
  const chain = store.records
    .filter((r) => r.device_id === device.device_id)
    .sort((a, b) => a.seq - b.seq);
  const last = chain[chain.length - 1];
  const seq = last ? last.seq + 1 : 1;
  const prev_hash = last ? await recordHash(last) : null;

  const record = await buildSignedRecord({
    record_id: nextRecordId(store),
    type,
    case_ref: caseRef,
    device,
    officer_id: base.officer_id,
    claimed_time: new Date().toISOString(),
    payload,
    seq,
    prev_hash,
    status: "queued",
  });
  appendRecord(store, record);
  return record;
}

export interface TriggerInput extends CaptureBase {
  place: string;
  place_kind: string;
  train_or_location_ref: string;
  officer_action: TriggerPayload["officer_action"];
  search_outcome: TriggerPayload["search_outcome"];
  grounds_note: string;
  sensor: TriggerPayload["sensor"];
}

export async function captureTrigger(store: StoreShape, input: TriggerInput) {
  if (!input.place.trim()) throw new WorkflowError("Place is required");
  const caseRef = input.case_ref?.trim() || nextCaseRef(store);
  if (!store.cases.some((c) => c.case_ref === caseRef)) {
    store.cases.push({
      case_ref: caseRef,
      title: `Trigger event — ${input.place_kind}`,
      place: input.place,
      opened_at: new Date().toISOString(),
      opened_by_officer_id: input.officer_id,
      device_id: input.device_id,
      notes: "Opened from a s.43 trigger capture.",
    });
  }
  const payload: TriggerPayload = {
    place: input.place,
    place_kind: input.place_kind,
    train_or_location_ref: input.train_or_location_ref,
    sensor: input.sensor,
    officer_action: input.officer_action,
    search_outcome: input.search_outcome,
    grounds_note: input.grounds_note,
    statutory_basis: "NDPS s.43 — public place; no statutory writing duty",
  };
  const record = await captureRecord(store, input, "trigger", payload, caseRef);
  store.sensor_cursor += 1;
  if (store.connectivity.online) await pushQueue(store);
  return record;
}

export interface FieldTestInput extends CaptureBase {
  case_ref: string;
  kit_type: string;
  manufacturer: string;
  lot_number: string;
  expiry_date: string;
  observed_colour: string;
  reference_table: string;
  ambient_temperature_c: number | null;
  result_status: FieldTestPayload["result_status"];
  /** Set when the record came from an instrumented ESP32 acquisition. */
  hardware?: HardwareObservationPayload;
}

export async function captureFieldTest(store: StoreShape, input: FieldTestInput) {
  const caseRef = input.case_ref?.trim();
  if (!caseRef) throw new WorkflowError("A case reference is required for a field-test record");
  const kase = store.cases.find((c) => c.case_ref === caseRef);
  if (!kase) throw new WorkflowError(`Unknown case ${caseRef}`);
  if (!input.lot_number.trim()) throw new WorkflowError("Lot number is required");
  if (!input.expiry_date) throw new WorkflowError("Expiry date is required");

  const linkedTrigger =
    store.records.find((r) => r.case_ref === caseRef && r.type === "trigger")?.record_id ?? null;

  const expired = new Date(input.expiry_date).getTime() < Date.now();

  const payload: FieldTestPayload = {
    kit_type: input.kit_type,
    manufacturer: input.manufacturer,
    lot_number: input.lot_number.trim(),
    expiry_date: input.expiry_date,
    lot_expired: expired,
    observed_colour: input.observed_colour,
    reference_table: input.reference_table,
    ambient_temperature_c: input.ambient_temperature_c,
    operator_id: input.officer_id,
    result_status: input.result_status,
    epistemic_status: "Presumptive — not a chemical identification",
    linked_trigger_record_id: linkedTrigger,
    ...(input.hardware ? { hardware: input.hardware } : {}),
  };
  const record = await captureRecord(store, input, "field_test", payload, caseRef);
  if (store.connectivity.online) await pushQueue(store);
  return record;
}

/* -------------------------------------------------------------- handoff */

export interface TransferInput extends CaptureBase {
  case_ref: string;
  receiving_post: string;
  sample_count: number;
  seal_state: SealState;
  seal_marks: string;
  article_description: string;
  gross_weight_g: number;
}

export async function createTransfer(store: StoreShape, input: TransferInput) {
  const kase = store.cases.find((c) => c.case_ref === input.case_ref);
  if (!kase) throw new WorkflowError(`Unknown case ${input.case_ref}`);
  const existing = store.handoffs.find((h) => h.case_ref === input.case_ref);
  if (existing && existing.transfer_record_id)
    throw new WorkflowError(`A transfer record already exists for ${input.case_ref}`);
  if (!Number.isInteger(input.sample_count) || input.sample_count < 1)
    throw new WorkflowError("Sample count must be a whole number of at least 1");

  const device = deviceOrThrow(store, input.device_id);
  if (device.force !== "RPF")
    throw new WorkflowError("Only an RPF device may create the transfer side of the handoff");

  const handoff_id = `HO-2026-${input.case_ref.slice(-4)}`;
  const payload: HandoffTransferPayload = {
    transferor_officer_id: input.officer_id,
    transferor_force: "RPF",
    receiving_agency: "GRP",
    receiving_post: input.receiving_post,
    sample_count: input.sample_count,
    seal_state: input.seal_state,
    seal_marks: input.seal_marks,
    article_description: input.article_description,
    gross_weight_g: input.gross_weight_g,
    linked_record_ids: store.records
      .filter((r) => r.case_ref === input.case_ref && r.type !== "handoff_transfer")
      .map((r) => r.record_id),
    handoff_id,
  };
  const record = await captureRecord(store, input, "handoff_transfer", payload, input.case_ref);

  const handoff: Handoff = existing ?? {
    handoff_id,
    case_ref: input.case_ref,
    transfer_record_id: null,
    receipt_record_id: null,
    transfer_officer_id: null,
    receiving_officer_id: null,
    sample_count: null,
    seal_state: null,
    status: "not_started",
    created_at: null,
    received_at: null,
  };
  handoff.handoff_id = handoff_id;
  handoff.transfer_record_id = record.record_id;
  handoff.transfer_officer_id = input.officer_id;
  handoff.sample_count = input.sample_count;
  handoff.seal_state = input.seal_state;
  handoff.status = "awaiting_receipt";
  handoff.created_at = record.claimed_time;
  if (!existing) store.handoffs.push(handoff);

  if (store.connectivity.online) await pushQueue(store);
  return { record, handoff };
}

export interface ReceiptInput extends CaptureBase {
  handoff_id: string;
  sample_count: number;
  seal_state: SealState;
  remarks: string;
}

export async function signReceipt(store: StoreShape, input: ReceiptInput) {
  const handoff = store.handoffs.find((h) => h.handoff_id === input.handoff_id);
  if (!handoff) throw new WorkflowError(`Unknown handoff ${input.handoff_id}`);

  // The dependency the Implementation Plan requires: a receipt cannot be
  // created without the transfer record existing.
  if (!handoff.transfer_record_id)
    throw new WorkflowError(
      "Receipt refused — no transfer record exists for this case. The receiving receipt depends on the transfer record.",
    );
  if (handoff.receipt_record_id)
    throw new WorkflowError("A receipt has already been signed for this handoff");

  const transfer = store.records.find((r) => r.record_id === handoff.transfer_record_id);
  if (!transfer) throw new WorkflowError("The transfer record referenced by this handoff is missing");
  const tp = transfer.payload as HandoffTransferPayload;

  const device = deviceOrThrow(store, input.device_id);
  if (device.force !== "GRP")
    throw new WorkflowError("Only a GRP device may sign the receiving receipt");
  if (device.device_id === transfer.device_id)
    throw new WorkflowError("The receipt must be signed on a different device from the transfer");

  const payload: HandoffReceiptPayload = {
    handoff_id: handoff.handoff_id,
    transfer_record_id: transfer.record_id,
    receiving_officer_id: input.officer_id,
    receiving_force: "GRP",
    sample_count: input.sample_count,
    seal_state: input.seal_state,
    seal_marks: tp.seal_marks,
    remarks: input.remarks,
  };
  const record = await captureRecord(
    store,
    input,
    "handoff_receipt",
    payload,
    handoff.case_ref,
  );

  handoff.receipt_record_id = record.record_id;
  handoff.receiving_officer_id = input.officer_id;
  handoff.received_at = record.claimed_time;
  const mismatch = tp.sample_count !== input.sample_count || tp.seal_state !== input.seal_state;
  handoff.status = mismatch ? "mismatch" : "verified";

  if (store.connectivity.online) await pushQueue(store);
  return { record, handoff, mismatch };
}

/* --------------------------------------------------------- sync + anchor */

/**
 * Push queued records to the server log, in seq order per device.
 *
 * Out-of-order arrival and duplicates are rejected (Implementation Plan,
 * Step 10). Since the queue is drained in order here, the checks below are the
 * server-side assertions rather than the mechanism.
 */
export async function pushQueue(store: StoreShape): Promise<{ pushed: string[]; rejected: string[] }> {
  if (!store.connectivity.online)
    throw new WorkflowError("Cannot push while offline — records remain queued on the device");

  const pushed: string[] = [];
  const rejected: string[] = [];
  const now = new Date().toISOString();

  for (const device of store.devices) {
    const chain = store.records
      .filter((r) => r.device_id === device.device_id)
      .sort((a, b) => a.seq - b.seq);
    let highestAccepted = chain
      .filter((r) => r.status === "pushed" || r.status === "anchored")
      .reduce((acc, r) => Math.max(acc, r.seq), 0);

    for (const r of chain) {
      if (r.status !== "queued" && r.status !== "captured") continue;
      if (r.seq !== highestAccepted + 1) {
        rejected.push(r.record_id);
        continue;
      }
      r.status = "pushed";
      r.received_at = now;
      highestAccepted = r.seq;
      pushed.push(r.record_id);
    }
  }
  return { pushed, rejected };
}

/**
 * Anchor the current tree head to two independent (simulated) authorities.
 *
 * Only a hash ever leaves: the tree head, its size and the anchor time. Record
 * contents stay in the evidence store.
 */
export async function anchorTree(store: StoreShape): Promise<Anchor> {
  const log = serverLog(store.records);
  if (log.length === 0) throw new WorkflowError("Nothing to anchor — the server log is empty");

  const leaves: string[] = [];
  for (const r of log) leaves.push(await leafHash(await recordHash(r)));
  const tree_head = await merkleRoot(leaves);

  const last = store.anchors[store.anchors.length - 1];
  if (last && last.tree_head === tree_head)
    throw new WorkflowError("This tree head is already anchored — nothing new to timestamp");

  const anchor_time = new Date().toISOString();
  const newIds = log.slice(last ? last.tree_size : 0).map((r) => r.record_id);

  const tokens: TsaToken[] = [];
  for (const authority of store.tsa_authorities) {
    if (!authority.available) {
      tokens.push({
        tsa_id: authority.tsa_id,
        tsa_name: authority.tsa_name,
        trust_domain: authority.trust_domain,
        status: "unavailable",
        anchor_time: null,
        token_signature: null,
        publicKeyJwk: null,
        simulated: true,
      });
      continue;
    }
    const signature = await signMessage(
      authority.privateKeyJwk,
      tsaSigningInput(tree_head, leaves.length, anchor_time),
    );
    tokens.push({
      tsa_id: authority.tsa_id,
      tsa_name: authority.tsa_name,
      trust_domain: authority.trust_domain,
      status: "verified",
      anchor_time,
      token_signature: signature,
      publicKeyJwk: authority.publicKeyJwk,
      simulated: true,
    });
  }
  if (tokens.every((t) => t.status === "unavailable"))
    throw new WorkflowError("Both timestamp authorities are unavailable — the anchor was not written");

  const anchor: Anchor = {
    anchor_id: `ANC-2026-${String(store.anchors.length + 1).padStart(4, "0")}`,
    tree_head,
    tree_size: leaves.length,
    anchor_time,
    interval_start: last ? last.anchor_time : null,
    interval_end: anchor_time,
    record_ids: newIds,
    tsa: [tokens[0], tokens[1]],
  };
  store.anchors.push(anchor);

  for (const r of log) {
    if (!r.anchor_id) {
      r.anchor_id = anchor.anchor_id;
      r.status = "anchored";
    }
  }
  return anchor;
}

/* ---------------------------------------------------------- certificate */

export async function generateCertificate(store: StoreShape, caseRef: string, officerId: string) {
  const kase = store.cases.find((c) => c.case_ref === caseRef);
  if (!kase) throw new WorkflowError(`Unknown case ${caseRef}`);
  const existing = store.certificates.find((c) => c.case_ref === caseRef);
  if (existing) return existing;
  const anchoredCount = store.records.filter(
    (r) => r.case_ref === caseRef && r.status === "anchored",
  ).length;
  if (anchoredCount === 0)
    throw new WorkflowError(
      "Certificate refused — no record in this case is anchored yet, so no bounded time can be stated",
    );
  const cert = await buildCertificate(store, caseRef, officerId);
  store.certificates.push(cert);
  return cert;
}

/* --------------------------------------------------------------- tamper */

/**
 * The stage demo. Alters a stored record the way an administrator with database
 * access would: the payload is edited and the payload hash is recomputed to
 * cover the tracks. The signature was made over the original hash, so it stops
 * verifying — and every record after it on that device loses its link.
 */
export async function applyTamper(store: StoreShape, recordId?: string) {
  const target = recordId
    ? store.records.find((r) => r.record_id === recordId)
    : store.records.find(
        (r) => r.case_ref === "CASE-2026-00421" && r.type === "field_test",
      );
  if (!target) throw new WorkflowError("No record available to alter");
  if (store.tamper.some((t) => t.record_id === target.record_id))
    throw new WorkflowError(`${target.record_id} has already been altered`);

  const original: EvidenceRecord = JSON.parse(JSON.stringify(target));
  let note = "";

  if (target.type === "field_test") {
    const p = { ...(target.payload as FieldTestPayload) };
    const before = p.observed_colour;
    p.observed_colour = p.observed_colour === "Purple" ? "Blue" : "Purple";
    target.payload = p;
    note = `Observed colour changed from "${before}" to "${p.observed_colour}" directly in storage.`;
  } else if (target.type === "handoff_receipt") {
    const p = { ...(target.payload as HandoffReceiptPayload) };
    const before = p.sample_count;
    p.sample_count = Math.max(1, before - 1);
    target.payload = p;
    note = `Sample count reduced from ${before} to ${p.sample_count} directly in storage.`;
  } else if (target.type === "handoff_transfer") {
    const p = { ...(target.payload as HandoffTransferPayload) };
    const before = p.sample_count;
    p.sample_count = before + 1;
    target.payload = p;
    note = `Sample count raised from ${before} to ${p.sample_count} directly in storage.`;
  } else {
    const p = { ...(target.payload as TriggerPayload) };
    const before = p.search_outcome;
    p.search_outcome = "material_recovered";
    target.payload = p;
    note = `Search outcome changed from "${before}" to "material_recovered" directly in storage.`;
  }

  // Recompute the payload hash, exactly as someone covering their tracks would.
  target.payload_hash = await hashCanonical(target.payload);

  store.tamper.push({
    record_id: target.record_id,
    original,
    applied_at: new Date().toISOString(),
    source: "demo",
    note,
  });
  return { record_id: target.record_id, note };
}

/** Undo the demo alterations. Seeded ones are left in place. */
export function restoreTamper(store: StoreShape, all = false) {
  const toRestore = store.tamper.filter((t) => all || t.source === "demo");
  for (const entry of toRestore) {
    const idx = store.records.findIndex((r) => r.record_id === entry.record_id);
    if (idx >= 0) store.records[idx] = entry.original;
  }
  store.tamper = store.tamper.filter((t) => !toRestore.includes(t));
  return toRestore.map((t) => t.record_id);
}
