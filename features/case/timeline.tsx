"use client";

import * as React from "react";
import {
  Anchor as AnchorIcon,
  ArrowLeftRight,
  Check,
  CircleDashed,
  FileBadge,
  FlaskConical,
  ListChecks,
  Radio,
  Signature,
  UploadCloud,
  X,
} from "lucide-react";
import type { ClientStore, EvidenceRecord } from "@/lib/domain/types";
import type { CaseSummary } from "@/lib/domain/status";
import { fmtInterval, fmtTime } from "@/lib/format";
import { intervalFor } from "@/lib/domain/status";
import { REFERRAL_TIERS } from "@/lib/domain/vocab";
import { HashChip, Pill, cx } from "@/components/ui/primitives";
import type { Tone } from "@/components/ui/primitives";
import type { FieldTestPayload, HandoffTransferPayload, TriggerPayload } from "@/lib/domain/types";
import { resultLabel } from "@/features/records/payload-view";

type StepState = "done" | "active" | "pending" | "failed";

interface Step {
  key: string;
  label: string;
  icon: React.ReactNode;
  state: StepState;
  time?: string;
  timeLabel?: string;
  record?: EvidenceRecord | null;
  lines: { k: string; v: React.ReactNode }[];
  tone?: Tone;
}

const STATE_STYLE: Record<StepState, { ring: string; dot: string; text: string }> = {
  done: { ring: "border-ok/45 bg-ok/12", dot: "text-ok", text: "text-fg" },
  active: { ring: "border-warn/50 bg-warn/12", dot: "text-warn", text: "text-fg" },
  pending: { ring: "border-line-strong bg-ink-800", dot: "text-fg-dim", text: "text-fg-muted" },
  failed: { ring: "border-danger/50 bg-danger/12", dot: "text-danger", text: "text-fg" },
};

