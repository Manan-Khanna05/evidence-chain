"use client";

import * as React from "react";
import { ScrollText } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Callout, Panel, PanelHead, Pill, cx } from "@/components/ui/primitives";
import { fmtTime } from "@/lib/format";
import type { AuditEvent } from "@/lib/domain/types";

const TONE: Record<AuditEvent["category"], string> = {
  CASE: "border-brand/25 bg-brand/[0.06]",
  EVIDENCE: "border-ok/25 bg-ok/[0.06]",
  SYNC: "border-info/25 bg-info/[0.06]",
  VERIFICATION: "border-info/25 bg-info/[0.06]",
  HANDOFF: "border-warn/25 bg-warn/[0.06]",
  CERTIFICATE: "border-line bg-white",
  DEVICE: "border-line bg-white",
  DEMO: "border-sim/25 bg-sim/[0.06]",
};

/**
 * What the application did, as opposed to what was observed.
 *
 * These lines are not evidence: nothing here is signed, chained or part of a
 * case. They exist so an operator or a maintainer can see the sequence of
 * actions — and the panel says so plainly, so the two can never be confused.
 */
export function AuditTrail({ limit = 12 }: { limit?: number }) {
  const { store } = useApp();
  const events = [...(store?.audit ?? [])].reverse().slice(0, limit);

  return (
    <Panel className="min-w-0">
      <PanelHead
        title="Operational audit trail"
        subtitle="Actions taken in the application. Not evidence."
        icon={<ScrollText size={17} />}
        right={<Pill tone="neutral">{store?.audit?.length ?? 0} events</Pill>}
      />
      <div className="px-5 py-5">
        <Callout tone="neutral" title="This is not evidence">
          Audit lines record that the application did something, on the server clock. They carry no
          signature, no chain position and no place in any case. Evidence records are the signed,
          chained entries inside a case.
        </Callout>

        {events.length === 0 ? (
          <p className="mt-4 text-[14px] text-fg-muted">
            Nothing recorded yet. Open a case, capture something, or run a scenario.
          </p>
        ) : (
          <ul className="mt-4 space-y-1.5">
            {events.map((e) => (
              <li
                key={e.audit_id}
                className={cx("flex flex-wrap items-center gap-2 rounded-xl border px-3.5 py-2.5", TONE[e.category])}
              >
                <span className="mono text-[12px] tabular-nums text-fg-dim">{fmtTime(e.at)}</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-dim">
                  {e.category}
                </span>
                <span className="min-w-0 flex-1 text-[13.5px] text-fg">{e.summary}</span>
                {e.demo ? <Pill tone="sim">DEMO</Pill> : null}
                {e.officer_id ? (
                  <span className="mono text-[12px] text-fg-dim">{e.officer_id}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
