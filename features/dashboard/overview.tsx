"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus, TriangleAlert, X } from "lucide-react";
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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <RailIcon name={icon} size={19} />
        </span>
        <h3 className="text-[16.5px] font-semibold leading-tight text-fg">{title}</h3>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

/* ----------------------------------------------------------- quick actions */

const ACTION_TONE = {
  green: { well: "bg-brand text-white", mark: "text-brand" },
  terracotta: { well: "bg-terracotta text-white", mark: "text-terracotta" },
  gold: { well: "bg-gold text-white", mark: "text-gold" },
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
      className="panel hover-lift tap group relative flex min-h-[96px] items-center gap-4 overflow-hidden px-4 py-4 hover:shadow-lift sm:px-5"
    >
      {/* Faint watermark of the same icon: texture, not information. */}
      <span aria-hidden="true" className={cx("pointer-events-none absolute -right-3 -top-2 opacity-[0.07]", t.mark)}>
        <RailIcon name={icon} size={92} strokeWidth={1.4} />
      </span>
      <span className={cx("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-chip", t.well)}>
        <RailIcon name={icon} size={24} />
      </span>
      <span className="relative min-w-0">
        <span className="flex items-center gap-1.5 text-[16px] font-semibold text-fg sm:text-[17px]">
          {title}
          <ArrowRight
            size={16}
            className="text-fg-dim transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
          />
        </span>
        <span className="mt-0.5 block text-[13.5px] leading-snug text-fg-muted">{body}</span>
        {badge ? (
          <span
            className={cx(
              "mt-1.5 inline-flex rounded-full border px-2 py-[1px] text-[11.5px] font-semibold",
              badge.danger
                ? "border-danger/30 bg-danger/[0.08] text-[#93322A]"
                : "border-gold/40 bg-gold-soft text-[#855A14]",
            )}
          >
            {badge.text}
          </span>
        ) : null}
      </span>
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
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          well === "gold" && "bg-gold-soft text-[#855A14]",
          well === "terracotta" && "bg-terracotta-soft text-[#8E4331]",
          well === "sage" && "bg-brand-soft text-brand",
        )}
      >
        <RailIcon name={icon} size={21} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-fg-muted">{label}</span>
        <span className="mt-0.5 block text-[28px] font-bold leading-none tracking-tight text-fg tabular-nums">
          {value}
        </span>
        <span
          className={cx(
            "mt-1.5 flex items-center gap-1 text-[12.5px] font-medium",
            subTone === "ok" && "text-[#1F6A43]",
            subTone === "gold" && "text-[#855A14]",
            subTone === "attention" && "text-[#8E4331]",
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
      <div className="grid flex-1 gap-4 px-5 py-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-2xl border border-line bg-ink-750 sm:max-w-none">
          <AssetImage name="deviceEvidence" alt="The PRAMAAN evidence device beside a phone" rounded={false} />
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

      <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[12.5px] font-medium text-fg-muted">Weight</span>
            <SourceBadge state={weightState} source={weightState === "UNAVAILABLE" ? undefined : "Load Cell"} />
          </div>
          <div className={cx("mt-1.5 text-[26px] font-bold leading-none tabular-nums", weightState === "UNAVAILABLE" ? "text-fg-dim" : "text-fg")}>
            {weightState !== "UNAVAILABLE" && hw.weight.value !== null ? `${hw.weight.value.toFixed(1)} g` : "—"}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-[12.5px] font-medium text-fg-muted">Temperature</span>
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
          </div>
          <div className={cx("mt-1.5 text-[26px] font-bold leading-none tabular-nums", tempState === "UNAVAILABLE" ? "text-fg-dim" : "text-fg")}>
            {tempState !== "UNAVAILABLE" && hw.temperature.value !== null ? `${hw.temperature.value.toFixed(1)} °C` : "—"}
          </div>
        </div>
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/30 bg-ok/[0.10] px-2.5 py-1 text-[12px] font-semibold text-[#1F6A43]">
              <Check size={13} /> Chain Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sim/35 bg-terracotta-soft px-2.5 py-1 text-[12px] font-semibold text-[#8E4331]">
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
                "flex items-start gap-3 rounded-2xl border px-4 py-3",
                intact ? "border-ok/25 bg-ok/[0.07]" : "border-sim/30 bg-terracotta-soft/60",
              )}
            >
              <span
                className={cx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white",
                  intact ? "bg-ok" : "bg-sim",
                )}
              >
                {intact ? <Check size={17} strokeWidth={3} /> : <TriangleAlert size={16} />}
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-fg">
                  {intact ? "Evidence chain is intact" : `${broken.length} case${broken.length === 1 ? "" : "s"} need attention`}
                </div>
                <div className="text-[13px] leading-snug text-fg-muted">
                  {intact
                    ? "Every record still matches what was signed."
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
                        st === "pass" && "text-[#1F6A43]",
                        st === "fail" && "text-[#93322A]",
                        st === "degraded" && "text-[#855A14]",
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
          buttonVariant="secondary"
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
                    <p key={f.record_id + f.reason} className="mono mt-1 text-[12px] text-[#93322A]">
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
                ? "border-gold/40 bg-gold-soft text-[#855A14]"
                : "border-ok/30 bg-ok/[0.08] text-[#1F6A43]",
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
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-[#855A14]">
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
              <div className={cx("text-[20px] font-bold leading-tight tabular-nums", k === "Flags" && flags.length ? "text-[#8E4331]" : "text-fg")}>
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