export function EvidenceTimeline({
  summary,
  store,
  onOpenRecord,
}: {
  summary: CaseSummary;
  store: ClientStore;
  onOpenRecord: (r: EvidenceRecord) => void;
}) {
  const steps = buildSteps(summary, store);

  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const style = STATE_STYLE[step.state];
        const last = i === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
            {/* rail */}
            {!last ? (
              <span
                aria-hidden
                className={cx(
                  "absolute left-[19px] top-10 bottom-0 w-px",
                  step.state === "done" ? "bg-ok/30" : "bg-line",
                )}
              />
            ) : null}

            <div
              className={cx(
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                style.ring,
              )}
            >
              <span className={style.dot}>{step.icon}</span>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="mono text-[11px] text-fg-dim">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={cx("text-[14px] font-semibold tracking-tight", style.text)}>
                  {step.label}
                </span>
                {step.state === "done" ? (
                  <Check size={14} className="text-ok" />
                ) : step.state === "failed" ? (
                  <X size={14} className="text-danger" />
                ) : step.state === "active" ? (
                  <CircleDashed size={13} className="text-warn" />
                ) : null}
                {step.time ? (
                  <span className="mono ml-auto text-[12px] tabular-nums text-fg-muted">
                    {step.time}
                    {step.timeLabel ? (
                      <span className="ml-1.5 text-[10px] uppercase tracking-[0.08em] text-fg-dim">
                        {step.timeLabel}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>

              {step.lines.length ? (
                <dl className="mt-2 grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
                  {step.lines.map((l, idx) => (
                    <div key={idx} className="flex min-w-0 items-baseline gap-2">
                      <dt className="w-[104px] shrink-0 text-[11px] uppercase tracking-[0.08em] text-fg-dim">
                        {l.k}
                      </dt>
                      <dd className="min-w-0 flex-1 text-[12.5px] text-fg-muted">{l.v}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {step.record ? (
                <button
                  onClick={() => onOpenRecord(step.record as EvidenceRecord)}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-ink-800 px-2 py-1 text-[11.5px] text-fg-muted transition-colors hover:border-brand/50 hover:text-fg"
                >
                  <span className="mono">{step.record.record_id}</span>
                  <span className="text-fg-dim">· view technical details</span>
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function buildSteps(summary: CaseSummary, store: ClientStore): Step[] {
  const records = summary.records;
  const trigger = records.find((r) => r.type === "trigger") ?? null;
  const fieldTest = records.find((r) => r.type === "field_test") ?? null;
  const transfer = records.find((r) => r.type === "handoff_transfer") ?? null;
  const receipt = records.find((r) => r.type === "handoff_receipt") ?? null;
  const certificate = store.certificates.find((c) => c.case_ref === summary.case_ref) ?? null;
  const queued = records.filter((r) => r.status === "queued" || r.status === "captured");
  const pushed = records.filter((r) => r.status === "pushed" || r.status === "anchored");
  const anchored = records.filter((r) => r.status === "anchored");
  const anchor =
    anchored.length > 0
      ? (store.anchors.find((a) => a.anchor_id === anchored[anchored.length - 1].anchor_id) ?? null)
      : null;
  const tamperedIds = new Set(store.tamper.map((t) => t.record_id));
  const device = store.devices.find((d) => d.device_id === summary.device_id);

  const steps: Step[] = [];

  /* 01 — trigger */
  const tp = trigger ? (trigger.payload as TriggerPayload) : null;
  steps.push({
    key: "trigger",
    label: "Trigger captured",
    icon: <Radio size={17} />,
    state: trigger ? (tamperedIds.has(trigger.record_id) ? "failed" : "done") : "pending",
    time: trigger ? fmtTime(trigger.claimed_time) : undefined,
    timeLabel: trigger ? "claimed" : undefined,
    record: trigger,
    lines: tp
      ? [
          { k: "Sensor", v: <span>{tp.sensor.sensor_type}</span> },
          {
            k: "Tier",
            v: (
              <Pill tone={tp.sensor.tier === "no_referral" ? "neutral" : "brand"}>
                {REFERRAL_TIERS[tp.sensor.tier].label}
              </Pill>
            ),
          },
          { k: "Reading", v: tp.sensor.raw_value },
          {
            k: "Outcome",
            v:
              tp.search_outcome === "material_recovered"
                ? "Material recovered"
                : tp.search_outcome === "nothing_recovered"
                  ? "Nothing recovered"
                  : "No search",
          },
        ]
      : [{ k: "Status", v: "No trigger record for this case" }],
  });

  /* 02 — field test */
  const fp = fieldTest ? (fieldTest.payload as FieldTestPayload) : null;
  steps.push({
    key: "field_test",
    label: "Field test recorded",
    icon: <FlaskConical size={17} />,
    state: fieldTest ? (tamperedIds.has(fieldTest.record_id) ? "failed" : "done") : "pending",
    time: fieldTest ? fmtTime(fieldTest.claimed_time) : undefined,
    timeLabel: fieldTest ? "claimed" : undefined,
    record: fieldTest,
    lines: fp
      ? [
          { k: "Kit / lot", v: `${fp.kit_type} · ${fp.lot_number}` },
          { k: "Colour", v: fp.observed_colour },
          {
            k: "Result",
            v: (
              <span className="flex flex-wrap items-center gap-1.5">
                <Pill tone={fp.result_status === "presumptive_positive" ? "warn" : "info"}>
                  {resultLabel(fp.result_status)}
                </Pill>
                {fp.lot_expired ? <Pill tone="danger">Expired lot</Pill> : null}
              </span>
            ),
          },
          { k: "Epistemic", v: <span className="text-[#8A5A12]">{fp.epistemic_status}</span> },
        ]
      : [{ k: "Status", v: "No field-test record for this case" }],
  });

  /* 03 — signed on device */
  steps.push({
    key: "signed",
    label: records.length ? "Signed on device" : "Awaiting capture",
    icon: <Signature size={16} />,
    state: records.length ? "done" : "pending",
    lines: records.length
      ? [
          { k: "Device", v: <span className="mono">{summary.device_id}</span> },
          {
            k: "Key",
            v: (
              <span>
                Software ECDSA P-256{" "}
                <span className="text-fg-dim">
                  (target: {device?.target_key_security_level ?? "TEE"})
                </span>
              </span>
            ),
          },
          { k: "Records", v: `${records.length} signed and chained` },
          {
            k: "Chain head",
            v: <HashChip value={records[records.length - 1]?.payload_hash} />,
          },
        ]
      : [],
  });

  /* 04 — queued */
  steps.push({
    key: "queued",
    label: queued.length ? "Queued on device" : "Queue drained",
    icon: <ListChecks size={16} />,
    state: queued.length ? "active" : records.length ? "done" : "pending",
    lines: [
      {
        k: "Queued",
        v: queued.length
          ? `${queued.length} record(s) waiting for connectivity`
          : "No record is waiting on the device",
      },
      ...(queued.length
        ? [{ k: "Records", v: <span className="mono">{queued.map((r) => r.record_id).join(", ")}</span> }]
        : []),
    ],
  });

  /* 05 — server accepted */
  steps.push({
    key: "pushed",
    label: "Server accepted",
    icon: <UploadCloud size={16} />,
    state: pushed.length ? "done" : "pending",
    time: pushed.length ? fmtTime(pushed[pushed.length - 1].received_at) : undefined,
    timeLabel: pushed.length ? "ingest" : undefined,
    lines: [
      {
        k: "Accepted",
        v: pushed.length
          ? `${pushed.length} of ${records.length} record(s) in the server log`
          : "Nothing has reached the server yet",
      },
      {
        k: "Checks",
        v: pushed.length ? "Signature, sequence and chain linkage validated on ingest" : "—",
      },
    ],
  });

  /* 06 — anchored */
  const interval =
    anchored.length > 0 ? intervalFor(anchored[anchored.length - 1], store.anchors) : null;
  steps.push({
    key: "anchored",
    label: anchored.length ? "Merkle tree anchored" : "Awaiting anchor",
    icon: <AnchorIcon size={16} />,
    state: anchored.length ? "done" : pushed.length ? "active" : "pending",
    time: anchor ? fmtTime(anchor.anchor_time) : undefined,
    timeLabel: anchor ? "anchor" : undefined,
    lines: anchor
      ? [
          { k: "Tree head", v: <HashChip value={anchor.tree_head} tone="ok" /> },
          { k: "Tree size", v: `${anchor.tree_size} leaves` },
          {
            k: "Authorities",
            v: (
              <span className="flex flex-wrap gap-1.5">
                {anchor.tsa.map((t) => (
                  <Pill key={t.tsa_id} tone={t.status === "verified" ? "ok" : "warn"}>
                    {t.tsa_id} {t.status === "verified" ? "✓" : "unavailable"}
                  </Pill>
                ))}
              </span>
            ),
          },
          {
            k: "Bounded time",
            v: interval ? (
              <span className="mono tabular-nums text-fg">{fmtInterval(interval.start, interval.end)}</span>
            ) : (
              "—"
            ),
          },
        ]
      : [{ k: "Time", v: "Not yet anchored — time unproven" }],
  });

  /* 07 — handoff */
  const transferPayload = transfer ? (transfer.payload as HandoffTransferPayload) : null;
  const handoffState: StepState =
    summary.handoff_status === "verified"
      ? "done"
      : summary.handoff_status === "mismatch"
        ? "failed"
        : transfer
          ? "active"
          : "pending";
  steps.push({
    key: "handoff",
    label: "RPF → GRP custody handoff",
    icon: <ArrowLeftRight size={16} />,
    state: handoffState,
    time: receipt ? fmtTime(receipt.claimed_time) : transfer ? fmtTime(transfer.claimed_time) : undefined,
    timeLabel: transfer ? "claimed" : undefined,
    record: receipt ?? transfer,
    lines: transferPayload
      ? [
          { k: "Transferor", v: transferPayload.transferor_officer_id },
          {
            k: "Receiver",
            v: summary.handoff?.receiving_officer_id ?? "Awaiting GRP receipt",
          },
          { k: "Samples", v: String(transferPayload.sample_count).padStart(2, "0") },
          { k: "Seal", v: transferPayload.seal_state.replace(/_/g, " ") },
        ]
      : [{ k: "Status", v: "No transfer record has been created" }],
  });

  /* 08 — certificate */
  steps.push({
    key: "certificate",
    label: certificate ? "Section 63 certificate generated" : "Certificate not generated",
    icon: <FileBadge size={16} />,
    state: certificate ? "done" : summary.certificate_ready ? "active" : "pending",
    time: certificate ? fmtTime(certificate.generated_at) : undefined,
    lines: certificate
      ? [
          { k: "Certificate", v: <span className="mono">{certificate.certificate_id}</span> },
          { k: "Algorithm", v: certificate.algorithm },
          { k: "Hash value", v: <HashChip value={certificate.hash} tone="brand" /> },
          { k: "Part B", v: <span className="text-fg-dim">Left blank for the expert</span> },
        ]
      : [
          {
            k: "Ready",
            v: summary.certificate_ready
              ? "All preconditions met — the certificate can be generated"
              : "Requires an anchored record and a verified two-party handoff",
          },
        ],
  });

  return steps;
}
