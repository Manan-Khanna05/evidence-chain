"use client";

import * as React from "react";
import Link from "next/link";
import {
  Anchor as AnchorIcon,
  ArrowRight,
  Check,
  CloudOff,
  ListChecks,
  UploadCloud,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Button,
  ButtonLink,
  Callout,
  EmptyState,
  Panel,
  PanelHead,
  Pill,
  cx,
} from "@/components/ui/primitives";
import { ConnectivityPill, RecordStatusPill, RecordTypePill } from "@/components/ui/status";
import { fmtTime } from "@/lib/format";
import type { RecordStatus } from "@/lib/domain/types";
import { AnchorPanel } from "@/features/anchor/anchor-panel";

const STAGES: { key: RecordStatus; label: string; blurb: string }[] = [
  { key: "captured", label: "Captured", blurb: "Signed on the device" },
  { key: "queued", label: "Queued", blurb: "Waiting for connectivity" },
  { key: "pushed", label: "Pushed", blurb: "Accepted by the server" },
  { key: "anchored", label: "Anchored", blurb: "Covered by a timestamped tree" },
];

export default function QueuePage() {
  const { store, run } = useApp();
  const [busy, setBusy] = React.useState<string | null>(null);

  if (!store) return null;

  const online = store.connectivity.online;
  const counts: Record<RecordStatus, number> = {
    captured: store.records.filter((r) => r.status === "captured").length,
    queued: store.records.filter((r) => r.status === "queued").length,
    pushed: store.records.filter((r) => r.status === "pushed").length,
    anchored: store.records.filter((r) => r.status === "anchored").length,
  };
  const waiting = store.records
    .filter((r) => r.status === "queued" || r.status === "captured")
    .sort((a, b) => a.seq - b.seq);
  const unanchored = store.records.filter((r) => r.status === "pushed");

  const act = async (
    key: string,
    action: string,
    payload?: Record<string, unknown>,
    toast?: { title: string; body?: string },
  ) => {
    setBusy(key);
    await run(action, payload, { toast: toast ?? false });
    setBusy(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Device"
        title="Offline queue"
        subtitle="Capture never depends on connectivity. Records are signed and chained on the device, then pushed in sequence when a window appears."
        status={<ConnectivityPill online={online} />}
        actions={
          <>
            <Button
              busy={busy === "conn"}
              icon={online ? <CloudOff size={15} /> : <UploadCloud size={15} />}
              onClick={() =>
                act("conn", "connectivity.set", { online: !online }, {
                  title: online ? "Aeroplane mode" : "Connectivity restored",
                  body: online
                    ? "New captures will queue on the device."
                    : "Queued records can now be pushed.",
                })
              }
            >
              {online ? "Simulate offline" : "Simulate reconnect"}
            </Button>
            <Button
              variant="secondary"
              busy={busy === "push"}
              disabled={!online || waiting.length === 0}
              icon={<UploadCloud size={15} />}
              onClick={() =>
                act("push", "sync.push", undefined, {
                  title: "Queue pushed",
                  body: "Records were sent in sequence and validated on ingest.",
                })
              }
            >
              Push queue
            </Button>
            <Button
              variant="primary"
              busy={busy === "anchor"}
              disabled={!online}
              icon={<AnchorIcon size={15} />}
              onClick={() =>
                act("anchor", "anchor.create", undefined, {
                  title: "Tree head anchored",
                  body: "Two simulated authorities timestamped the current tree head.",
                })
              }
            >
              Anchor tree
            </Button>
          </>
        }
      />

      {/* ---------------------------------------------------- the pipeline */}
      <Panel className="mb-5">
        <PanelHead
          title="Record lifecycle"
          subtitle="captured → queued → pushed → anchored"
          icon={<ListChecks size={16} />}
        />
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          {STAGES.map((s, i) => {
            const n = counts[s.key];
            const tone =
              s.key === "anchored"
                ? "ok"
                : s.key === "pushed"
                  ? "info"
                  : n > 0
                    ? "warn"
                    : "neutral";
            return (
              <div key={s.key} className="relative">
                <div
                  className={cx(
                    "rounded-xl border px-4 py-3.5",
                    tone === "ok" && "border-ok/35 bg-ok/[0.06]",
                    tone === "info" && "border-info/30 bg-info/[0.06]",
                    tone === "warn" && "border-warn/40 bg-warn/[0.07]",
                    tone === "neutral" && "border-line bg-ink-850/60",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cx(
                        "text-[28px] font-semibold leading-none tabular-nums",
                        tone === "ok" && "text-ok",
                        tone === "info" && "text-info",
                        tone === "warn" && "text-warn",
                        tone === "neutral" && "text-fg-dim",
                      )}
                    >
                      {n}
                    </span>
                    <span className="mono text-[10.5px] text-fg-dim">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.1em] text-fg">
                    {s.label}
                  </div>
                  <div className="mt-0.5 text-[11.5px] leading-snug text-fg-dim">{s.blurb}</div>
                </div>
                {i < STAGES.length - 1 ? (
                  <ArrowRight
                    size={16}
                    className="absolute -right-[14px] top-1/2 hidden -translate-y-1/2 text-fg-dim xl:block"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Panel className="min-w-0">
            <PanelHead
              title="On-device queue"
              subtitle={
                online
                  ? "Connectivity is available; nothing should linger here."
                  : "Aeroplane mode — capture continues locally."
              }
              icon={<CloudOff size={16} />}
              right={<Pill tone={waiting.length ? "warn" : "ok"}>{waiting.length} waiting</Pill>}
            />
            {waiting.length === 0 ? (
              <EmptyState
                icon={<Check size={22} />}
                title="Nothing is waiting on a device"
                body="Every captured record has reached the server log. Going offline and capturing a record will fill this queue."
                action={
                  <ButtonLink href="/capture/trigger" size="sm">Capture a record</ButtonLink>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {waiting.map((r) => (
                  <li key={r.record_id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <span className="mono text-[12.5px] font-semibold text-fg">{r.record_id}</span>
                    <RecordTypePill type={r.type} />
                    <span className="mono text-[11.5px] text-fg-dim">seq #{r.seq}</span>
                    <Link
                      href={`/cases/${r.case_ref}`}
                      className="mono text-[12px] text-fg-muted hover:text-fg hover:underline"
                    >
                      {r.case_ref}
                    </Link>
                    <span className="ml-auto flex items-center gap-2">
                      <span className="mono text-[11.5px] tabular-nums text-fg-dim">
                        {fmtTime(r.claimed_time)}
                      </span>
                      <RecordStatusPill status={r.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {waiting.length && !online ? (
              <div className="border-t border-line p-5">
                <Callout tone="warn" title="Offline">
                  These records are signed and chained. They cannot be reordered or backdated
                  silently — the sequence counter and the local hash chain fix their order
                  regardless of what the device clock says.
                </Callout>
              </div>
            ) : null}
          </Panel>

          <Panel className="min-w-0">
            <PanelHead
              title="Accepted but not yet anchored"
              subtitle="In the server log and in the current tree, but no authority has timestamped that tree yet."
              icon={<UploadCloud size={16} />}
              right={<Pill tone={unanchored.length ? "warn" : "ok"}>{unanchored.length}</Pill>}
            />
            {unanchored.length === 0 ? (
              <EmptyState
                icon={<AnchorIcon size={22} />}
                title="All current records are covered by an anchor"
                body="Every record in the server log sits inside a tree that two simulated authorities have timestamped."
              />
            ) : (
              <ul className="divide-y divide-line">
                {unanchored.map((r) => (
                  <li key={r.record_id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <span className="mono text-[12.5px] font-semibold text-fg">{r.record_id}</span>
                    <RecordTypePill type={r.type} />
                    <Link
                      href={`/cases/${r.case_ref}`}
                      className="mono text-[12px] text-fg-muted hover:text-fg hover:underline"
                    >
                      {r.case_ref}
                    </Link>
                    <span className="ml-auto text-[11.5px] text-warn">Time unproven</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-5">
          <AnchorPanel store={store} />
          <Callout tone="info" title="Why the anchor cadence matters">
            The interval width equals the gap between anchors. Anchoring once per shift gives an
            eight-hour window; anchoring at every connectivity window gives minutes. That gap is the
            residual backdating window — a physical limit, not an engineering gap.
          </Callout>
        </div>
      </div>
    </>
  );
}
