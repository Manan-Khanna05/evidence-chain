"use client";

import * as React from "react";
import { ArrowDown, GitCommitVertical, Sigma } from "lucide-react";
import { AlertTriangle } from "@/components/ui/icons";
import type { ClientStore, EvidenceRecord } from "@/lib/domain/types";
import { HashChip, Pill, cx } from "@/components/ui/primitives";
import { RECORD_TYPE_META } from "@/components/ui/status";
import { fmtTime } from "@/lib/format";

/**
 * Hash-Chained Evidence Log — deliberately not a blockchain visualisation.
 * There are no blocks, miners, nodes or consensus here: each record carries the
 * hash of the one before it on the same device, and the server's Merkle tree
 * sits above the whole log.
 */
export function ChainView({
  records,
  store,
  onOpenRecord,
  treeHead,
}: {
  records: EvidenceRecord[];
  store: ClientStore;
  onOpenRecord: (r: EvidenceRecord) => void;
  treeHead?: string | null;
}) {
  const tamperedIds = new Set(store.tamper.map((t) => t.record_id));
  const byDevice = new Map<string, EvidenceRecord[]>();
  for (const r of records) {
    const list = byDevice.get(r.device_id) ?? [];
    list.push(r);
    byDevice.set(r.device_id, list);
  }
  for (const list of byDevice.values()) list.sort((a, b) => a.seq - b.seq);

  return (
    <div className="space-y-6">
      {[...byDevice.entries()].map(([deviceId, list]) => (
        <div key={deviceId}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <GitCommitVertical size={14} className="text-fg-dim" />
            <span className="label">Device chain</span>
            <span className="mono text-[12.5px] text-fg">{deviceId}</span>
            <span className="text-[11.5px] text-fg-dim">
              {list.length} record{list.length === 1 ? "" : "s"} · prev_hash links each to the one
              before it
            </span>
          </div>

          <div className="space-y-0">
            {list.map((r, i) => {
              const meta = RECORD_TYPE_META[r.type];
              const broken = tamperedIds.has(r.record_id);
              const nextBroken = i > 0 && tamperedIds.has(list[i - 1].record_id);
              return (
                <div key={r.record_id}>
                  {i > 0 ? (
                    <div className="flex items-center gap-2 py-1.5 pl-5">
                      <ArrowDown
                        size={13}
                        className={nextBroken ? "text-danger" : "text-fg-dim"}
                      />
                      <span
                        className={cx(
                          "mono text-[11px]",
                          nextBroken ? "text-danger" : "text-fg-dim",
                        )}
                      >
                        prev_hash
                      </span>
                      <HashChip value={r.prev_hash} tone={nextBroken ? "danger" : "neutral"} />
                      {nextBroken ? (
                        <span className="text-[11.5px] font-medium text-danger">
                          link no longer reproduces
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    className={cx(
                      "flex w-full flex-col gap-2 rounded-xl border px-4 py-3 transition-colors",
                      broken
                        ? "border-danger/50 bg-danger/[0.08]"
                        : "border-line bg-ink-800 hover:border-line-strong",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono text-[10.5px] text-fg-dim">
                        seq #{String(r.seq).padStart(2, "0")}
                      </span>
                      <button
                        onClick={() => onOpenRecord(r)}
                        className="mono text-[13px] font-semibold text-fg underline-offset-2 transition-colors hover:text-brand hover:underline"
                        title="View technical details"
                      >
                        {r.record_id}
                      </button>
                      <Pill tone={meta.tone} icon={meta.icon}>
                        {meta.label}
                      </Pill>
                      {broken ? (
                        <Pill tone="danger" icon={<AlertTriangle size={11} />}>
                          Altered
                        </Pill>
                      ) : null}
                      <span className="mono ml-auto text-[11.5px] tabular-nums text-fg-dim">
                        {fmtTime(r.claimed_time)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px]">
                      <span className="flex items-center gap-1.5">
                        <span className="text-fg-dim">payload_hash</span>
                        <HashChip value={r.payload_hash} tone={broken ? "danger" : "info"} />
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-fg-dim">signature</span>
                        <HashChip value={r.signature} tone={broken ? "danger" : "sim"} />
                      </span>
                      <button
                        onClick={() => onOpenRecord(r)}
                        className="ml-auto text-[11.5px] text-fg-dim underline-offset-2 transition-colors hover:text-fg hover:underline"
                      >
                        View technical details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {treeHead ? (
        <div className="rounded-xl border border-ok/35 bg-ok/[0.07] px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Sigma size={15} className="text-ok" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-fg">
              Merkle tree head
            </span>
            <span className="ml-auto">
              <HashChip value={treeHead} tone="ok" />
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-fg-muted">
            Every record in the server log is a leaf of this tree. Only this value — not the records —
            is sent to a timestamp authority.
          </p>
        </div>
      ) : null}
    </div>
  );
}
