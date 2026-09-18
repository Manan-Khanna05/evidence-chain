"use client";

import * as React from "react";
import { Clock3, TriangleAlert } from "lucide-react";
import { fmtTime, minutesBetween } from "@/lib/format";
import { cx } from "@/components/ui/primitives";

/**
 * The bounded trusted-time interval.
 *
 * A phone in aeroplane mode cannot know the time, so this system never claims a
 * creation instant. It claims an interval: the record is provably after the
 * previous anchor (it is not in that earlier tree) and provably before this one
 * (it is in this tree). Order within the interval comes from the local hash
 * chain, not from any clock.
 */
export function IntervalBar({
  claimed,
  start,
  end,
  compact = false,
}: {
  claimed: string;
  start: string | null;
  end: string | null;
  compact?: boolean;
}) {
  if (!end) {
    return (
      <div className="rounded-xl border border-warn/35 bg-warn/[0.07] px-4 py-3.5">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#B45309]">
          <TriangleAlert size={13} /> Not yet anchored — time unproven
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">
          The device clock reads{" "}
          <span className="mono tabular-nums text-fg">{fmtTime(claimed)}</span>, but nothing external
          has attested to it. Until the tree containing this record is anchored, no time claim is
          supported.
        </p>
      </div>
    );
  }

  const width = minutesBetween(start, end);
  const claimedOffset = (() => {
    if (!start) return 0.5;
    const total = new Date(end).getTime() - new Date(start).getTime();
    if (total <= 0) return 0.5;
    const at = new Date(claimed).getTime() - new Date(start).getTime();
    return Math.min(0.94, Math.max(0.06, at / total));
  })();

  return (
    <div className="rounded-xl border border-line bg-ink-850/70 p-4">
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-warn/30 bg-warn/[0.06] px-3.5 py-2.5">
          <div className="label text-[#B45309]">Claimed time</div>
          <div className="mt-1 text-[22px] font-semibold tabular-nums leading-none text-fg">
            {fmtTime(claimed)}
          </div>
          <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#B45309]">
            Untrusted device clock
          </div>
        </div>
        <div className="rounded-lg border border-ok/30 bg-ok/[0.06] px-3.5 py-2.5">
          <div className="label text-[#15803D]">Trusted bound</div>
          <div className="mt-1 text-[22px] font-semibold tabular-nums leading-none text-fg">
            {start ? `${fmtTime(start)} – ${fmtTime(end)}` : `≤ ${fmtTime(end)}`}
          </div>
          <div className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#15803D]">
            Anchored interval{width !== null ? ` · ${width} min` : ""}
          </div>
        </div>
      </div>

      {/* the interval itself */}
      <div className="px-1">
        <div className="relative h-16">
          <div className="absolute left-0 right-0 top-7 h-[3px] rounded-full bg-gradient-to-r from-ok/60 via-brand/50 to-ok/60" />
          <Endpoint side="left" time={start ? fmtTime(start) : "—"} label={start ? "Previous anchor" : "No lower bound"} />
          <Endpoint side="right" time={fmtTime(end)} label="This anchor" />

          <div
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${claimedOffset * 100}%` }}
          >
            <span className="mono rounded-md border border-warn/40 bg-warn/12 px-1.5 py-[1px] text-[10.5px] tabular-nums text-[#B45309]">
              {fmtTime(claimed)}
            </span>
            <span className="mt-1 h-4 w-px bg-warn/50" />
            <span className="h-2.5 w-2.5 rounded-full border-2 border-warn bg-ink-900" />
          </div>
        </div>

        <p className="mt-1 text-center text-[12px] leading-relaxed text-fg-muted">
          The record existed somewhere in this interval.
        </p>
      </div>

      {!compact ? (
        <div className="mt-4 flex gap-2.5 rounded-lg border border-line bg-ink-800/60 px-3.5 py-2.5">
          <Clock3 size={14} className="mt-[2px] shrink-0 text-fg-dim" />
          <p className="text-[12px] leading-relaxed text-fg-muted">
            Relative order is preserved by the local hash chain, independently of any clock. The
            interval width is exactly the gap between anchors — anchoring at every connectivity
            window narrows it to minutes; anchoring once per shift widens it to hours.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Endpoint({
  side,
  time,
  label,
}: {
  side: "left" | "right";
  time: string;
  label: string;
}) {
  return (
    <div
      className={cx(
        "absolute top-[18px] flex flex-col",
        side === "left" ? "left-0 items-start" : "right-0 items-end",
      )}
    >
      <span className="h-5 w-[2px] rounded bg-ok/70" />
      <span className="mono mt-1 text-[12px] font-semibold tabular-nums text-fg">{time}</span>
      <span className="text-[10.5px] uppercase tracking-[0.08em] text-fg-dim">{label}</span>
    </div>
  );
}
