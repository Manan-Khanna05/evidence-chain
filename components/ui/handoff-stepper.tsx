"use client";

import * as React from "react";
import { RailIcon, type RailIconName } from "@/components/ui/rail-icon";
import { cx } from "@/components/ui/primitives";

/**
 * RPF → Transfer → Evidence Package → GRP → Receipt.
 *
 * Green = completed, orange = the step in progress, navy = still to come.
 * State is always carried in words as well as colour.
 */
export const HANDOFF_STEPS: { icon: RailIconName; title: string; body: string }[] = [
  { icon: "user", title: "RPF", body: "Seizing officer, Device A" },
  { icon: "handoff", title: "Transfer", body: "RPF signs: samples, seals, weight" },
  { icon: "lock", title: "Evidence Package", body: "Sealed packets move together" },
  { icon: "user", title: "GRP", body: "Receiving officer, Device B" },
  { icon: "certificates", title: "Receipt", body: "GRP checks and signs" },
];

export function HandoffStepper({
  current,
  className,
}: {
  /** Index of the step in progress; steps before it are complete. -1 = none started. 5 = all complete. */
  current: number;
  className?: string;
}) {
  return (
    <ol aria-label="Custody path" className={cx("grid gap-3 md:grid-cols-5 md:gap-2.5", className)}>
      {HANDOFF_STEPS.map((step, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li
            key={step.title}
            aria-current={state === "current" ? "step" : undefined}
            className={cx(
              "relative flex items-center gap-3 rounded-[12px] border bg-white px-3.5 py-3 md:flex-col md:items-start md:gap-2",
              state === "current" ? "border-accent shadow-[0_0_0_1px_rgba(245,124,32,0.5)]" : "border-line",
            )}
          >
            <span
              className={cx(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                state === "done" && "bg-ok text-white",
                state === "current" && "bg-accent text-white",
                state === "todo" && "bg-brand-soft text-brand",
              )}
            >
              <RailIcon name={state === "done" ? "check" : step.icon} size={18} strokeWidth={state === "done" ? 2.4 : 1.8} />
            </span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold text-brand-deep">{step.title}</span>
              <span className="block text-[12.5px] leading-snug text-fg-muted">{step.body}</span>
              <span
                className={cx(
                  "mt-1 inline-block text-[11.5px] font-semibold uppercase tracking-[0.06em]",
                  state === "done" && "text-ok-ink",
                  state === "current" && "text-accent-ink",
                  state === "todo" && "text-fg-dim",
                )}
              >
                {state === "done" ? "Completed" : state === "current" ? "In progress" : "Next"}
              </span>
            </span>
            {i < HANDOFF_STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute -bottom-[13px] left-[30px] z-[1] text-fg-dim md:-right-[13px] md:bottom-auto md:left-auto md:top-1/2 md:-translate-y-1/2"
              >
                <RailIcon name="chevron-right" size={16} className="rotate-90 md:rotate-0" />
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
