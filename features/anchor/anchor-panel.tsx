"use client";

import * as React from "react";
import { Anchor as AnchorIcon, Check, RefreshCw, ShieldOff, TriangleAlert } from "lucide-react";
import type { ClientStore } from "@/lib/domain/types";
import { fmtTime, minutesBetween } from "@/lib/format";
import { useApp } from "@/components/providers/app-provider";
import {
  Button,
  Callout,
  HashChip,
  Panel,
  PanelHead,
  Pill,
  SimulatedNote,
  cx,
} from "@/components/ui/primitives";

export function AnchorPanel({ store, compact = false }: { store: ClientStore; compact?: boolean }) {
  const { run } = useApp();
  const [busy, setBusy] = React.useState<string | null>(null);

  const latest = store.anchors[store.anchors.length - 1] ?? null;
  const pushedUnanchored = store.records.filter((r) => r.status === "pushed").length;
  const degraded = latest ? latest.tsa.some((t) => t.status === "unavailable") : false;
  const intervalWidth = latest ? minutesBetween(latest.interval_start, latest.interval_end) : null;

  const act = async (label: string, action: string, payload?: Record<string, unknown>, toast?: { title: string; body?: string }) => {
    setBusy(label);
    await run(action, payload, { toast: toast ?? false });
    setBusy(null);
  };

  return (
    <Panel>
      <PanelHead
        title="Trusted time anchoring"
        subtitle="Only a tree head leaves the system. A timestamp authority never sees a record."
        icon={<AnchorIcon size={16} />}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              busy={busy === "anchor"}
              icon={<AnchorIcon size={13} />}
              onClick={() =>
                act("anchor", "anchor.create", undefined, {
                  title: "Tree head anchored",
                  body: "Both simulated authorities were asked to timestamp the current tree head.",
                })
              }
            >
              {latest ? "Retry anchor" : "Anchor tree"}
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-5">
        {!latest ? (
          <Callout tone="warn" title="No anchor yet">
            Nothing in the log has been timestamped. Every record currently reads &ldquo;not yet
            anchored — time unproven&rdquo;.
          </Callout>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
              <div className="rounded-lg border border-line bg-ink-850/70 p-3.5">
                <div className="label">Merkle tree head</div>
                <div className="mt-1.5">
                  <HashChip value={latest.tree_head} full tone="ok" />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-fg-muted">
                  <span>
                    <span className="text-fg-dim">Anchor</span>{" "}
                    <span className="mono">{latest.anchor_id}</span>
                  </span>
                  <span>
                    <span className="text-fg-dim">Tree size</span>{" "}
                    <span className="mono">{latest.tree_size}</span>
                  </span>
                  <span>
                    <span className="text-fg-dim">Records covered</span>{" "}
                    <span className="mono">{latest.record_ids.length}</span>
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-line bg-ink-850/70 p-3.5">
                <div className="label">Anchor interval</div>
                <div className="mono mt-1.5 text-[19px] font-semibold tabular-nums text-fg">
                  {latest.interval_start
                    ? `${fmtTime(latest.interval_start)} – ${fmtTime(latest.interval_end)}`
                    : `≤ ${fmtTime(latest.interval_end)}`}
                </div>
                <div className="mt-1 text-[11.5px] text-fg-dim">
                  {intervalWidth !== null
                    ? `${intervalWidth} minutes wide — this is the residual backdating window`
                    : "No lower bound was established for the first anchor"}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {latest.tsa.map((t) => {
                const authority = store.tsa_authorities.find((a) => a.tsa_id === t.tsa_id);
                const up = t.status === "verified";
                return (
                  <div
                    key={t.tsa_id}
                    className={cx(
                      "rounded-lg border p-3.5",
                      up ? "border-ok/35 bg-ok/[0.06]" : "border-warn/40 bg-warn/[0.08]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold text-fg">{t.tsa_name}</div>
                        <div className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">
                          {t.trust_domain}
                        </div>
                      </div>
                      <Pill tone={up ? "ok" : "warn"} icon={up ? <Check size={11} /> : <TriangleAlert size={11} />}>
                        {up ? "Anchor verified" : "Unavailable"}
                      </Pill>
                    </div>
                    <div className="mt-3 space-y-1.5 text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-fg-dim">Time</span>
                        <span className="mono tabular-nums text-fg">
                          {t.anchor_time ? fmtTime(t.anchor_time) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-20 shrink-0 text-fg-dim">Token</span>
                        <HashChip value={t.token_signature} tone={up ? "ok" : "warn"} />
                      </div>
                    </div>
                    {!compact ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2.5 px-2"
                        busy={busy === t.tsa_id}
                        icon={authority?.available ? <ShieldOff size={12} /> : <RefreshCw size={12} />}
                        onClick={() =>
                          act(t.tsa_id, "tsa.availability", {
                            tsa_id: t.tsa_id,
                            available: !authority?.available,
                          }, {
                            title: authority?.available
                              ? `${t.tsa_name} taken offline`
                              : `${t.tsa_name} restored`,
                            body: authority?.available
                              ? "The next anchor will be written with a single authority and reported as degraded."
                              : "The next anchor will carry two independent tokens again.",
                          })
                        }
                      >
                        {authority?.available ? "Simulate outage" : "Restore authority"}
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {degraded ? (
              <Callout tone="warn" title="Degraded — one timestamp authority available" icon={<TriangleAlert size={13} />}>
                The anchor still holds: one authority attested to this tree head. Anchoring to two
                authorities in different trust domains is what answers the single-trusted-party
                objection, so restore the second and re-anchor before relying on this interval.
              </Callout>
            ) : null}

            {pushedUnanchored > 0 ? (
              <Callout tone="info" title={`${pushedUnanchored} record(s) accepted but not yet anchored`}>
                They are in the server log and in the current tree, but no authority has timestamped
                that tree yet. Their time is unproven until the next anchor.
              </Callout>
            ) : null}
          </>
        )}

        <SimulatedNote>
          These authorities are simulated. Nothing in this build contacts a real RFC 3161 service;
          tokens are signed locally with a demo key and labelled accordingly. The production design
          submits a hash — and only a hash — to two independent authorities.
        </SimulatedNote>
      </div>
    </Panel>
  );
}
