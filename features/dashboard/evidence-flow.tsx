"use client";

import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Database,
  FileText,
  PenLine,
  Scale,
  Repeat,
} from "lucide-react";
import {
  Anchor,
  Camera,
  CloudUpload,
  FlaskConical,
} from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

export type FlowState = "done" | "active" | "pending" | "failed";

export interface FlowStep {
  key: string;
  label: string;
  caption: string;
  icon: React.ReactNode;
  state: FlowState;
}

/**
 * The eight stages a record passes through, end to end. This replaces a
 * separate architecture slide: each node is a real stage, and its state is
 * derived from the records in the store.
 */
export function EvidenceFlow({
  steps,
  onSelect,
}: {
  steps: FlowStep[];
  onSelect?: (key: string) => void;
}) {
  return (
    <ol className="grid grid-cols-4 gap-x-2 gap-y-6 md:grid-cols-8">
      {steps.map((s, i) => (
        <li key={s.key} className="relative flex flex-col items-center text-center">
          {i < steps.length - 1 ? (
            <ArrowRight
              aria-hidden="true"
              size={15}
              className={cx(
                "absolute -right-[9px] top-[22px] text-fg-dim/60",
                // On the 4-column layout, the arrow at the end of row one would point off the edge.
                i === 3 ? "hidden md:block" : "",
              )}
            />
          ) : null}
          <button
            type="button"
            onClick={() => onSelect?.(s.key)}
            aria-label={`${s.label}: ${s.caption} — ${s.state === "done" ? "done" : s.state === "active" ? "in progress" : s.state === "failed" ? "failed" : "not yet"}`}
            className={cx(
              "group relative flex h-[58px] w-[58px] items-center justify-center rounded-2xl border transition-all duration-200",
              s.state === "done" && "border-ok/25 bg-ok/[0.10] text-ok",
              s.state === "active" && "border-warn/30 bg-warn/[0.12] text-[#855A14]",
              s.state === "failed" && "border-danger/30 bg-danger/[0.10] text-danger",
              s.state === "pending" && "border-line-strong bg-white text-fg-dim",
              onSelect && "hover:-translate-y-0.5 hover:shadow-chip",
            )}
          >
            {s.icon}
            <span
              className={cx(
                "absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-white",
                s.state === "done" && "bg-ok text-white",
                s.state === "active" && "bg-warn text-white",
                s.state === "failed" && "bg-danger text-white",
                s.state === "pending" && "bg-ink-600 text-white",
              )}
            >
              {s.state === "done" ? (
                <CheckCircle2 size={11} strokeWidth={3} />
              ) : (
                <Circle size={8} strokeWidth={4} />
              )}
            </span>
          </button>
          <span className="mt-2.5 text-[13px] font-semibold text-fg">{s.label}</span>
          <span className="mt-0.5 text-[11.5px] leading-tight text-fg-dim">{s.caption}</span>
        </li>
      ))}
    </ol>
  );
}

export const FLOW_ICONS = {
  trigger: <Camera size={23} />,
  fieldTest: <FlaskConical size={23} />,
  signed: <PenLine size={23} />,
  queued: <Database size={23} />,
  pushed: <CloudUpload size={23} />,
  anchored: <Anchor size={23} />,
  handoff: <Repeat size={23} />,
  certificate: <FileText size={23} />,
  justice: <Scale size={23} />,
};
