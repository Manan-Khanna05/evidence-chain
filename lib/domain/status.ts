/**
 * Case status derivation.
 *
 * Status is never stored as a free-standing field that could drift from the
 * records: it is computed from the records that actually exist. That is what
 * makes impossible states impossible — e.g. a GRP receipt cannot exist without
 * an RPF transfer record, because the receipt route refuses to create one.
 */

import type {
  Anchor,
  CaseRecord,
  CaseStage,
  Certificate,
  EvidenceRecord,
  Handoff,
} from "./types";
import { recordsForCase } from "./records";

/**
 * The subset of the store these helpers need. Both the server-side StoreShape
 * and the key-stripped ClientStore satisfy it, so status is derived by exactly
 * the same code on both sides.
 */
export interface SummaryStore {
  cases: CaseRecord[];
  records: EvidenceRecord[];
  anchors: Anchor[];
  handoffs: Handoff[];
  certificates: Certificate[];
  tamper: { record_id: string }[];
}

export const STAGE_ORDER: CaseStage[] = [
  "triggered",
  "field_test_recorded",
  "queued_offline",
  "pushed",
  "anchored",
  "handoff_pending",
  "handoff_verified",
  "certificate_ready",
];

export const STAGE_LABEL: Record<CaseStage, string> = {
  triggered: "Trigger captured",
  field_test_recorded: "Field test recorded",
  queued_offline: "Queued offline",
  pushed: "Server accepted",
  anchored: "Anchored",
  handoff_pending: "Handoff pending",
  handoff_verified: "Handoff verified",
  certificate_ready: "Certificate ready",
};

export const HANDOFF_LABEL: Record<Handoff["status"], string> = {
  not_started: "Not started",
  transfer_created: "Transfer created",
  awaiting_receipt: "Awaiting GRP receipt",
  receipt_signed: "Receipt signed",
  verified: "Two-party verified",
  mismatch: "Transfer mismatch",
};

export type AnchorState = "unanchored" | "single_anchor" | "dual_anchored";

export interface CaseSummary {
  case_ref: string;
  title: string;
  place: string;
  opened_at: string;
  officer_id: string;
  device_id: string;
  records: EvidenceRecord[];
  record_count: number;
  latest_record: EvidenceRecord | null;
  latest_update: string;
  stage: CaseStage;
  queued_count: number;
  anchored_count: number;
  anchor_state: AnchorState;
  handoff: Handoff | null;
  handoff_status: Handoff["status"];
  certificate_ready: boolean;
  has_certificate: boolean;
  tampered: boolean;
  interval: { start: string | null; end: string } | null;
}

function anchorFor(anchors: Anchor[], id: string | null): Anchor | undefined {
  if (!id) return undefined;
  return anchors.find((a) => a.anchor_id === id);
}

export function anchorStateOf(records: EvidenceRecord[], anchors: Anchor[]): AnchorState {
  const anchored = records.filter((r) => r.status === "anchored" && r.anchor_id);
  if (anchored.length === 0) return "unanchored";
  const anchorsUsed = anchored
    .map((r) => anchorFor(anchors, r.anchor_id))
    .filter((a): a is Anchor => Boolean(a));
  const allDual = anchorsUsed.every((a) => a.tsa.every((t) => t.status === "verified"));
  if (anchored.length < records.length) return "single_anchor";
  return allDual ? "dual_anchored" : "single_anchor";
}

/** Bounded interval for a record: [previous anchor, its own anchor]. */
export function intervalFor(
  record: EvidenceRecord,
  anchors: Anchor[],
): { start: string | null; end: string } | null {
  const anchor = anchorFor(anchors, record.anchor_id);
  if (!anchor) return null;
  return { start: anchor.interval_start, end: anchor.interval_end };
}

export function summariseCase(store: SummaryStore, c: CaseRecord): CaseSummary {
  const records = recordsForCase(store.records, c.case_ref);
  const handoff = store.handoffs.find((h) => h.case_ref === c.case_ref) ?? null;
  const certificate = store.certificates.find((x) => x.case_ref === c.case_ref) ?? null;
  const latest = records.length ? records[records.length - 1] : null;

  const queued = records.filter((r) => r.status === "captured" || r.status === "queued");
  const anchored = records.filter((r) => r.status === "anchored");
  const pushed = records.filter((r) => r.status === "pushed" || r.status === "anchored");
  const hasTrigger = records.some((r) => r.type === "trigger");
  const hasFieldTest = records.some((r) => r.type === "field_test");
  const handoffStatus: Handoff["status"] = handoff ? handoff.status : "not_started";

  let stage: CaseStage = "triggered";
  if (hasTrigger) stage = "triggered";
  if (hasFieldTest) stage = "field_test_recorded";
  if (queued.length) stage = "queued_offline";
  else if (pushed.length) stage = "pushed";
  if (anchored.length && !queued.length) stage = "anchored";
  if (handoffStatus === "transfer_created" || handoffStatus === "awaiting_receipt")
    stage = "handoff_pending";
  if (handoffStatus === "verified" || handoffStatus === "receipt_signed") stage = "handoff_verified";
  if (certificate) stage = "certificate_ready";

  const certificate_ready =
    handoffStatus === "verified" && anchored.length > 0 && queued.length === 0;

  const anchoredRecord = anchored[anchored.length - 1] ?? null;

  return {
    case_ref: c.case_ref,
    title: c.title,
    place: c.place,
    opened_at: c.opened_at,
    officer_id: c.opened_by_officer_id,
    device_id: c.device_id,
    records,
    record_count: records.length,
    latest_record: latest,
    latest_update: latest ? (latest.received_at ?? latest.claimed_time) : c.opened_at,
    stage,
    queued_count: queued.length,
    anchored_count: anchored.length,
    anchor_state: anchorStateOf(records, store.anchors),
    handoff,
    handoff_status: handoffStatus,
    certificate_ready,
    has_certificate: Boolean(certificate),
    tampered: records.some((r) => store.tamper.some((t) => t.record_id === r.record_id)),
    interval: anchoredRecord ? intervalFor(anchoredRecord, store.anchors) : null,
  };
}

export function summariseAll(store: SummaryStore): CaseSummary[] {
  return store.cases
    .map((c) => summariseCase(store, c))
    .sort((a, b) => (a.latest_update < b.latest_update ? 1 : -1));
}

/**
 * Cases in the order they were last worked on.
 *
 * Deliberately NOT sorted by the device clock: that clock is untrusted, and the
 * seeded demo records carry times that would bury a capture taken a minute ago.
 * The log is append-only, so a record's position in it is the honest answer to
 * "what happened most recently". Cases with no records yet fall back to the
 * order they were created in.
 */
export function summariseByRecency(store: SummaryStore): CaseSummary[] {
  const lastRecordIndex = new Map<string, number>();
  store.records.forEach((r, i) => lastRecordIndex.set(r.case_ref, i));
  const caseIndex = new Map(store.cases.map((c, i) => [c.case_ref, i]));
  const score = (ref: string) => {
    const withRecords = lastRecordIndex.get(ref);
    return withRecords === undefined ? (caseIndex.get(ref) ?? 0) : withRecords + 1_000_000;
  };
  return summariseAll(store).sort((a, b) => score(b.case_ref) - score(a.case_ref));
}
