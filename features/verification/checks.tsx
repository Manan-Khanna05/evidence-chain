"use client";

import * as React from "react";
import { CircleDashed, Minus } from "lucide-react";
import { Check, TriangleAlert, X } from "@/components/ui/icons";
import type { CheckResult, VerificationResult } from "@/lib/domain/verify";
import { HashChip, Pill, cx } from "@/components/ui/primitives";
import { fmtTime } from "@/lib/format";

const ICONS: Record<CheckResult["status"], React.ReactNode> = {
  pass: <Check size={14} />,
  fail: <X size={14} />,
  degraded: <TriangleAlert size={13} />,
  not_applicable: <Minus size={13} />,
};

const STYLES: Record<CheckResult["status"], string> = {
  pass: "border-ok/35 bg-ok/[0.06] text-ok",
  fail: "border-danger/45 bg-danger/[0.09] text-danger",
  degraded: "border-warn/40 bg-warn/[0.08] text-warn",
  not_applicable: "border-line bg-ink-800 text-fg-dim",
};

export function CheckList({ result }: { result: VerificationResult }) {
  return (
    <ul className="divide-y divide-line">
      {result.checks.map((c) => (
        <li key={c.id} className="flex gap-3.5 px-5 py-3.5">
          <span
            className={cx(
              "mt-[2px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
              STYLES[c.status],
            )}
            aria-hidden
          >
            {ICONS[c.status]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13.5px] font-semibold text-fg">{c.label}</span>
              <Pill
                tone={
                  c.status === "pass"
                    ? "ok"
                    : c.status === "fail"
                      ? "danger"
                      : c.status === "degraded"
                        ? "warn"
                        : "neutral"
                }
              >
                {c.status === "not_applicable" ? "Not applicable" : c.status}
              </Pill>
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{c.detail}</p>
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-fg-dim">{c.description}</p>

            {c.failures.length ? (
              <ul className="mt-2.5 space-y-1.5">
                {c.failures.slice(0, 5).map((f, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-danger/30 bg-danger/[0.07] px-3 py-2 text-[12px] leading-relaxed"
                  >
                    <span className="mono font-semibold text-[#93322A]">{f.record_id}</span>
                    <span className="mx-1.5 text-fg-dim">—</span>
                    <span className="text-fg-muted">{f.reason}</span>
                  </li>
                ))}
                {c.failures.length > 5 ? (
                  <li className="text-[11.5px] text-fg-dim">
                    …and {c.failures.length - 5} more
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The large, unmistakable verdict. Readable across a room. */
export function Verdict({
  result,
  scopeLabel,
  size = "lg",
}: {
  result: VerificationResult | null;
  scopeLabel: string;
  size?: "lg" | "xl";
}) {
  if (!result) {
    return (
      <div className="flex items-center gap-3 px-6 py-10 text-fg-muted">
        <CircleDashed size={18} className="animate-spin" />
        <span className="text-[13.5px]">Re-walking the chain…</span>
      </div>
    );
  }

  const good = result.verified;
  const degraded = result.degraded;

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-xl border px-6 py-7",
        good
          ? degraded
            ? "border-warn/45 bg-warn/[0.07]"
            : "border-ok/45 bg-ok/[0.07]"
          : "border-danger/50 bg-danger/[0.09]",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
        <div
          className={cx(
            "flex shrink-0 items-center justify-center rounded-2xl border-2",
            size === "xl" ? "h-20 w-20" : "h-16 w-16",
            good
              ? degraded
                ? "border-warn/60 bg-warn/15 text-warn"
                : "border-ok/60 bg-ok/15 text-ok"
              : "border-danger/60 bg-danger/15 text-danger",
          )}
        >
          {good ? <Check size={size === "xl" ? 44 : 34} strokeWidth={3} /> : <X size={size === "xl" ? 44 : 34} strokeWidth={3} />}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={cx(
              "font-semibold uppercase leading-none tracking-tight",
              size === "xl" ? "text-[42px]" : "text-[30px]",
              good ? (degraded ? "text-warn" : "text-ok") : "text-danger",
            )}
          >
            {good ? "Chain verified" : "Chain broken"}
          </div>
          <div className="mt-2 text-[13.5px] text-fg-muted">
            {scopeLabel} · {result.record_count} record{result.record_count === 1 ? "" : "s"} ·{" "}
            {result.anchored_count} anchored · checked {fmtTime(result.ran_at)}
          </div>
          {degraded && good ? (
            <div className="mt-2 text-[13px] font-medium text-warn">
              Degraded — one timestamp authority is unavailable. The chain still verifies.
            </div>
          ) : null}
        </div>

        <div className="flex min-w-[220px] flex-col gap-1.5 text-[12px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-fg-dim">Tree head</span>
            <HashChip value={result.tree_head} tone={good ? "ok" : "danger"} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-fg-dim">Tree size</span>
            <span className="mono text-fg-muted">{result.tree_size} leaves</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-fg-dim">Latest anchor</span>
            <span className="mono tabular-nums text-fg-muted">
              {result.latest_anchor_time ? fmtTime(result.latest_anchor_time) : "—"}
            </span>
          </div>
        </div>
      </div>

      {!good && result.broken_record_id ? (
        <div className="mt-5 rounded-lg border border-danger/40 bg-ink-900/60 px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-danger">
            Broken record
          </div>
          <div className="mono mt-1 text-[20px] font-semibold text-fg">
            {result.broken_record_id}
          </div>
          <div className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
            {result.broken_reason}
          </div>
        </div>
      ) : null}
    </div>
  );
}
