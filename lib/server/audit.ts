/**
 * Turning an action into an operational audit line.
 *
 * One place decides how each action is described, so the audit trail reads
 * consistently and can never be mistaken for evidence: no signature, no chain,
 * no position in a case. It answers "what did the application do", while the
 * evidence records answer "what was observed and confirmed".
 */

import type { AuditEvent, CaseRecord, EvidenceRecord } from "@/lib/domain/types";

type Draft = Omit<AuditEvent, "audit_id" | "at">;

const CATEGORY: Record<string, AuditEvent["category"]> = {
  "case.create": "CASE",
  "capture.trigger": "EVIDENCE",
  "capture.field_test": "EVIDENCE",
  "screening.flag": "EVIDENCE",
  "handoff.transfer": "HANDOFF",
  "handoff.receipt": "HANDOFF",
  "sync.push": "SYNC",
  "anchor.create": "SYNC",
  "tsa.availability": "SYNC",
  "certificate.generate": "CERTIFICATE",
  "certificate.verify_hash": "VERIFICATION",
  "connectivity.set": "DEVICE",
  "demo.reset": "DEMO",
  "demo.tamper": "DEMO",
  "demo.restore": "DEMO",
  "demo.device_role": "DEMO",
};

function isRecord(v: unknown): v is EvidenceRecord {
  return typeof v === "object" && v !== null && "record_id" in v && "case_ref" in v;
}

function isCase(v: unknown): v is CaseRecord {
  return typeof v === "object" && v !== null && "case_ref" in v && "opened_at" in v;
}

/**
 * Describe one completed action. Returns null for actions not worth recording,
 * so the trail stays readable rather than exhaustive.
 */
export function describeAudit(
  action: string,
  payload: Record<string, unknown>,
  result: unknown,
): Draft | null {
  const category = CATEGORY[action];
  if (!category) return null;

  const officer_id =
    (typeof payload.officer_id === "string" && payload.officer_id) ||
    (typeof payload.operator_id === "string" && payload.operator_id) ||
    null;

  const base: Draft = {
    category,
    action,
    summary: action,
    officer_id,
    case_ref: typeof payload.case_ref === "string" ? payload.case_ref : null,
    record_id: null,
    demo: action.startsWith("demo.") || action === "screening.flag",
  };

  if (isRecord(result)) {
    base.case_ref = result.case_ref;
    base.record_id = result.record_id;
  } else if (isCase(result)) {
    base.case_ref = result.case_ref;
  }

  switch (action) {
    case "case.create":
      return { ...base, summary: `Case ${base.case_ref ?? "?"} opened` };
    case "capture.trigger":
      return {
        ...base,
        summary: `Trigger record ${base.record_id ?? ""} captured into ${base.case_ref ?? "?"}`,
      };
    case "capture.field_test":
      return {
        ...base,
        summary: `Field test ${base.record_id ?? ""} confirmed into ${base.case_ref ?? "?"}`,
      };
    case "screening.flag":
      return {
        ...base,
        summary: `TTE demo screening flag raised into ${base.case_ref ?? "?"}`,
      };
    case "handoff.transfer":
      return { ...base, summary: `Custody transfer signed for ${base.case_ref ?? "?"}` };
    case "handoff.receipt":
      return { ...base, summary: `Custody receipt signed for ${base.case_ref ?? "?"}` };
    case "sync.push": {
      const n = Array.isArray(result) ? result.length : undefined;
      return { ...base, summary: n === undefined ? "Sync run" : `Sync pushed ${n} record(s)` };
    }
    case "anchor.create":
      return { ...base, summary: "Log anchored to simulated trusted time" };
    case "tsa.availability":
      return { ...base, summary: "Simulated timestamp authority availability changed" };
    case "certificate.generate":
      return { ...base, summary: `Section 63 certificate generated for ${base.case_ref ?? "?"}` };
    case "certificate.verify_hash":
      return { ...base, summary: `Certificate hash re-checked for ${base.case_ref ?? "?"}` };
    case "connectivity.set":
      return {
        ...base,
        summary: payload.online ? "Network restored (demo control)" : "Network set offline (demo control)",
        demo: true,
      };
    case "demo.reset":
      return { ...base, summary: "Demo data reset to the seeded state" };
    case "demo.tamper":
      return { ...base, summary: "DEMO tamper applied to a stored record" };
    case "demo.restore":
      return { ...base, summary: "DEMO tamper reverted" };
    case "demo.device_role":
      return { ...base, summary: `Demo device role switched to ${String(payload.role ?? "")}` };
    default:
      return base;
  }
}
