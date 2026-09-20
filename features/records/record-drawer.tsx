"use client";

import * as React from "react";
import {
  AlertTriangle,
  Binary,
  Clock,
  Fingerprint,
  GitBranch,
  Link2,
  ShieldCheck,
  Sigma,
  X,
} from "lucide-react";
import type { ClientStore, EvidenceRecord } from "@/lib/domain/types";
import type { InclusionProof } from "@/lib/crypto/merkle";
import { canonicalise } from "@/lib/crypto/hash";
import { fmtDateTime, fmtInterval, fmtTime } from "@/lib/format";
import { intervalFor } from "@/lib/domain/status";
import { Button, Callout, HashChip, KeyValue, Panel, Pill, cx } from "@/components/ui/primitives";
import { ImmutableBadge } from "@/features/case/case-context";
import { DEMO_SIGNATURE_PILL, RecordStatusPill, RecordTypePill } from "@/components/ui/status";
import { PayloadView } from "./payload-view";

export function RecordDrawer({
  record,
  store,
  onClose,
}: {
  record: EvidenceRecord | null;
  store: ClientStore;
  onClose: () => void;
}) {
  const [proof, setProof] = React.useState<
    | { record_id: string; proof: InclusionProof; root: string; verified: boolean; anchored: boolean }
    | null
  >(null);
  const [proofBusy, setProofBusy] = React.useState(false);
  const [proofError, setProofError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setProof(null);
    setProofError(null);
  }, [record?.record_id]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!record) return null;

  const device = store.devices.find((d) => d.device_id === record.device_id);
  const officer = store.officers.find((o) => o.officer_id === record.officer_id);
  const anchor = store.anchors.find((a) => a.anchor_id === record.anchor_id) ?? null;
  const interval = intervalFor(record, store.anchors);
  const tampered = store.tamper.some((t) => t.record_id === record.record_id);

  const runProof = async () => {
    setProofBusy(true);
    setProofError(null);
    try {
      const res = await fetch(`/api/proof?record_id=${encodeURIComponent(record.record_id)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setProofError(data.error ?? "Could not build an inclusion proof");
        setProof(null);
      } else {
        setProof(data.proof);
      }
    } catch {
      setProofError("Could not reach the evidence service");
    } finally {
      setProofBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <aside
        role="dialog"
        aria-label={`Technical details for ${record.record_id}`}
        className="relative flex h-full w-full max-w-[560px] animate-fade-up flex-col border-l border-line bg-ink-850 shadow-lift"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <div className="label">Technical details</div>
            <div className="mono mt-1 text-[15px] font-semibold text-fg">{record.record_id}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <RecordTypePill type={record.type} />
              <RecordStatusPill status={record.status} />
              {tampered ? (
                <Pill tone="danger" icon={<AlertTriangle size={12} />}>
                  Altered in storage
                </Pill>
              ) : (
                <ImmutableBadge />
              )}
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1.5 text-fg-muted hover:bg-ink-750 hover:text-fg"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {tampered ? (
            <Callout tone="danger" title="This record no longer matches what was signed" icon={<AlertTriangle size={13} />}>
              The stored payload was edited after the record was signed. The signature below is over
              the original payload hash, so it will not verify.
            </Callout>
          ) : null}

          {/* --------------------------------------------------- identity */}
          <Panel className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              <Fingerprint size={13} /> Record identity
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <KeyValue k="Record ID">
                <span className="mono">{record.record_id}</span>
              </KeyValue>
              <KeyValue k="Record type">{RECORD_TYPE_TEXT[record.type]}</KeyValue>
              <KeyValue k="Case reference">
                <span className="mono">{record.case_ref}</span>
              </KeyValue>
              <KeyValue k="Position in case" hint="Counted from 1 within this case">
                <span className="mono">
                  {record.case_seq == null ? "—" : `#${record.case_seq}`}
                </span>
              </KeyValue>
              <KeyValue k="Sequence" hint="Monotonic counter, per device">
                <span className="mono">#{record.seq}</span>
              </KeyValue>
              <KeyValue k="Device ID" hint={device ? `${device.make} ${device.model}` : undefined}>
                <span className="mono">{record.device_id}</span>
              </KeyValue>
              <KeyValue k="Officer ID" hint={officer ? `${officer.name} · ${officer.force}` : undefined}>
                <span className="mono">{record.officer_id}</span>
              </KeyValue>
            </div>
          </Panel>

          {/* ------------------------------------------------------- time */}
          <Panel className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              <Clock size={13} /> Time
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="rounded-lg border border-warn/30 bg-warn/[0.06] px-3.5 py-3">
                <div className="label text-[#B45309]">Claimed time</div>
                <div className="mt-1 text-[19px] font-semibold tabular-nums text-fg">
                  {fmtTime(record.claimed_time)}
                </div>
                <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#B45309]">
                  Untrusted device clock
                </div>
                <div className="mt-1 text-[11.5px] text-fg-dim">{fmtDateTime(record.claimed_time)}</div>
              </div>
              <div
                className={cx(
                  "rounded-lg border px-3.5 py-3",
                  interval ? "border-ok/30 bg-ok/[0.06]" : "border-line bg-ink-800",
                )}
              >
                <div className={cx("label", interval && "text-[#15803D]")}>Trusted bound</div>
                <div className="mt-1 text-[19px] font-semibold tabular-nums text-fg">
                  {interval ? fmtInterval(interval.start, interval.end) : "—"}
                </div>
                <div
                  className={cx(
                    "mt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
                    interval ? "text-[#15803D]" : "text-fg-dim",
                  )}
                >
                  {interval ? "Anchored interval" : "Not yet anchored — time unproven"}
                </div>
                <div className="mt-1 text-[11.5px] leading-snug text-fg-dim">
                  {interval
                    ? "The record existed between the previous and the current anchor."
                    : "No timestamp authority has seen a tree containing this record."}
                </div>
              </div>
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-fg-dim">
              Relative order against other records on the same device is fixed by the local hash
              chain, independently of any clock.
            </p>
          </Panel>

          {/* ------------------------------------------------ cryptography */}
          <Panel className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              <Binary size={13} /> Cryptographic fields
            </div>
            <div className="space-y-3.5">
              <KeyValue k="Previous record in this case" hint="Hash of the preceding record of the SAME case">
                {record.case_prev_hash ? (
                  <HashChip value={record.case_prev_hash} full tone="neutral" />
                ) : (
                  <span className="text-[13px] text-fg-muted">
                    {record.case_seq == null ? "—" : "First record of this case"}
                  </span>
                )}
              </KeyValue>
              <KeyValue k="Previous hash" hint="Hash of the preceding record on this device">
                {record.prev_hash ? (
                  <HashChip value={record.prev_hash} full tone="neutral" />
                ) : (
                  <Pill tone="brand">Genesis — first record on this device</Pill>
                )}
              </KeyValue>
              <KeyValue k="Payload hash" hint="SHA-256 over the canonicalised payload">
                <HashChip value={record.payload_hash} full tone="info" />
              </KeyValue>
              <KeyValue
                k="Signature"
                hint={record.case_seq == null ? "ECDSA P-256 over payload_hash + prev_hash + seq" : "ECDSA P-256 over payload_hash + prev_hash + seq + case_ref + case position"}
              >
                <HashChip value={record.signature} full tone="sim" />
                <div className="mt-2">{DEMO_SIGNATURE_PILL}</div>
              </KeyValue>
            </div>
          </Panel>

          {/* ----------------------------------------------------- anchor */}
          <Panel className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              <Sigma size={13} /> Anchoring
            </div>
            {anchor ? (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  <KeyValue k="Anchor ID">
                    <span className="mono">{anchor.anchor_id}</span>
                  </KeyValue>
                  <KeyValue k="Tree size">
                    <span className="mono">{anchor.tree_size} leaves</span>
                  </KeyValue>
                  <KeyValue k="Tree head" className="col-span-2">
                    <HashChip value={anchor.tree_head} full tone="ok" />
                  </KeyValue>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {anchor.tsa.map((t) => (
                    <div
                      key={t.tsa_id}
                      className={cx(
                        "rounded-lg border px-3 py-2.5",
                        t.status === "verified"
                          ? "border-ok/30 bg-ok/[0.06]"
                          : "border-warn/35 bg-warn/[0.07]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-medium text-fg">{t.tsa_name}</span>
                        <Pill tone={t.status === "verified" ? "ok" : "warn"}>
                          {t.status === "verified" ? "Verified" : "Unavailable"}
                        </Pill>
                      </div>
                      <div className="mt-1 text-[11.5px] text-fg-dim">{t.trust_domain}</div>
                      {t.anchor_time ? (
                        <div className="mono mt-1.5 text-[11.5px] text-fg-muted">
                          {fmtTime(t.anchor_time)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div>
                  <Button size="sm" onClick={runProof} busy={proofBusy} icon={<GitBranch size={13} />}>
                    Generate inclusion proof
                  </Button>
                  {proofError ? (
                    <p className="mt-2 text-[12px] text-danger">{proofError}</p>
                  ) : null}
                  {proof ? (
                    <div className="mt-3 rounded-lg border border-line bg-ink-900/60 p-3">
                      <div className="flex items-center justify-between">
                        <span className="label">Inclusion proof</span>
                        <Pill tone={proof.verified ? "ok" : "danger"}>
                          {proof.verified ? "Proof verified" : "Proof failed"}
                        </Pill>
                      </div>
                      <div className="mt-2.5 space-y-2 text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="w-24 shrink-0 text-fg-dim">Leaf hash</span>
                          <HashChip value={proof.proof.leafHash} tone="info" />
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-24 shrink-0 pt-1 text-fg-dim">Siblings</span>
                          <div className="flex flex-wrap gap-1.5">
                            {proof.proof.path.length ? (
                              proof.proof.path.map((step, i) => (
                                <span key={i} className="inline-flex items-center gap-1">
                                  <span className="mono text-[10px] text-fg-dim">
                                    {step.side === "left" ? "L" : "R"}
                                  </span>
                                  <HashChip value={step.hash} />
                                </span>
                              ))
                            ) : (
                              <span className="text-fg-dim">
                                None — this leaf is the root of a single-leaf tree
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24 shrink-0 text-fg-dim">Root</span>
                          <HashChip value={proof.root} tone="ok" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-24 shrink-0 text-fg-dim">Index / size</span>
                          <span className="mono text-fg-muted">
                            {proof.proof.index} of {proof.proof.treeSize}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <Callout tone="warn" title="Not yet anchored">
                No timestamp authority has seen a tree containing this record. Its time is unproven
                until the next anchor.
              </Callout>
            )}
          </Panel>

          {/* ---------------------------------------------------- payload */}
          <Panel className="p-4">
            <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              <Link2 size={13} /> Payload
            </div>
            <PayloadView record={record} store={store} />
            <details className="mt-4">
              <summary className="cursor-pointer text-[12px] font-medium text-fg-muted hover:text-fg">
                Canonical JSON (the exact bytes that were hashed)
              </summary>
              <pre className="mono mt-2 max-h-72 overflow-auto rounded-lg border border-line bg-ink-900 p-3 text-[11.5px] leading-relaxed text-fg-muted">
                {JSON.stringify(JSON.parse(canonicalise(record.payload)), null, 2)}
              </pre>
            </details>
          </Panel>

          <div className="flex items-center gap-2 rounded-lg border border-line bg-ink-800/60 px-3.5 py-2.5 text-[12px] text-fg-dim">
            <ShieldCheck size={14} className="shrink-0" />
            Verification of this record runs on the Verification screen, against the live store.
          </div>
        </div>
      </aside>
    </div>
  );
}

const RECORD_TYPE_TEXT: Record<EvidenceRecord["type"], string> = {
  trigger: "s.43 trigger record",
  field_test: "Presumptive field-test record",
  handoff_transfer: "Custody handoff — transfer",
  handoff_receipt: "Custody handoff — receiving receipt",
};
