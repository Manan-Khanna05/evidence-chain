"use client";

import * as React from "react";
import {
  Anchor as AnchorIcon,
  ArrowLeftRight,
  ChevronRight,
  Clock3,
  FileBadge,
  FlaskConical,
  GitCommitVertical,
  Radio,
  Sigma,
} from "lucide-react";
import { cx } from "@/components/ui/primitives";

export type PipelineNodeKey =
  | "trigger"
  | "field_test"
  | "chain"
  | "merkle"
  | "anchor"
  | "time"
  | "handoff"
  | "certificate";

const NODES: { key: PipelineNodeKey; label: string; icon: React.ReactNode }[] = [
  { key: "trigger", label: "Trigger", icon: <Radio size={14} /> },
  { key: "field_test", label: "Field test", icon: <FlaskConical size={14} /> },
  { key: "chain", label: "Hash chain", icon: <GitCommitVertical size={14} /> },
  { key: "merkle", label: "Merkle root", icon: <Sigma size={14} /> },
  { key: "anchor", label: "TSA ×2", icon: <AnchorIcon size={14} /> },
  { key: "time", label: "Bounded time", icon: <Clock3 size={14} /> },
  { key: "handoff", label: "Handoff", icon: <ArrowLeftRight size={14} /> },
  { key: "certificate", label: "s.63 certificate", icon: <FileBadge size={14} /> },
];

/**
 * The compact architecture strip. It replaces a separate architecture slide:
 * each node is the real stage a record passes through, and clicking one scrolls
 * to the section of the case that shows it.
 */
export function EvidencePipeline({
  states,
  active,
  onSelect,
}: {
  states: Partial<Record<PipelineNodeKey, "done" | "pending" | "failed">>;
  active?: PipelineNodeKey | null;
  onSelect?: (key: PipelineNodeKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {NODES.map((n, i) => {
        const state = states[n.key] ?? "pending";
        const isActive = active === n.key;
        return (
          <React.Fragment key={n.key}>
            <button
              type="button"
              onClick={() => onSelect?.(n.key)}
              className={cx(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-medium transition-all",
                state === "done" && "border-ok/35 bg-ok/10 text-[#236B45]",
                state === "failed" && "border-danger/45 bg-danger/12 text-[#8F352C]",
                state === "pending" && "border-line bg-ink-800 text-fg-dim",
                isActive && "ring-1 ring-brand/60",
                onSelect && "hover:border-brand/50 hover:text-fg",
              )}
              title={`${n.label} — ${state}`}
            >
              {n.icon}
              {n.label}
            </button>
            {i < NODES.length - 1 ? (
              <ChevronRight size={13} className="shrink-0 text-fg-dim" />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
