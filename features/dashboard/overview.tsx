"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Gauge, Minus, Thermometer, Weight } from "lucide-react";
import { Check, TriangleAlert, X } from "@/components/ui/icons";
import { useApp } from "@/components/providers/app-provider";
import { connectionKind, useHardware } from "@/components/providers/hardware-provider";
import { Button, ButtonLink, Panel, cx } from "@/components/ui/primitives";
import { RailIcon, type RailIconName } from "@/components/ui/rail-icon";
import { DemoBadge, SourceBadge, type SourceState } from "@/components/ui/badges";
import { TechnicalDetailsDrawer } from "@/components/ui/tech-drawer";
import { AssetImage } from "@/components/ui/asset-image";
import { ConnectionStatus } from "@/features/hardware/connection-status";
import { fmtTime } from "@/lib/format";
import { caseChain } from "@/lib/domain/records";
import { TTE_DEMO_COACH, TTE_DEMO_TRAIN } from "@/lib/tte/demo";
import type { CaseVerdict } from "@/app/api/verify/route";
import type { VerificationResult } from "@/lib/domain/verify";
import type { EvidenceRecord, ScreeningFlagPayload } from "@/lib/domain/types";

/* ------------------------------------------------------------ card chrome */

function CardHead({
  icon,
  title,
  right,
}: {
  icon: RailIconName;
  title: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-soft text-brand">
          <RailIcon name={icon} size={19} />
        </span>
        <h3 className="text-[16.5px] font-semibold leading-tight text-brand-deep">{title}</h3>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------- quick actions */

/** Orange marks the primary action; navy shades carry the rest. */
const ACTION_TONE = {
  primary: { well: "bg-accent-strong text-white", mark: "text-accent" },
  navy: { well: "bg-brand text-white", mark: "text-brand" },
  blue: { well: "bg-brand-mid text-white", mark: "text-brand-mid" },
  deep: { well: "bg-brand-deep text-white", mark: "text-brand-deep" },
} as const;

export function QuickActionTile({
  href,
  icon,
  title,
  body,
  tone,
  badge,
}: {
  href: string;
  icon: RailIconName;
  title: string;
  body: string;
  tone: keyof typeof ACTION_TONE;
  badge?: { text: string; danger?: boolean };
}) {
  const t = ACTION_TONE[tone];
  return (
    <Link
      href={href}
      className={cx(
        "panel hover-lift tap group relative flex min-h-[92px] items-center gap-3 overflow-hidden px-4 py-4 hover:shadow-lift",
        tone === "primary" && "border-accent/40 bg-accent-soft/60",
      )}
    >
      {/* Faint watermark of the same icon: texture, not information. */}
      <span aria-hidden="true" className={cx("pointer-events-none absolute -right-3 -top-2 opacity-[0.07]", t.mark)}>
        <RailIcon name={icon} size={92} strokeWidth={1.4} />
      </span>
      <span className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] shadow-chip", t.well)}>
        <RailIcon name={icon} size={24} />
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-[16px] font-semibold leading-snug text-brand-deep">{title}</span>
        <span className="mt-0.5 block text-[13.5px] leading-snug text-fg-muted">{body}</span>
        {badge ? (
          <span
            className={cx(
              "mt-1.5 inline-flex rounded-full border px-2 py-[1px] text-[11.5px] font-semibold",
              badge.danger
                ? "border-danger/30 bg-danger/[0.08] text-danger-ink"
                : "border-accent/40 bg-accent-soft text-accent-ink",
            )}
          >
            {badge.text}
          </span>
        ) : null}
      </span>
      <RailIcon
        name="chevron-right"
        size={18}
        className="relative -mr-1 shrink-0 text-fg-dim transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
      />
    </Link>
  );
}

/* ---------------------------------------------------------------- metrics */

export function MetricCard({
  icon,
  label,
  value,
  sub,
  subTone = "neutral",
  href,
  well = "sage",
}: {
  icon: RailIconName;
  label: string;
  value: React.ReactNode;
  sub: string;
  subTone?: "ok" | "gold" | "attention" | "neutral";
  href: string;
  well?: "sage" | "gold" | "terracotta";
}) {
  return (
    <Link href={href} className="panel hover-lift group flex items-start gap-3.5 px-4 py-4 hover:shadow-lift">
      <span
        className={cx(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]",
          well === "gold" && "bg-accent-soft text-accent-ink",
          well === "terracotta" && "bg-terracotta-soft text-sim-ink",
          well === "sage" && "bg-brand-soft text-brand",
        )}
      >
        <RailIcon name={icon} size={21} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-fg-muted">{label}</span>
        <span className="mt-0.5 block text-[28px] font-bold leading-none tracking-tight text-brand-deep tabular-nums">
          {value}
        </span>
        <span
          className={cx(
            "mt-1.5 flex items-center gap-1 text-[12.5px] font-medium",
            subTone === "ok" && "text-ok-ink",
            subTone === "gold" && "text-accent-ink",
            subTone === "attention" && "text-sim-ink",
            subTone === "neutral" && "text-fg-dim",
          )}
        >
          {subTone === "ok" ? <Check size={13} /> : subTone === "attention" ? <TriangleAlert size={12} /> : null}
          {sub}
        </span>
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------- PRAMAAN card */

function temperatureState(source: "potentiometer" | "thermal_camera" | null, value: number | null): SourceState {
  if (value === null || source === null) return "UNAVAILABLE";
  return source === "potentiometer" ? "SIMULATED" : "LIVE";
}

/**
 * The attached device, stated as it is: which inputs are live, which are
 * simulated, which are missing. Nothing on this card is ever a placeholder
 * value — an input without a reading shows a dash and says why.
 */
export function PramaanCard() {
  const hw = useHardware();
  const kind = connectionKind(hw.state, hw.transport);
  const connected = hw.state === "connected";
  const demo = kind === "demo";

  const weightState: SourceState = demo
    ? "DEMO"
    : connected && hw.weight.value !== null
      ? "LIVE"
      : "UNAVAILABLE";
  const tempState: SourceState = demo ? "DEMO" : connected ? temperatureState(hw.temperature.source, hw.temperature.value) : "UNAVAILABLE";

  const protocol = hw.isPramaan ? (hw.pramaan.protocol ?? "PRAMAAN-1") : hw.transport === "none" ? "—" : "evidence-chain-v1";
  const connection = hw.transport === "usb" ? "USB Serial" : hw.transport === "wifi" ? "Wi-Fi" : hw.transport === "demo" ? "In-browser demo" : "—";
  const faults = hw.capabilities.filter((c) => !c.available && !c.note);

  return (
    <Panel className="flex min-w-0 flex-col">
      <CardHead
        icon="pramaan"
        title={
          <>
            <span className="hidden 2xl:inline">Device Status </span>
            <span className="hidden font-normal text-fg-dim 2xl:inline">— </span>
            PRAMAAN
          </>
        }
        right={<ConnectionStatus size="sm" />}
      />
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="mx-auto aspect-[3/2] w-full max-w-[320px] overflow-hidden rounded-2xl border border-line bg-ink-750 sm:max-w-none">
          <AssetImage
            name="pramaanDevice"
            alt="The PRAMAAN evidence unit: load cell, status display, indicator lights and ACQUIRE buttons, with a phone mount"
            rounded={false}
            fit="cover"
            sizes="(min-width: 1280px) 260px, (min-width: 640px) 45vw, 320px"
          />
        </div>
        <dl className="grid grid-cols-1 content-start gap-2.5 text-[13px]">
          {[
            ["Device ID", hw.deviceId ?? "—"],
            ["Firmware", hw.firmware ?? "—"],
            ["Protocol", protocol],
            ["Connection", connection],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-fg-dim">{k}</dt>
              <dd className="mono truncate text-[13.5px] font-semibold text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2 xl:grid-cols-1 min-[1600px]:grid-cols-2">
        <ReadingTile
          icon={<Weight size={18} />}
          label={weightState === "UNAVAILABLE" ? "Weight" : "Weight (Load Cell)"}
          value={weightState !== "UNAVAILABLE" && hw.weight.value !== null ? `${hw.weight.value.toFixed(1)} g` : "—"}
          state={weightState}
          badge={<SourceBadge state={weightState} source={weightState === "UNAVAILABLE" ? undefined : "Load Cell"} />}
        />
        <ReadingTile
          icon={hw.temperature.source === "potentiometer" ? <Gauge size={18} /> : <Thermometer size={18} />}
          label={
            tempState === "UNAVAILABLE"
              ? "Temperature"
              : hw.temperature.source === "potentiometer"
                ? "Temperature (Potentiometer)"
                : "Temperature (Thermal)"
          }
          value={tempState !== "UNAVAILABLE" && hw.temperature.value !== null ? `${hw.temperature.value.toFixed(1)} °C` : "—"}
          state={tempState}
          badge={
            <SourceBadge
              state={tempState}
              source={
                tempState === "UNAVAILABLE"
                  ? undefined
                  : hw.temperature.source === "potentiometer"
                    ? "Potentiometer"
                    : "Thermal"
              }
            />
          }
          note={
            tempState === "SIMULATED"
              ? "Source: potentiometer — not a thermal sensor"
              : undefined
          }
        />
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line px-5 py-3.5">
        {connected ? (
          <ButtonLink href="/hardware" size="sm" icon={<RailIcon name="settings" size={16} />}>
            View Diagnostics
          </ButtonLink>
        ) : (
          <Button size="sm" variant="primary" icon={<RailIcon name="pramaan" size={16} />} onClick={() => void hw.connectPramaan()}>
            Connect PRAMAAN
          </Button>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-fg-muted">
          {!connected ? (
            <>
              <Minus size={13} /> No device attached
            </>
          ) : faults.length ? (
            <>
              <TriangleAlert size={13} className="text-sim" /> Check: {faults.map((f) => f.label).join(", ")}
            </>
          ) : (
            <>
              <Check size={13} className="text-ok" /> All reported inputs working
            </>
          )}
        </span>
      </div>
    </Panel>
  );
}

/**
 * One PRAMAAN reading. The tint follows the source, never the value: sage for a
 * live measurement, terracotta for a simulated input, plain for unavailable.
 */
function ReadingTile({
  icon,
  label,
  value,
  state,
  badge,
  note,
}: {
  /** No weight or dial exists in the supplied set; these match its stroke. */
  icon: React.ReactNode;
  label: string;
  value: string;
  state: SourceState;
  badge: React.ReactNode;
  note?: string;
}) {
  const tone =
    state === "LIVE"
      ? "border-ok/20 bg-ok-soft"
      : state === "SIMULATED" || state === "DEMO"
        ? "border-sim/20 bg-terracotta-soft/60"
        : "border-line bg-white";
  return (
    <div className={cx("min-w-0 rounded-2xl border px-3.5 py-3", tone)}>
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cx(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            state === "LIVE" ? "bg-white text-brand" : state === "UNAVAILABLE" ? "bg-ink-750 text-fg-dim" : "bg-white text-sim",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-medium leading-snug text-fg-muted">{label}</div>
          <div className={cx("mt-1 text-[24px] font-bold leading-none tabular-nums", state === "UNAVAILABLE" ? "text-fg-dim" : "text-fg")}>
            {value}
          </div>
        </div>
      </div>
      <div className="mt-2.5">{badge}</div>
      {note ? <div className="mt-1.5 text-[11.5px] leading-snug text-fg-muted">{note}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------- integrity card */

const CHECK_ROWS: { label: string; ids: string[] }[] = [
  { label: "Record contents", ids: ["payload_hash"] },
  { label: "Chain validation", ids: ["chain_linkage", "case_chain"] },
  { label: "Digital signatures", ids: ["signature"] },
  { label: "Merkle inclusion", ids: ["merkle_inclusion", "merkle_consistency"] },
  { label: "Timestamp anchor", ids: ["tsa_anchor"] },
  { label: "Handoff status", ids: ["handoff"] },
];

export function IntegrityCard({
  result,
  verdicts,
}: {
  result: VerificationResult | null;
  verdicts: CaseVerdict[] | null;
}) {
  const { store } = useApp();
  if (!store) return null;

  const broken = verdicts?.filter((v) => !v.verified) ?? [];
  const intact = Boolean(result && broken.length === 0);

  // "Latest sequence" is only meaningful inside a case: show the most recently
  // written case and its last position, rather than a number that means nothing.
  const lastRecord = store.records[store.records.length - 1] ?? null;
  const lastCaseLen = lastRecord ? caseChain(store.records, lastRecord.case_ref).length : 0;

  const statusOf = (ids: string[]) => {
    const checks = result?.checks.filter((c) => ids.includes(c.id)) ?? [];
    if (!checks.length) return "none" as const;
    if (checks.some((c) => c.status === "fail")) return "fail" as const;
    if (checks.some((c) => c.status === "degraded")) return "degraded" as const;
    if (checks.every((c) => c.status === "not_applicable")) return "none" as const;
    return "pass" as const;
  };

  return (
    <Panel className="relative flex min-w-0 flex-col overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 -right-6 text-brand opacity-[0.05]">
        <RailIcon name="lock" size={180} strokeWidth={1.2} />
      </span>
      <CardHead
        icon="shield"
        title="Evidence Integrity"
        right={
          !result ? null : intact ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/[0.10] px-2.5 py-1 text-[12px] font-semibold text-ok-ink">
              <Check size={13} /> Chain Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/[0.08] px-2.5 py-1 text-[12px] font-semibold text-danger-ink">
              <TriangleAlert size={13} /> Attention Required
            </span>
          )
        }
      />
      <div className="relative flex-1 px-5 py-4">
        {!result ? (
          <div className="space-y-2" aria-busy="true" aria-label="Checking every chain">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-5 animate-pulse rounded-md bg-ink-750" />
            ))}
          </div>
        ) : (
          <>
            <div
              className={cx(
                "flex items-start gap-3 rounded-[12px] border px-4 py-3",
                intact ? "border-ok/25 bg-ok-soft" : "border-danger/25 bg-danger/[0.06]",
              )}
            >
              <span
                className={cx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
                  intact ? "bg-ok" : "bg-danger",
                )}
              >
                {intact ? <Check size={17} strokeWidth={3} /> : <TriangleAlert size={16} />}
              </span>
              <div className="min-w-0">
                <div className={cx("text-[15px] font-semibold", intact ? "text-ok-ink" : "text-danger-ink")}>
                  {intact ? "Evidence chain verified" : `${broken.length} case${broken.length === 1 ? "" : "s"} need attention`}
                </div>
                <div className="text-[13px] leading-snug text-fg-muted">
                  {intact
                    ? "All records are valid and unchanged since signing."
                    : broken.map((b) => b.case_ref).join(", ")}
                </div>
              </div>
            </div>

            <dl className="mt-3 divide-y divide-line text-[13.5px]">
              <div className="flex items-center justify-between py-2">
                <dt className="text-fg-muted">Total records</dt>
                <dd className="font-semibold tabular-nums text-fg">{result.record_count}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-fg-muted">Latest sequence</dt>
                <dd className="truncate font-semibold tabular-nums text-fg">
                  {lastRecord ? (
                    <>
                      <span className="mono text-[12.5px] font-medium text-fg-muted">{lastRecord.case_ref}</span> · #{lastCaseLen}
                    </>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {CHECK_ROWS.map((row) => {
                const st = statusOf(row.ids);
                return (
                  <div key={row.label} className="flex items-center justify-between py-2">
                    <dt className="text-fg-muted">{row.label}</dt>
                    <dd
                      className={cx(
                        "inline-flex items-center gap-1.5 font-semibold",
                        st === "pass" && "text-ok-ink",
                        st === "fail" && "text-danger-ink",
                        st === "degraded" && "text-warn-ink",
                        st === "none" && "text-fg-dim",
                      )}
                    >
                      {st === "pass" ? <Check size={14} /> : st === "fail" ? <X size={14} /> : st === "degraded" ? <TriangleAlert size={13} /> : <Minus size={14} />}
                      {st === "pass" ? "Valid" : st === "fail" ? "Failed" : st === "degraded" ? "Degraded" : "Not applicable"}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </>
        )}
      </div>
      <div className="relative border-t border-line px-5 py-3.5">
        <TechnicalDetailsDrawer
          buttonVariant="navy"
          buttonSize="md"
          className="w-full"
          subtitle="Every check across the whole log, as the verifier computed it."
        >
          {result ? (
            <ul className="space-y-3">
              {result.checks.map((c) => (
                <li key={c.id} className="rounded-xl border border-line px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-fg">{c.label}</span>
                    <span className="mono text-[12px] text-fg-muted">{c.status}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{c.detail}</p>
                  {c.failures.slice(0, 3).map((f) => (
                    <p key={f.record_id + f.reason} className="mono mt-1 text-[12px] text-danger-ink">
                      {f.record_id}: {f.reason}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13.5px] text-fg-muted">Still checking…</p>
          )}
        </TechnicalDetailsDrawer>
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------- pending sync */

export function PendingSyncCard({ onSync, busy }: { onSync: () => void; busy: boolean }) {
  const { store } = useApp();
  if (!store) return null;
  const online = store.connectivity.online;
  const queued = store.records.filter((r) => r.status === "queued" || r.status === "captured");

  // One line per case, as the reference shows: case, count, latest capture.
  const byCase = new Map<string, EvidenceRecord[]>();
  for (const r of queued) byCase.set(r.case_ref, [...(byCase.get(r.case_ref) ?? []), r]);
  const rows = [...byCase.entries()].slice(0, 3);

  return (
    <Panel className="min-w-0">
      <CardHead
        icon="pending-sync"
        title="Pending Sync"
        right={
          <span
            className={cx(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-semibold",
              queued.length
                ? "border-gold/40 bg-gold-soft text-warn-ink"
                : "border-ok/30 bg-ok/[0.08] text-ok-ink",
            )}
          >
            {queued.length ? `${queued.length} record${queued.length === 1 ? "" : "s"}` : "All synced"}
          </span>
        }
      />
      <div className="px-5 py-4">
        {rows.length === 0 ? (
          <p className="flex items-center gap-2 rounded-2xl border border-ok/25 bg-ok/[0.06] px-4 py-3 text-[13.5px] text-fg-muted">
            <Check size={16} className="text-ok" />
            Everything captured has reached the server.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map(([caseRef, recs]) => {
              const latest = recs.reduce((a, b) => (a.claimed_time > b.claimed_time ? a : b));
              return (
                <li key={caseRef}>
                  <Link
                    href={`/cases/${caseRef}`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5 transition-colors hover:bg-ink-750"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-warn-ink">
                      <RailIcon name="cases" size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mono block truncate text-[13.5px] font-semibold text-fg">{caseRef}</span>
                      <span className="block text-[12px] text-fg-muted">
                        {recs.length} record{recs.length === 1 ? "" : "s"} · {online ? "Ready to sync" : "Captured offline"}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12px] text-fg-dim" title="Device time — not trusted time">
                      <RailIcon name="clock" size={13} />
                      {fmtTime(latest.claimed_time)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <Button
            variant="primary"
            icon={<RailIcon name="cloud" size={17} />}
            busy={busy}
            disabled={!online || !queued.length || busy}
            onClick={onSync}
            title={!online ? "Go online to sync" : !queued.length ? "Nothing to sync" : undefined}
          >
            Sync Now
          </Button>
          <ButtonLink href="/queue" icon={<ArrowRight size={16} />}>
            View Queue
          </ButtonLink>
        </div>
        {!online && queued.length ? (
          <p className="mt-2 text-[12.5px] text-fg-dim">Working offline — sync is available once you reconnect.</p>
        ) : null}
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------- TTE demo card */

export function TteDemoCard() {
  const { store } = useApp();
  if (!store) return null;
  const flags = store.records.filter((r) => r.type === "screening_flag");
  const last = flags[flags.length - 1];
  const lastSeat = last ? (last.payload as ScreeningFlagPayload).seat : null;

  return (
    <Panel className="min-w-0">
      <CardHead icon="tte" title="TTE Screening" right={<DemoBadge />} />
      <div className="px-5 py-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            ["Train", TTE_DEMO_TRAIN],
            ["Coach", TTE_DEMO_COACH],
            ["Flags", String(flags.length).padStart(2, "0")],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line bg-white px-3 py-2.5">
              <div className="text-[12px] text-fg-dim">{k}</div>
              <div className={cx("text-[20px] font-bold leading-tight tabular-nums", k === "Flags" && flags.length ? "text-sim-ink" : "text-fg")}>
                {v}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-fg-muted">
          {last
            ? `Last flag: seat ${lastSeat}, referred to RPF as a signed demo record.`
            : "Synthetic demonstration. No TTE hardware is connected."}
        </p>
        <ButtonLink href="/tte" className="mt-3 w-full" icon={<RailIcon name="train" size={16} />}>
          Open TTE Console
        </ButtonLink>
      </div>
    </Panel>
  );
}
