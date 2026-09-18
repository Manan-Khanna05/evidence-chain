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
import { AssetImage } from "@/components/ui/asset-image";
import { HelpTip } from "@/components/ui/help-tip";

const STAGES: { key: RecordStatus; label: string; blurb: string }[] = [
  { key: "captured", label: "Saved", blurb: "Signed and saved on the device" },
  { key: "queued", label: "Waiting to sync", blurb: "Safe on the device until online" },
  { key: "pushed", label: "Synced", blurb: "Received and checked by the server" },
  { key: "anchored", label: "Trusted time", blurb: "Inside a timestamped window" },
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
        eyebrow="Offline-first"
        title="Pending Sync"
        subtitle="No network? Keep working. Everything you capture is signed and saved on this device, then uploads in order when you are back online."
        status={<ConnectivityPill online={online} />}
        actions={
          <>
            <Button
              busy={busy === "conn"}
              icon={online ? <CloudOff size={15} /> : <UploadCloud size={15} />}
              onClick={() =>
                act("conn", "connectivity.set", { online: !online }, {
                  title: online ? "Working offline" : "Back online",
                  body: online
                    ? "New captures are saved safely on this device."
                    : "Records waiting to sync can now be uploaded.",
                })
              }
            >
              {online ? "Simulate offline (demo)" : "Simulate reconnect (demo)"}
            </Button>
            <Button
              variant="secondary"
              busy={busy === "push"}
              disabled={!online || waiting.length === 0}
              icon={<UploadCloud size={15} />}
              onClick={() =>
                act("push", "sync.push", undefined, {
                  title: "Sync complete",
                  body: "Records reached the server in order and were checked on arrival.",
                })
              }
            >
              Sync Now
            </Button>
            <Button
              variant="primary"
              busy={busy === "anchor"}
              disabled={!online}
              icon={<AnchorIcon size={15} />}
              onClick={() =>
                act("anchor", "anchor.create", undefined, {
                  title: "Anchored to trusted time",
                  body: "Two simulated time authorities timestamped the log.",
                })
              }
            >
              Anchor Now
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------- how sync works */}
      <Panel className="mb-5 overflow-hidden">
        <div className="grid items-center gap-6 p-5 md:grid-cols-[auto_minmax(0,1fr)] lg:p-6">
          <div className="mx-auto w-full max-w-[328px] md:w-[300px]">
            <AssetImage name="helpSync" alt="Laptop showing two records saved offline, then syncing to the cloud when connected" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[20px] font-semibold text-fg">How offline sync works</h2>
              <HelpTip term="pending-sync" />
            </div>
            <ol className="mt-4 space-y-3">
              {[
                ["Saved safely", "Each record is signed and chained on the device the moment you confirm it."],
                ["Waits for a connection", "Offline, records stay here. Their order is fixed by the chain, not by the clock."],
                ["Syncs when online", "Press Sync Now when you are connected. Nothing is lost or re-ordered."],
              ].map(([t, b], i) => (
                <li key={t} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold text-fg">{t}</span>
                    <span className="block text-[14px] leading-relaxed text-fg-muted">{b}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Panel>

      {/* ---------------------------------------------------- the pipeline */}
      <Panel className="mb-5">
        <PanelHead
          title="Where your records are"
          subtitle="Saved → waiting to sync → synced → trusted time"
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
                        tone === "warn" && "text-[#B45309]",
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
              title="Waiting on this device"
              subtitle={
                online
                  ? "You are online — press Sync Now to upload these."
                  : "Working offline — capture continues, nothing is lost."
              }
              icon={<CloudOff size={16} />}
              right={<Pill tone={waiting.length ? "warn" : "ok"}>{waiting.length} waiting</Pill>}
            />
            {waiting.length === 0 ? (
              <EmptyState
                icon={<Check size={22} />}
                title="Nothing is waiting to sync"
                body="Every record you captured has reached the server. Records captured while offline will wait here."
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
                <Callout tone="warn" title="Saved safely on this device">
                  These records are signed and chained. They cannot be reordered or backdated
                  silently — the sequence counter and the local hash chain fix their order
                  regardless of what the device clock says.
                </Callout>
              </div>
            ) : null}
          </Panel>

          <Panel className="min-w-0">
            <PanelHead
              title="Synced, waiting for trusted time"
              subtitle="On the server, but not yet inside a timestamped window. Press Anchor Now."
              icon={<UploadCloud size={16} />}
              right={<Pill tone={unanchored.length ? "warn" : "ok"}>{unanchored.length}</Pill>}
            />
            {unanchored.length === 0 ? (
              <EmptyState
                icon={<AnchorIcon size={22} />}
                title="Every synced record has trusted time"
                body="All records on the server sit inside a window timestamped by two (simulated) time authorities."
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
                    <span className="ml-auto text-[12px] font-medium text-[#B45309]">Waiting for anchor</span>
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
