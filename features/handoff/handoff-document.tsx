"use client";

import * as React from "react";
import { ArrowRight, CircleDashed, PenLine } from "lucide-react";
import {
  Check,
  ShieldCheck,
  TriangleAlert,
  X,
} from "@/components/ui/icons";
import type {
  ClientStore,
  EvidenceRecord,
  Handoff,
  HandoffReceiptPayload,
  HandoffTransferPayload,
} from "@/lib/domain/types";
import { fmtTime } from "@/lib/format";
import { sealLabel } from "@/features/records/payload-view";
import { HashChip, KeyValue, Pill, cx } from "@/components/ui/primitives";
import { DEMO_SIGNATURE_PILL } from "@/components/ui/status";

/**
 * TRANSFEROR → TRANSFER → RECEIVER.
 *
 * The receipt cannot exist without the transfer record; sample count and seal
 * state are carried across and compared on both sides. A discrepancy is not
 * cosmetic — a two-versus-three sample count is the kind of failure Indian
 * appellate courts have called dispositive.
 */
export function HandoffDocument({
  store,
  handoff,
  transfer,
  receipt,
  onOpenRecord,
  print = false,
}: {
  store: ClientStore;
  handoff: Handoff;
  transfer: EvidenceRecord;
  receipt: EvidenceRecord | null;
  onOpenRecord?: (r: EvidenceRecord) => void;
  print?: boolean;
}) {
  const tp = transfer.payload as HandoffTransferPayload;
  const rp = receipt ? (receipt.payload as HandoffReceiptPayload) : null;
  const tamperedIds = new Set(store.tamper.map((t) => t.record_id));

  const sampleMismatch = rp ? rp.sample_count !== tp.sample_count : false;
  const sealMismatch = rp ? rp.seal_state !== tp.seal_state : false;
  const mismatch = sampleMismatch || sealMismatch;

  const officer = (id: string | null | undefined) =>
    store.officers.find((o) => o.officer_id === id) ?? null;
  const transferor = officer(tp.transferor_officer_id);
  const receiver = officer(rp?.receiving_officer_id ?? handoff.receiving_officer_id);
  const transferDevice = store.devices.find((d) => d.device_id === transfer.device_id);
  const receiptDevice = receipt
    ? store.devices.find((d) => d.device_id === receipt.device_id)
    : null;

  return (
    <div className="space-y-4">
      {/* -------------------------------------------------- state banner */}
      <div
        className={cx(
          "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3",
          mismatch
            ? "border-danger/50 bg-danger/[0.09]"
            : receipt
              ? "border-ok/45 bg-ok/[0.07]"
              : "border-warn/40 bg-warn/[0.07]",
        )}
      >
        {mismatch ? (
          <X size={20} className="text-danger" />
        ) : receipt ? (
          <ShieldCheck size={20} className="text-ok" />
        ) : (
          <CircleDashed size={19} className="text-warn" />
        )}
        <div className="min-w-0 flex-1">
          <div
            className={cx(
              "text-[15px] font-semibold uppercase tracking-tight",
              mismatch ? "text-danger" : receipt ? "text-ok" : "text-warn",
            )}
          >
            {mismatch
              ? "Transfer mismatch"
              : receipt
                ? "Two-party handoff verified"
                : "Awaiting GRP receipt"}
          </div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-muted">
            {mismatch
              ? "What was transferred and what was receipted do not agree. This is exactly the discrepancy that has shattered prosecutions on the record."
              : receipt
                ? "Both signatures verify independently, and the sample count and seal state carried across unchanged."
                : "The transfer record exists and is signed. A receiving receipt can only be created against it."}
          </p>
        </div>
        <span className="mono text-[12px] text-fg-dim">{handoff.handoff_id}</span>
      </div>

      {/* ------------------------------------------------- three columns */}
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
        <Party
          side="Transferor — RPF"
          tone="brand"
          officerName={transferor?.name ?? tp.transferor_officer_id}
          officerId={tp.transferor_officer_id}
          rank={transferor?.rank}
          empowerment={transferor?.ndps_empowerment}
          deviceId={transfer.device_id}
          deviceModel={transferDevice ? `${transferDevice.make} ${transferDevice.model}` : undefined}
          signature={transfer.signature}
          signedAt={transfer.claimed_time}
          recordId={transfer.record_id}
          tampered={tamperedIds.has(transfer.record_id)}
          onOpen={onOpenRecord ? () => onOpenRecord(transfer) : undefined}
        />

        {/* the transfer itself */}
        <div className="flex flex-col justify-center">
          <div
            className={cx(
              "rounded-xl border px-4 py-4 lg:w-[228px]",
              mismatch ? "border-danger/45 bg-danger/[0.07]" : "border-line bg-ink-850",
            )}
          >
            <div className="mb-3 flex items-center justify-center gap-2 text-fg-dim">
              <ArrowRight size={15} />
              <span className="label">Transfer</span>
              <ArrowRight size={15} />
            </div>
            <div className="space-y-3">
              <Carried
                label="Sample count"
                left={String(tp.sample_count).padStart(2, "0")}
                right={rp ? String(rp.sample_count).padStart(2, "0") : null}
                mismatch={sampleMismatch}
                big
              />
              <Carried
                label="Seal state"
                left={sealLabel(tp.seal_state)}
                right={rp ? sealLabel(rp.seal_state) : null}
                mismatch={sealMismatch}
              />
              <div>
                <div className="label">Case reference</div>
                <div className="mono mt-1 text-[13px] text-fg">{transfer.case_ref}</div>
              </div>
              <div>
                <div className="label">Seal marks</div>
                <div className="mono mt-1 text-[11.5px] leading-snug text-fg-muted">
                  {tp.seal_marks || "—"}
                </div>
              </div>
              <div>
                <div className="label">Transfer record</div>
                <div className="mono mt-1 text-[12px] text-fg-muted">{transfer.record_id}</div>
              </div>
              <div>
                <div className="label">Transfer payload hash</div>
                <div className="mt-1">
                  <HashChip value={transfer.payload_hash} tone={mismatch ? "danger" : "info"} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {receipt && rp ? (
          <Party
            side="Receiver — GRP"
            tone="ok"
            officerName={receiver?.name ?? rp.receiving_officer_id}
            officerId={rp.receiving_officer_id}
            rank={receiver?.rank}
            empowerment={receiver?.ndps_empowerment}
            deviceId={receipt.device_id}
            deviceModel={receiptDevice ? `${receiptDevice.make} ${receiptDevice.model}` : undefined}
            signature={receipt.signature}
            signedAt={receipt.claimed_time}
            recordId={receipt.record_id}
            tampered={tamperedIds.has(receipt.record_id)}
            onOpen={onOpenRecord ? () => onOpenRecord(receipt) : undefined}
            remarks={rp.remarks}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-ink-850/50 px-4 py-8 text-center">
            <PenLine size={22} className="mb-2.5 text-fg-dim" />
            <div className="text-[13.5px] font-semibold text-fg">Receiver — GRP</div>
            <p className="mt-1.5 max-w-[240px] text-[12px] leading-relaxed text-fg-muted">
              No receiving receipt yet. A GRP officer signs on a different device, against this
              transfer record.
            </p>
          </div>
        )}
      </div>

      {mismatch ? (
        <div className="rounded-lg border border-danger/40 bg-danger/[0.07] px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-danger">
            <TriangleAlert size={13} /> Carried values do not match
          </div>
          <ul className="mt-2 space-y-1 text-[12.5px] text-fg-muted">
            {sampleMismatch ? (
              <li>
                Sample count — <span className="mono text-fg">{tp.sample_count}</span> transferred,{" "}
                <span className="mono text-fg">{rp?.sample_count}</span> receipted.
              </li>
            ) : null}
            {sealMismatch ? (
              <li>
                Seal state — <span className="text-fg">{sealLabel(tp.seal_state)}</span> transferred,{" "}
                <span className="text-fg">{rp ? sealLabel(rp.seal_state) : "—"}</span> receipted.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {!print ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <KeyValue k="Article description">{tp.article_description || "—"}</KeyValue>
          <KeyValue k="Gross weight">{tp.gross_weight_g} g</KeyValue>
          <KeyValue k="Receiving post">{tp.receiving_post}</KeyValue>
          <KeyValue k="Elapsed to receipt">
            {handoff.created_at && handoff.received_at
              ? `${Math.max(0, Math.round((new Date(handoff.received_at).getTime() - new Date(handoff.created_at).getTime()) / 60000))} minutes`
              : "Not yet receipted"}
          </KeyValue>
        </div>
      ) : null}
    </div>
  );
}

function Party({
  side,
  tone,
  officerName,
  officerId,
  rank,
  empowerment,
  deviceId,
  deviceModel,
  signature,
  signedAt,
  recordId,
  tampered,
  onOpen,
  remarks,
}: {
  side: string;
  tone: "brand" | "ok";
  officerName: string;
  officerId: string;
  rank?: string;
  empowerment?: string[];
  deviceId: string;
  deviceModel?: string;
  signature: string;
  signedAt: string;
  recordId: string;
  tampered: boolean;
  onOpen?: () => void;
  remarks?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border p-4",
        tampered
          ? "border-danger/50 bg-danger/[0.07]"
          : tone === "brand"
            ? "border-brand/30 bg-brand/[0.05]"
            : "border-ok/30 bg-ok/[0.05]",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="label">{side}</span>
        {tampered ? (
          <Pill tone="danger" icon={<TriangleAlert size={11} />}>
            Altered
          </Pill>
        ) : (
          <Pill tone="ok" icon={<Check size={11} />}>
            Signature verifies
          </Pill>
        )}
      </div>

      <div className="text-[15px] font-semibold tracking-tight text-fg">{officerName}</div>
      <div className="mono mt-0.5 text-[12px] text-fg-muted">{officerId}</div>
      {rank ? <div className="mt-0.5 text-[12px] text-fg-dim">{rank}</div> : null}

      {empowerment && empowerment.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {empowerment.map((e) => (
            <Pill key={e} tone="neutral">
              {e}
            </Pill>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-2.5 border-t border-line pt-3.5 text-[12px]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-fg-dim">Device</span>
          <span className="mono text-right text-fg">
            {deviceId}
            {deviceModel ? <span className="block text-[11px] text-fg-dim">{deviceModel}</span> : null}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-fg-dim">Signed at</span>
          <span className="mono tabular-nums text-fg-muted">
            {fmtTime(signedAt)}
            <span className="ml-1.5 text-[10px] uppercase tracking-[0.08em] text-fg-dim">claimed</span>
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-fg-dim">Signature</span>
          <HashChip value={signature} tone={tampered ? "danger" : "sim"} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-fg-dim">Record</span>
          {onOpen ? (
            <button
              onClick={onOpen}
              className="mono text-[12px] text-fg-muted underline-offset-2 hover:text-fg hover:underline"
            >
              {recordId}
            </button>
          ) : (
            <span className="mono text-fg-muted">{recordId}</span>
          )}
        </div>
      </div>

      {remarks ? (
        <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-fg-muted">
          {remarks}
        </p>
      ) : null}

      <div className="mt-3">{DEMO_SIGNATURE_PILL}</div>
    </div>
  );
}

function Carried({
  label,
  left,
  right,
  mismatch,
  big,
}: {
  label: string;
  left: string;
  right: string | null;
  mismatch: boolean;
  big?: boolean;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span
          className={cx(
            "mono font-semibold",
            big ? "text-[22px]" : "text-[13px]",
            mismatch ? "text-danger" : "text-fg",
          )}
        >
          {left}
        </span>
        {right !== null ? (
          <>
            <ArrowRight size={13} className={mismatch ? "text-danger" : "text-fg-dim"} />
            <span
              className={cx(
                "mono font-semibold",
                big ? "text-[22px]" : "text-[13px]",
                mismatch ? "text-danger" : "text-ok",
              )}
            >
              {right}
            </span>
          </>
        ) : (
          <span className="text-[11.5px] text-fg-dim">awaiting receipt</span>
        )}
      </div>
    </div>
  );
}
