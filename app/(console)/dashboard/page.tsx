"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Anchor as AnchorIcon,
  ArrowLeftRight,
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  CircleDashed,
  Clock,
  CloudUpload,
  Cpu,
  Database,
  FileBadge,
  FileText,
  FlaskConical,
  FolderOpen,
  MonitorPlay,
  Repeat,
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  Wifi,
  WifiOff,
  Workflow,
  X,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import {
  Button,
  ButtonLink,
  EmptyState,
  HashChip,
  IconContainer,
  Panel,
  PanelHead,
  Pill,
  ProgressRail,
  Stat,
  cx,
  type Tone,
} from "@/components/ui/primitives";
import { RecordStatusPill, RecordTypePill } from "@/components/ui/status";
import { AssetImage } from "@/components/ui/asset-image";
import { HelpTip } from "@/components/ui/help-tip";
import { TechnicalDetailsDrawer } from "@/components/ui/tech-drawer";
import { EvidenceFlow, FLOW_ICONS, type FlowState } from "@/features/dashboard/evidence-flow";
import { DeviceStatusCard } from "@/features/hardware/device-status-card";
import { summariseAll } from "@/lib/domain/status";
import { fmtInterval, fmtRelative } from "@/lib/format";
import type { AssetKey } from "@/lib/assets";
import type { CaseVerdict } from "@/app/api/verify/route";
import type { VerificationResult } from "@/lib/domain/verify";

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function DashboardPage() {
  const { store, verifyAllCases, run, officer, session } = useApp();
  const router = useRouter();
  const [verdicts, setVerdicts] = React.useState<CaseVerdict[] | null>(null);
  const [global, setGlobal] = React.useState<VerificationResult | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [hello, setHello] = React.useState("Welcome");

  // Time of day is read on the client only, so server and client render agree.
  React.useEffect(() => setHello(greeting()), []);

  const stamp = store
    ? `${store.records.length}:${store.anchors.length}:${store.tamper.length}:${store.certificates.length}`
    : "";

  React.useEffect(() => {
    let alive = true;
    void verifyAllCases().then((r) => {
      if (!alive || !r) return;
      setVerdicts(r.cases);
      setGlobal(r.result);
    });
    return () => {
      alive = false;
    };
  }, [verifyAllCases, stamp]);

  if (!store) return null;

  const summaries = summariseAll(store);

  const verifiedCount = verdicts ? verdicts.filter((v) => v.verified).length : 0;
  const brokenCases = verdicts ? verdicts.filter((v) => !v.verified) : [];
  const allVerify = Boolean(verdicts && brokenCases.length === 0);
  const pct = verdicts && verdicts.length ? (verifiedCount / verdicts.length) * 100 : 0;

  const pendingHandoffs = summaries.filter(
    (s) => s.handoff_status === "awaiting_receipt" || s.handoff_status === "transfer_created",
  );
  const queuedRecords = store.records.filter(
    (r) => r.status === "queued" || r.status === "captured",
  );
  const unanchored = store.records.filter((r) => r.status === "pushed");
  const certificatesReady = summaries.filter((s) => s.certificate_ready && !s.has_certificate);
  const latestAnchor = store.anchors[store.anchors.length - 1] ?? null;
  const online = store.connectivity.online;

  /* Recent activity: the newest records by device claim, newest first. */
  const recentRecords = [...store.records]
    .sort((a, b) => (a.claimed_time < b.claimed_time ? 1 : -1))
    .slice(0, 6);

  /* Every flow state is derived from the store; none of it is hardcoded. */
  const has = (t: string) => store.records.some((r) => r.type === t);
  const st = (done: boolean, active = false): FlowState =>
    done ? "done" : active ? "active" : "pending";

  const flowSteps = [
    { key: "trigger", label: "Trigger", caption: "s.43 Captured", icon: FLOW_ICONS.trigger, state: st(has("trigger")) },
    { key: "field_test", label: "Field Test", caption: "Presumptive", icon: FLOW_ICONS.fieldTest, state: st(has("field_test")) },
    { key: "signed", label: "Signed", caption: "On Device", icon: FLOW_ICONS.signed, state: st(store.records.length > 0) },
    {
      key: "queued",
      label: "Saved",
      caption: "Pending Sync",
      icon: FLOW_ICONS.queued,
      state: (queuedRecords.length ? "active" : "done") as FlowState,
    },
    {
      key: "pushed",
      label: "Synced",
      caption: "To Server",
      icon: FLOW_ICONS.pushed,
      state: st(store.records.some((r) => r.status === "pushed" || r.status === "anchored")),
    },
    {
      key: "anchored",
      label: "Anchored",
      caption: "Trusted Time",
      icon: FLOW_ICONS.anchored,
      state: st(store.anchors.length > 0, unanchored.length > 0),
    },
    {
      key: "handoff",
      label: "Handoff",
      caption: "RPF → GRP",
      icon: FLOW_ICONS.handoff,
      state: store.handoffs.some((h) => h.status === "mismatch")
        ? ("failed" as FlowState)
        : st(store.handoffs.some((h) => h.status === "verified"), pendingHandoffs.length > 0),
    },
    {
      key: "certificate",
      label: "Certificate",
      caption: "Section 63",
      icon: FLOW_ICONS.certificate,
      state: st(store.certificates.length > 0, certificatesReady.length > 0),
    },
  ];

  const flowTargets: Record<string, string> = {
    trigger: "/capture/trigger",
    field_test: "/capture/field-test",
    signed: "/queue",
    queued: "/queue",
    pushed: "/queue",
    anchored: "/queue",
    handoff: "/handoff",
    certificate: "/certificate",
  };

  const syncNow = async () => {
    setBusy("queue");
    await run("sync.push", undefined, {
      toast: {
        title: "Sync complete",
        body: "Your records reached the server in order and were checked on arrival.",
      },
    });
    setBusy(null);
  };

  return (
    <>
      {/* ------------------------------------------------------- greeting */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[28px] font-bold leading-tight tracking-tight text-brand-deep sm:text-[32px]">
            {hello}, {officer?.name ?? session?.officer_id}{" "}
            <span role="img" aria-label="waving hand">
              👋
            </span>
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">
            {pendingHandoffs.length + queuedRecords.length + brokenCases.length === 0
              ? "Everything is in order. Start a new capture when you are ready."
              : "Here is what needs your attention today."}
          </p>
        </div>
        <ButtonLink href="/demo" variant="ghost" icon={<MonitorPlay size={16} />}>
          Demo Mode
        </ButtonLink>
      </div>

      {/* --------------------------------------------------- quick actions */}
      <section aria-labelledby="qa-title" className="mb-6">
        <h2 id="qa-title" className="sr-only">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <BigAction
            href="/capture/trigger"
            tone="brand"
            icon={<Camera size={24} />}
            title="Capture Evidence"
            body="Start or continue a case"
          />
          <BigAction
            href="/capture/field-test"
            tone="sim"
            icon={<FlaskConical size={24} />}
            title="Field Test"
            body="Record a presumptive result"
          />
          <BigAction
            href="/handoff"
            tone="ok"
            icon={<ArrowLeftRight size={24} />}
            title="Handoff"
            body="Transfer custody to GRP"
            badge={pendingHandoffs.length ? `${pendingHandoffs.length} waiting` : undefined}
          />
          <BigAction
            href="/verification"
            tone="info"
            icon={<ShieldCheck size={24} />}
            title="Verify Evidence"
            body="Check a chain is intact"
            badge={brokenCases.length ? `${brokenCases.length} broken` : undefined}
            badgeTone="danger"
          />
        </div>
      </section>

      {/* ------------------------------------ device status + pending sync */}
      <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <DeviceStatusCard />

        <Panel className="min-w-0">
          <PanelHead
            title="Pending Sync"
            icon={<CloudUpload size={17} />}
            right={<HelpTip term="pending-sync" align="right" />}
          />
          <div className="px-5 py-5">
            <div
              className={cx(
                "flex items-center gap-3 rounded-2xl border px-4 py-3",
                online ? "border-ok/25 bg-ok/[0.07]" : "border-warn/30 bg-warn/[0.09]",
              )}
            >
              {online ? <Wifi size={20} className="text-ok" /> : <WifiOff size={20} className="text-warn" />}
              <div>
                <div className="text-[15px] font-semibold text-fg">{online ? "Online" : "Working offline"}</div>
                <div className="text-[13px] text-fg-muted">
                  {online ? "Records upload as soon as you sync." : "Keep capturing — nothing is lost."}
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-baseline gap-2">
              <span
                className={cx(
                  "text-[44px] font-bold leading-none tracking-tight",
                  queuedRecords.length ? "text-[#B45309]" : "text-ok",
                )}
              >
                {queuedRecords.length}
              </span>
              <span className="text-[16px] font-semibold text-fg">
                record{queuedRecords.length === 1 ? "" : "s"} waiting
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-fg-muted">
              {queuedRecords.length
                ? "Saved safely on this device. They will upload automatically when connected."
                : "Everything captured on this device has reached the server."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="lg"
                icon={<CloudUpload size={18} />}
                busy={busy === "queue"}
                disabled={!online || !queuedRecords.length || busy === "queue"}
                onClick={syncNow}
                title={!online ? "Go online to sync" : !queuedRecords.length ? "Nothing to sync" : undefined}
              >
                Sync Now
              </Button>
              <ButtonLink href="/queue" size="lg">
                View Queue
              </ButtonLink>
            </div>
            {!online && queuedRecords.length ? (
              <p className="mt-3 text-[12.5px] text-fg-dim">Sync becomes available when you are back online.</p>
            ) : null}
          </div>
        </Panel>
      </div>

      {/* --------------------------------------------------------- KPI row */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat value={store.cases.length} label="Active Cases" hint="Across all stations" tone="brand" icon={<FolderOpen size={21} />} href="/cases" />
        <Stat
          value={pendingHandoffs.length}
          label="Pending Handoffs"
          hint="Awaiting GRP receipt"
          tone={pendingHandoffs.length ? "warn" : "ok"}
          icon={<Clock size={21} />}
          href="/handoff"
        />
        <Stat
          value={unanchored.length}
          label="Waiting for Trusted Time"
          hint="On the server, not yet anchored"
          tone={unanchored.length ? "sim" : "ok"}
          icon={<Database size={21} />}
          href="/queue"
        />
        <Stat
          value={verdicts ? verifiedCount : "—"}
          label="Verified Cases"
          hint="Evidence chains intact"
          tone={allVerify ? "ok" : "warn"}
          icon={<ShieldCheck size={21} />}
          href="/verification"
        />
      </div>

      {/* ------------------------------------------------ recent + actions */}
      <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel className="min-w-0">
          <PanelHead
            title="Recent Activity"
            icon={<FolderOpen size={17} />}
            right={
              <Link href="/cases" className="inline-flex min-h-[44px] items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:underline">
                All cases <ArrowRight size={15} />
              </Link>
            }
          />
          {recentRecords.length === 0 ? (
            <EmptyState
              icon={<Camera size={22} />}
              title="No evidence captured yet"
              body="Records you capture appear here with their sync and verification status."
              action={<ButtonLink href="/capture/trigger" variant="primary">Capture Evidence</ButtonLink>}
            />
          ) : (
            <ul className="divide-y divide-line">
              {recentRecords.map((r) => {
                const v = verdicts?.find((x) => x.case_ref === r.case_ref);
                const kase = store.cases.find((c) => c.case_ref === r.case_ref);
                return (
                  <li key={r.record_id}>
                    <Link
                      href={`/cases/${r.case_ref}?record=${encodeURIComponent(r.record_id)}`}
                      className="flex flex-col gap-2 px-5 py-3.5 transition-colors duration-150 hover:bg-brand/[0.04] sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <RecordTypePill type={r.type} />
                          <span className="mono text-[13px] font-semibold text-fg">{r.case_ref}</span>
                        </div>
                        <div className="mt-1 truncate text-[13px] text-fg-muted">
                          {kase?.place ?? "—"} · {r.officer_id} · {fmtRelative(r.claimed_time)}
                          <span className="text-fg-dim"> (device time)</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <RecordStatusPill status={r.status} />
                        {v ? (
                          v.verified ? (
                            <Pill tone="ok" icon={<Check size={11} />}>Verified</Pill>
                          ) : (
                            <Pill tone="danger" icon={<X size={11} />}>Chain broken</Pill>
                          )
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel className="min-w-0">
          <PanelHead title="Needs Your Action" subtitle="Only what a person has to do next." icon={<TriangleAlert size={17} />} />
          <div className="space-y-2.5 px-5 py-5">
            {pendingHandoffs.length === 0 && queuedRecords.length === 0 && certificatesReady.length === 0 && brokenCases.length === 0 ? (
              <EmptyState
                icon={<Check size={20} />}
                title="Nothing is waiting"
                body="No transfer needs a receipt, nothing is waiting to sync, and every eligible case has its certificate."
              />
            ) : null}

            {brokenCases.map((v) => (
              <ActionRow
                key={`b-${v.case_ref}`}
                tone="danger"
                icon={<TriangleAlert size={16} />}
                title={`${v.case_ref} — chain broken`}
                body="A record in this case was changed after it was signed. Open the case to see which one."
                href={`/cases/${v.case_ref}`}
                cta="See where"
              />
            ))}
            {pendingHandoffs.map((s) => (
              <ActionRow
                key={s.case_ref}
                tone="warn"
                icon={<Repeat size={16} />}
                title={`${s.case_ref} — waiting for GRP receipt`}
                body={`Transfer signed by ${s.handoff?.transfer_officer_id}. ${s.handoff?.sample_count} sample(s), seal ${s.handoff?.seal_state?.replace(/_/g, " ")}.`}
                href="/handoff"
                cta="Open handoff"
              />
            ))}
            {queuedRecords.length ? (
              <ActionRow
                tone="warn"
                icon={<Database size={16} />}
                title={`${queuedRecords.length} record(s) waiting to sync`}
                body="Signed and saved on the device. They upload on the next connection."
                href="/queue"
                cta="Open Pending Sync"
              />
            ) : null}
            {certificatesReady.map((s) => (
              <ActionRow
                key={s.case_ref}
                tone="info"
                icon={<FileText size={16} />}
                title={`${s.case_ref} — certificate ready`}
                body="Anchored, and the handoff verifies. The Section 63 certificate can be produced."
                href={`/certificate/${s.case_ref}`}
                cta="Generate"
              />
            ))}
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------------- evidence flow */}
      <Panel className="mb-6 min-w-0">
        <PanelHead
          title="Evidence Flow"
          subtitle="Where evidence is right now. Tap a step to open it."
          icon={<Workflow size={17} />}
          right={<HelpTip term="evidence-chain" align="right" />}
        />
        <div className="grid items-center gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <EvidenceFlow steps={flowSteps} onSelect={(key) => router.push(flowTargets[key] ?? "/cases")} />
          <div className="mx-auto w-full max-w-[340px] lg:w-[300px]">
            <AssetImage
              name="evidenceFlow"
              alt="Evidence flow: Capture, Review, Sign, Save, Sync, Verify, Handoff"
              maxWidth={340}
            />
          </div>
        </div>
      </Panel>

      {/* ------------------------------------- integrity + trusted time */}
      <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel className="relative min-w-0 overflow-hidden">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <IconContainer tone={allVerify ? "ok" : "danger"} size="sm">
                  <ShieldCheck size={17} />
                </IconContainer>
                <h3 className="text-[18px] font-semibold text-fg">Is the evidence intact?</h3>
              </div>

              {!verdicts ? (
                <div className="flex items-center gap-3 py-12 text-fg-muted">
                  <CircleDashed size={18} className="animate-spin text-brand" />
                  <span className="text-[14px]">Checking every chain…</span>
                </div>
              ) : (
                <>
                  <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className={cx("text-[48px] font-bold leading-none tracking-tight", allVerify ? "text-ok" : "text-danger")}>
                      {verifiedCount}
                    </span>
                    <span className="text-[22px] font-semibold tracking-tight text-fg">
                      of {verdicts.length} cases verify
                    </span>
                  </div>
                  <p className="mt-2.5 max-w-[32rem] text-[14px] leading-relaxed text-fg-muted">
                    {allVerify
                      ? "Every record still matches what was signed, and every chain links up."
                      : "One or more records no longer match what was signed."}
                  </p>
                  <div className="mt-4 flex max-w-[32rem] items-center gap-3">
                    <ProgressRail value={pct} tone={allVerify ? "ok" : "danger"} />
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums text-fg">{Math.round(pct)}%</span>
                  </div>

                  <div className="mt-5 flex max-w-[36rem] flex-wrap items-center gap-x-5 gap-y-2">
                    {global?.checks.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1.5 text-[13px]">
                        {c.status === "pass" ? (
                          <Check size={15} className="text-ok" />
                        ) : c.status === "fail" ? (
                          <X size={15} className="text-danger" />
                        ) : c.status === "degraded" ? (
                          <TriangleAlert size={14} className="text-warn" />
                        ) : (
                          <span className="text-fg-dim">–</span>
                        )}
                        <span className="text-fg-muted">{c.label}</span>
                      </span>
                    ))}
                  </div>

                  <div className="mt-5">
                    <ButtonLink href="/verification" icon={<ShieldCheck size={16} />}>
                      Open Verification
                    </ButtonLink>
                  </div>
                </>
              )}
            </div>
            <div className="mx-auto w-full max-w-[320px] self-center lg:w-[280px]">
              <AssetImage name="indiaIntegrity" alt="A stronger India through safer railways: secure, integrity, accountability, trust" maxWidth={320} />
            </div>
          </div>
        </Panel>

        <Panel className="min-w-0">
          <PanelHead title="Trusted Time" icon={<Clock size={17} />} right={<HelpTip term="anchor" align="right" />} />
          <div className="px-5 py-5">
            {latestAnchor ? (
              <>
                <div className="label">Latest anchored window</div>
                <div className="mono mt-1.5 text-[24px] font-semibold tabular-nums leading-none text-brand-deep">
                  {fmtInterval(latestAnchor.interval_start, latestAnchor.interval_end)}
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-fg-muted">
                  Records in this window existed somewhere inside it. Device time is not trusted
                  evidence of exact time.
                </p>
                <div className="mt-4 space-y-2">
                  {latestAnchor.tsa.map((t) => (
                    <div
                      key={t.tsa_id}
                      className={cx(
                        "flex items-center gap-2.5 rounded-xl border px-3 py-2",
                        t.status === "verified" ? "border-ok/22 bg-ok/[0.07]" : "border-warn/28 bg-warn/[0.09]",
                      )}
                    >
                      {t.status === "verified" ? (
                        <Check size={15} className="shrink-0 text-ok" />
                      ) : (
                        <TriangleAlert size={15} className="shrink-0 text-warn" />
                      )}
                      <span className="text-[13.5px] font-semibold text-fg">{t.tsa_id.replace("-", " ")}</span>
                      <span className="ml-auto text-[12.5px] text-fg-muted">
                        {t.status === "verified" ? "Confirmed" : "Unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <TechnicalDetailsDrawer subtitle="The Merkle tree head this anchor timestamped.">
                    <div className="space-y-4">
                      <div>
                        <div className="label">Tree head</div>
                        <div className="mt-1.5">
                          <HashChip value={latestAnchor.tree_head} tone="ok" full />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="label">Tree size</div>
                          <div className="mono mt-1.5 text-[15px] font-semibold text-fg">{latestAnchor.tree_size}</div>
                        </div>
                        <div>
                          <div className="label">Records covered</div>
                          <div className="mono mt-1.5 text-[15px] font-semibold text-fg">{latestAnchor.record_ids.length}</div>
                        </div>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-fg-muted">
                        Both time authorities in this prototype are simulated and labelled as such.
                      </p>
                    </div>
                  </TechnicalDetailsDrawer>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<AnchorIcon size={20} />}
                title="Nothing anchored yet"
                body="No record has a trusted time window yet. Sync, then anchor from Pending Sync."
              />
            )}
          </div>
        </Panel>
      </div>

      {/* ---------------------------------------------------- how to use */}
      <Panel className="mb-2 min-w-0">
        <PanelHead
          title="How to Use"
          subtitle="Three things to know. The full guide has every step with pictures."
          icon={<BookOpen size={17} />}
          right={
            <Link href="/help" className="inline-flex min-h-[44px] items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:underline">
              Open guide <ArrowRight size={15} />
            </Link>
          }
        />
        <div className="grid gap-4 px-5 py-5 md:grid-cols-3">
          {(
            [
              { img: "helpCapture", title: "Capture evidence", body: "Select the case, press ACQUIRE, review, confirm.", href: "/help#capture-trigger" },
              { img: "helpSync", title: "Offline to online", body: "Records wait safely on the device and sync later.", href: "/help#sync" },
              { img: "helpVerify", title: "Verify evidence", body: "One check tells you whether the chain is intact.", href: "/help#verify" },
            ] as { img: AssetKey; title: string; body: string; href: string }[]
          ).map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="hover-lift group rounded-2xl border border-line bg-white p-3 hover:shadow-lift"
            >
              <AssetImage name={c.img} alt="" className="rounded-xl" />
              <div className="px-1 pb-1 pt-3">
                <div className="flex items-center justify-between text-[16px] font-semibold text-fg">
                  {c.title}
                  <ArrowRight size={16} className="text-fg-dim transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{c.body}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
          <ButtonLink href="/operator" size="sm" icon={<ScanLine size={15} />}>Operator Mode</ButtonLink>
          <ButtonLink href="/certificate" size="sm" icon={<FileBadge size={15} />}>Certificates</ButtonLink>
          <ButtonLink href="/hardware" size="sm" icon={<Cpu size={15} />}>Hardware Guide</ButtonLink>
        </div>
      </Panel>

      <p className="mt-4 text-[12.5px] leading-relaxed text-fg-dim">
        No map, heatmap, live alert feed, behavioural analytics or patrol routing — each was tested
        against the evidence and deliberately left out.
      </p>
    </>
  );
}

function BigAction({
  href,
  tone,
  icon,
  title,
  body,
  badge,
  badgeTone = "warn",
}: {
  href: string;
  tone: Tone;
  icon: React.ReactNode;
  title: string;
  body: string;
  badge?: string;
  badgeTone?: Tone;
}) {
  return (
    <Link
      href={href}
      className="panel hover-lift tap group relative flex min-h-[132px] flex-col justify-between gap-3 p-4 hover:shadow-lift sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <IconContainer tone={tone} size="lg">
          {icon}
        </IconContainer>
        {badge ? <Pill tone={badgeTone}>{badge}</Pill> : null}
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-[16px] font-semibold text-fg sm:text-[17px]">
          {title}
          <ArrowRight size={16} className="text-fg-dim transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
        </div>
        <div className="mt-0.5 text-[13px] leading-snug text-fg-muted sm:text-[13.5px]">{body}</div>
      </div>
    </Link>
  );
}

function ActionRow({
  icon,
  tone,
  title,
  body,
  href,
  cta,
}: {
  icon: React.ReactNode;
  tone: "warn" | "info" | "danger";
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border px-3.5 py-3",
        tone === "warn" && "border-warn/25 bg-warn/[0.07]",
        tone === "info" && "border-info/22 bg-info/[0.06]",
        tone === "danger" && "border-danger/25 bg-danger/[0.06]",
      )}
    >
      <div className="flex items-start gap-2.5">
        <IconContainer tone={tone} size="sm">
          {icon}
        </IconContainer>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-fg">{title}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{body}</p>
          <Link href={href} className="mt-1 inline-flex min-h-[36px] items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:underline">
            {cta} <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
