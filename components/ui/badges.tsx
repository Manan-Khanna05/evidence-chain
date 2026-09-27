"use client";

import * as React from "react";
import { cx } from "@/components/ui/primitives";

/**
 * Where a displayed value came from. Always shown next to a reading, so a
 * simulated or unavailable input can never pass for a live measurement.
 */
export type SourceState = "LIVE" | "SIMULATED" | "UNAVAILABLE" | "DEMO";

const SOURCE_STYLE: Record<SourceState, string> = {
  LIVE: "border-ok/30 bg-ok/[0.10] text-ok-ink",
  SIMULATED: "border-gold/40 bg-gold-soft text-warn-ink",
  UNAVAILABLE: "border-line-strong bg-ink-750 text-fg-muted",
  DEMO: "border-sim/35 bg-terracotta-soft text-sim-ink",
};

const SOURCE_MARK: Record<SourceState, string> = {
  LIVE: "●",
  SIMULATED: "◐",
  UNAVAILABLE: "—",
  DEMO: "◇",
};

export function SourceBadge({
  state,
  source,
  className,
}: {
  state: SourceState;
  /** The physical input, e.g. "Load Cell", "Potentiometer". */
  source?: string;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-[2px] text-[11px] font-bold tracking-[0.04em]",
        SOURCE_STYLE[state],
        className,
      )}
    >
      <span aria-hidden="true">{SOURCE_MARK[state]}</span>
      {state}
      {source ? <span className="font-semibold normal-case tracking-normal opacity-90">• {source}</span> : null}
    </span>
  );
}

/** The one marker every synthetic surface carries. */
export function DemoBadge({ label = "DEMO MODE", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-sim/35 bg-terracotta-soft px-2.5 py-[3px] text-[11px] font-bold tracking-[0.06em] text-sim-ink",
        className,
      )}
    >
      <span aria-hidden="true">◇</span>
      {label}
    </span>
  );
}
