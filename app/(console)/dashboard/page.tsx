"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Database,
  FileText,
  FolderPlus,
  Repeat,
  ScanLine,
  Workflow,
} from "lucide-react";
import {
  Anchor as AnchorIcon,
  BookOpen,
  Camera,
  Check,
  Clock,
  Cpu,
  FileBadge,
  FolderOpen,
  TriangleAlert,
  X,
} from "@/components/ui/icons";
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
import {
  IntegrityCard,
  MetricCard,
  PendingSyncCard,
  PramaanCard,
  QuickActionTile,
  TteDemoCard,
} from "@/features/dashboard/overview";
import { RailIcon } from "@/components/ui/rail-icon";
import { NewCaseDialog } from "@/features/case/case-context";
import { summariseByRecency } from "@/lib/domain/status";
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
  // Read on the client only, so server and client render agree.
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const [newCaseOpen, setNewCaseOpen] = React.useState(false);

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

  const summaries = summariseByRecency(store);

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

  // "Today" is judged on the device clock, which the card says out loud.
  const todayKey = (now ?? new Date(0)).toDateString();
  const recordsToday = now
    ? store.records.filter((r) => new Date(r.claimed_time).toDateString() === todayKey).length
    : 0;
  const casesToday = now
    ? store.cases.filter((c) => new Date(c.opened_at).toDateString() === todayKey).length
    : 0;

  /*
   * Recent activity: the last records appended to the log, newest first. The
   * log is append-only, so its order is what actually happened — the device
   * clock is untrusted and would rank a fresh capture below seeded demo rows.
   */
  const recentRecords = [...store.records].reverse().slice(0, 6);

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
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[28px] font-bold leading-tight tracking-tight text-brand-deep sm:text-[32px]">
            {hello}, {officer?.name ?? session?.officer_id}{" "}
            <span role="img" aria-label="waving hand">
              👋
            </span>
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed text-fg-muted">
            {pendingHandoffs.length + queuedRecords.length + brokenCases.length === 0
              ? "Everything is in order. Start a new capture when you are ready."
              : "Here is what needs your attention today."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {now ? (
            <span className="inline-flex h-10 flex-wrap items-center gap-x-2 rounded-xl border border-line bg-white px-3 text-[13.5px] text-fg-muted">
              <span className={cx("inline-flex items-center gap-1.5 font-semibold", store.connectivity.online ? "text-[#1F6A43]" : "text-[#855A14]")}>
                <span className={cx("h-2 w-2 rounded-full", store.connectivity.online ? "bg-ok" : "bg-warn")} />
                {store.connectivity.online ? "System Online" : "Working Offline"}
              </span>
              <span className="text-line-strong">|</span>
              <RailIcon name="calendar" size={16} />
              {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              <span className="text-line-strong">|</span>
              {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
            </span>
          ) : null}
          <ButtonLink href="/demo" size="sm" variant="accent" icon={<RailIcon name="demo-mode" size={16} />}>
            Demo Mode
          </ButtonLink>
        </div>
      </div>

      {/* --------------------------------------------------- quick actions */}
      <section aria-labelledby="qa-title" className="mb-5">
        <h2 id="qa-title" className="sr-only">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickActionTile href="/capture/trigger" icon="capture" tone="green" title="Capture Evidence" body="Start or continue a case" />
          <QuickActionTile href="/capture/field-test" icon="field-test" tone="terracotta" title="Field Test" body="Record a presumptive result" />
          <QuickActionTile
            href="/handoff"
            icon="handoff"
            tone="gold"
            title="Handoff"
            body="Transfer custody to GRP"
            badge={pendingHandoffs.length ? { text: `${pendingHandoffs.length} waiting` } : undefined}
          />
          <QuickActionTile
            href="/verification"
            icon="verification"
            tone="deep"
            title="Verify Evidence"
            body="Check a chain is intact"
            badge={brokenCases.length ? { text: `${brokenCases.length} need attention`, danger: true } : undefined}
          />
        </div>
      </section>

      {/* ------------------------------------------------ operational metrics */}
      <section aria-labelledby="metrics-title" className="mb-5">
        <h2 id="metrics-title" className="sr-only">
          Operational metrics
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            icon="cases"
            well="gold"
            label="Active Cases"
            value={String(store.cases.length).padStart(2, "0")}
            sub={casesToday ? `${casesToday} opened today` : "None opened today"}
            subTone={casesToday ? "ok" : "neutral"}
            href="/cases"
          />
          <MetricCard
            icon="certificates"
            label="Records Today"
            value={String(recordsToday).padStart(2, "0")}
            sub="By device time"
            href="/cases"
          />
          <MetricCard
            icon="shield"
            label="Verified Chains"
            value={verdicts ? String(verifiedCount).padStart(2, "0") : "—"}
            sub={verdicts && verdicts.length ? `${Math.round(pct)}% of cases intact` : "Checking…"}
            subTone={allVerify ? "ok" : "attention"}
            href="/verification"
          />
          <MetricCard
            icon="pending-sync"
            well={queuedRecords.length ? "terracotta" : "sage"}
            label="Pending Sync"
            value={String(queuedRecords.length).padStart(2, "0")}
            sub={queuedRecords.length ? "Awaiting upload" : "All synced"}
            subTone={queuedRecords.length ? "gold" : "ok"}
            href="/queue"
          />
          <MetricCard
            icon="handoff"
            well={pendingHandoffs.length ? "terracotta" : "sage"}
            label="Handoffs Pending"
            value={String(pendingHandoffs.length).padStart(2, "0")}
            sub="RPF → GRP"
            subTone={pendingHandoffs.length ? "gold" : "neutral"}
            href="/handoff"
          />
        </div>
      </section>

      {/* ------------------------- device · integrity · pending sync + TTE */}
      <div className="mb-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
        <PramaanCard />
        <IntegrityCard result={global} verdicts={verdicts} />
        <div className="min-w-0 space-y-5 lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0 xl:col-span-1 xl:block xl:space-y-5">
          <PendingSyncCard onSync={syncNow} busy={busy === "queue"} />
          <TteDemoCard />
        </div>
      </div>

      {/* ------------------------------------------------------------ cases */}
      <Panel className="mb-6 min-w-0">
        <PanelHead
          title="Cases"
          subtitle="Start a new case, or open an existing one to see its full history."
          icon={<FolderOpen size={17} />}
          right={
            <Link
              href="/cases"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:underline"
            >
              View all cases <ArrowRight size={15} />
            </Link>
          }
        />
        <div className="px-5 py-5">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="lg" icon={<FolderPlus size={18} />} onClick={() => setNewCaseOpen(true)}>
              New Case
            </Button>
            <ButtonLink href="/cases" size="lg" icon={<FolderOpen size={18} />}>
              Existing Cases
            </ButtonLink>
          </div>

          <div className="label mt-5 mb-2">Recent cases</div>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaries.slice(0, 3).map((s) => {
              const v = verdicts?.find((x) => x.case_ref === s.case_ref);
              return (
                <li key={s.case_ref}>
                  <Link
                    href={`/cases/${s.case_ref}`}
                    className="hover-lift block rounded-2xl border border-line bg-white px-4 py-3.5 hover:shadow-chip"
                  >
                    <div className="mono text-[14px] font-semibold text-fg">{s.case_ref}</div>
                    <div className="mt-0.5 truncate text-[13px] text-fg-muted">{s.place}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Pill tone="neutral">
                        {s.record_count} record{s.record_count === 1 ? "" : "s"}
                      </Pill>
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
        </div>
      </Panel>

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

      {/* ------------------------------ what the system preserves + trusted time */}
      <div className="mb-6 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel className="relative min-w-0 overflow-hidden">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <RailIcon name="shield" size={19} />
                </span>
                <h3 className="text-[18px] font-semibold text-fg">What Evidence Chain preserves</h3>
              </div>
              <ul className="mt-4 grid gap-x-5 gap-y-2 sm:grid-cols-2">
                {[
                  "What was recorded",
                  "Who recorded it",
                  "When it was recorded",
                  "Which device was used",
                  "Whether anything changed",
                  "When it synchronised",
                  "Whether the chain still verifies",
                  "How custody was handed over",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-[14px] text-fg">
                    <Check size={15} className="shrink-0 text-ok" />
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-4 max-w-[36rem] rounded-xl border border-line bg-ink-750/60 px-3.5 py-2.5 text-[13px] leading-relaxed text-fg-muted">
                The system preserves the integrity and provenance of records. It does not establish the
                chemical truth of a presumptive test, and verification does not prove what was in a sample.
              </p>
              <div className="mt-4">
                <ButtonLink href="/verification" icon={<RailIcon name="verification" size={16} />}>
                  Open Verification
                </ButtonLink>
              </div>
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
              { img: "helpCapture", title: "Capture evidence", body: "Select the case, press ACQUIRE, review, confirm.", href: "/help#capture" },
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

      <NewCaseDialog
        open={newCaseOpen}
        onClose={() => setNewCaseOpen(false)}
        onCreated={(ref) => router.push(`/cases/${ref}`)}
      />

      <p className="mt-4 text-[12.5px] leading-relaxed text-fg-dim">
        No map, heatmap, live alert feed, behavioural analytics or patrol routing — each was tested
        against the evidence and deliberately left out.
      </p>
    </>
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
