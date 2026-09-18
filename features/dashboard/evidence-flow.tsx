"use client";

import * as React from "react";
import {
  Anchor,
  ArrowRight,
  Camera,
  CheckCircle2,
  Circle,
  CloudUpload,
  Database,
  FileText,
  FlaskConical,
  PenLine,
  Scale,
  Repeat,
} from "lucide-react";
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
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <ol className="flex min-w-[860px] items-start gap-1">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <li className="flex flex-1 flex-col items-center text-center">
              <button
                type="button"
                onClick={() => onSelect?.(s.key)}
                className={cx(
                  "group relative flex h-[58px] w-[58px] items-center justify-center rounded-2xl border transition-all duration-200",
                  s.state === "done" && "border-ok/25 bg-ok/[0.10] text-ok",
                  s.state === "active" && "border-warn/30 bg-warn/[0.12] text-warn",
                  s.state === "failed" && "border-danger/30 bg-danger/[0.10] text-danger",
                  s.state === "pending" && "border-line-strong bg-white/70 text-fg-dim",
                  onSelect && "hover:-translate-y-0.5 hover:shadow-chip",
                )}
                title={`${s.label} — ${s.state}`}
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
              <span className="mt-2.5 text-[12.5px] font-semibold text-fg">{s.label}</span>
              <span className="mt-0.5 text-[11px] leading-tight text-fg-dim">{s.caption}</span>
            </li>
            {i < steps.length - 1 ? (
              <li aria-hidden className="mt-[22px] shrink-0 px-0.5">
                <ArrowRight size={15} className="text-fg-dim/60" />
              </li>
            ) : null}
          </React.Fragment>
        ))}
      </ol>
    </div>
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
