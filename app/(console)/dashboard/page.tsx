"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Anchor as AnchorIcon,
  ArrowRight,
  Camera,
  Check,
  CircleDashed,
  Clock,
  Database,
  FileText,
  FlaskConical,
  FolderOpen,
  MonitorPlay,
  Repeat,
  ShieldCheck,
  TriangleAlert,
  UploadCloud,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  ButtonLink,
  Callout,
  EmptyState,
  HashChip,
  IconContainer,
  Panel,
  PanelHead,
  Pill,
  ProgressRail,
  QuickAction,
  Stat,
  cx,
} from "@/components/ui/primitives";
import { AnchorPill, HandoffPill, RecordTypePill, StagePill } from "@/components/ui/status";
import { IndiaPledgeBanner, IntegrityShield } from "@/components/brand/marks";
import { EvidenceFlow, FLOW_ICONS, type FlowState } from "@/features/dashboard/evidence-flow";
import { summariseAll } from "@/lib/domain/status";
import { fmtInterval, fmtRelative } from "@/lib/format";
import type { CaseVerdict } from "@/app/api/verify/route";
import type { VerificationResult } from "@/lib/domain/verify";

export default function DashboardPage() {
  const { store, verifyAllCases, run } = useApp();
  const router = useRouter();
  const [verdicts, setVerdicts] = React.useState<CaseVerdict[] | null>(null);
  const [global, setGlobal] = React.useState<VerificationResult | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

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
  const verdictFor = (ref: string) => verdicts?.find((v) => v.case_ref === ref) ?? null;

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
  const recent = summaries.slice(0, 5);

  /* Every flow state is derived from the store; none of it is hardcoded. */
  const has = (t: string) => store.records.some((r) => r.type === t);
  const st = (done: boolean, active = false): FlowState =>
    done ? "done" : active ? "active" : "pending";

  const flowSteps = [
    {
      key: "trigger",
      label: "Trigger",
      caption: "s.43 Captured",
      icon: FLOW_ICONS.trigger,
      state: st(has("trigger")),
    },
    {
      key: "field_test",
      label: "Field Test",
      caption: "Presumptive Result",
      icon: FLOW_ICONS.fieldTest,
      state: st(has("field_test")),
    },
    {
      key: "signed",
      label: "Signed",
      caption: "On Device",
      icon: FLOW_ICONS.signed,
      state: st(store.records.length > 0),
    },
    {
      key: "queued",
      label: "Queued",
      caption: "Offline Mode",
      icon: FLOW_ICONS.queued,
      state: (queuedRecords.length ? "active" : "done") as FlowState,
    },
    {
      key: "pushed",
      label: "Pushed",
      caption: "To Server",
      icon: FLOW_ICONS.pushed,
      state: st(store.records.some((r) => r.status === "pushed" || r.status === "anchored")),
    },
    {
      key: "anchored",
      label: "Anchored",
      caption: "Dual TSA",
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
        : st(
            store.handoffs.some((h) => h.status === "verified"),
            pendingHandoffs.length > 0,
          ),
    },
    {
      key: "certificate",
      label: "Certificate",
      caption: "s.63 Generated",
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

  return (
    <>
      <PageHeader
        eyebrow="Evidence chain"
        title="Dashboard"
        subtitle="Six seeded cases. Every hash, signature, Merkle root and anchor token below was computed by this build, not typed in."
        actions={
          <>
            <ButtonLink href="/capture/trigger" icon={<Camera size={16} />}>
              Capture Trigger
            </ButtonLink>
            <ButtonLink href="/demo" variant="primary" icon={<MonitorPlay size={16} />}>
              Demo Mode
            </ButtonLink>
          </>
        }
      />

      {/* --------------------------------------------------------- KPI row */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          value={store.cases.length}
          label="Active Cases"
          hint="Across all stations"
          tone="brand"
          icon={<FolderOpen size={21} />}
          href="/cases"
        />
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
          label="Unanchored Records"
          hint="Stored locally, not yet timestamped"
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

      {/* ----------------------------------------- integrity + trusted time */}
      <div className="mb-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel className="relative min-w-0 overflow-hidden">
          {/* Art sits clear of the text column; hidden where there is no room. */}
          <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 opacity-95 xl:block 2xl:right-6">
            <IntegrityShield size={158} broken={!allVerify} />
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: allVerify
                ? "radial-gradient(520px 220px at 10% 18%, rgba(15,157,110,0.08), transparent 70%)"
                : "radial-gradient(520px 220px at 10% 18%, rgba(224,82,82,0.07), transparent 70%)",
            }}
          />

          <div className="relative px-5 py-5 lg:px-6 xl:pr-[186px]">
            <div className="flex items-center gap-2.5">
              <IconContainer tone={allVerify ? "ok" : "danger"} size="sm">
                <ShieldCheck size={17} />
              </IconContainer>
              <h3 className="text-[15px] font-semibold text-fg">Evidence Chain Integrity</h3>
            </div>

            {!verdicts ? (
              <div className="flex items-center gap-3 py-12 text-fg-muted">
                <CircleDashed size={18} className="animate-spin text-brand" />
                <span className="text-[13.5px]">Re-walking every chain…</span>
              </div>
            ) : (
              <>
                <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={cx(
                      "text-[46px] font-bold leading-none tracking-tight lg:text-[52px]",
                      allVerify ? "text-ok" : "text-brand-deep",
                    )}
                  >
                    {verifiedCount}
                  </span>
                  <span className="text-[23px] font-semibold uppercase tracking-tight text-fg lg:text-[28px]">
                    of {verdicts.length} cases verify
                  </span>
                </div>

                <p className="mt-2.5 max-w-[30rem] text-[13px] leading-relaxed text-fg-muted">
                  {allVerify
                    ? "Every record re-hashes, re-links and re-verifies against the stored signatures."
                    : "One or more records no longer match what was signed."}
                </p>

                <div className="mt-4 flex max-w-[30rem] items-center gap-3">
                  <ProgressRail value={pct} tone={allVerify ? "ok" : "warn"} />
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums text-fg">
                    {Math.round(pct)}%
                  </span>
                </div>

                {brokenCases.length ? (
                  <div className="mt-4 max-w-[30rem] space-y-2">
                    {brokenCases.map((v) => (
                      <Link
                        key={v.case_ref}
                        href={`/cases/${v.case_ref}`}
                        className="hover-lift block rounded-xl border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 hover:shadow-chip"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <TriangleAlert size={14} className="text-danger" />
                          <span className="mono text-[12.5px] font-semibold text-fg">
                            {v.case_ref}
                          </span>
                          <Pill tone="danger">Chain broken</Pill>
                          {v.broken_record_id ? (
                            <span className="mono ml-auto text-[11.5px] text-danger">
                              {v.broken_record_id}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
                          {v.broken_reason}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : null}

                <div className="mt-5 flex max-w-[34rem] flex-wrap items-center gap-x-5 gap-y-2">
                  {global?.checks.map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1.5 text-[12px]">
                      {c.status === "pass" ? (
                        <Check size={14} className="text-ok" />
                      ) : c.status === "fail" ? (
                        <X size={14} className="text-danger" />
                      ) : c.status === "degraded" ? (
                        <TriangleAlert size={13} className="text-warn" />
                      ) : (
                        <span className="text-fg-dim">–</span>
                      )}
                      <span className="text-fg-muted">{c.label}</span>
                    </span>
                  ))}
                </div>

                <div className="mt-5">
                  <ButtonLink href="/verification" size="sm" icon={<ShieldCheck size={15} />}>
                    Open the verifier
                  </ButtonLink>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel className="min-w-0">
          <div className="px-5 py-5">
            <div className="flex items-center gap-2.5">
              <IconContainer tone="brand" size="sm">
                <Clock size={17} />
              </IconContainer>
              <h3 className="text-[15px] font-semibold text-fg">Trusted Time (Dual Anchors)</h3>
            </div>

            {latestAnchor ? (
              <>
                <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="label">Latest Anchored Interval</div>
                    <div className="mono mt-1.5 text-[28px] font-semibold tabular-nums leading-none text-brand-deep">
                      {fmtInterval(latestAnchor.interval_start, latestAnchor.interval_end)}
                    </div>
                    <p className="mt-2.5 text-[11.5px] leading-relaxed text-fg-muted">
                      Records in this window existed somewhere inside it. The system never claims an
                      instant — a device clock is not evidence of time.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {latestAnchor.tsa.map((t) => (
                      <div
                        key={t.tsa_id}
                        className={cx(
                          "flex items-center gap-2.5 rounded-xl border px-3 py-2",
                          t.status === "verified"
                            ? "border-ok/22 bg-ok/[0.08]"
                            : "border-warn/28 bg-warn/[0.10]",
                        )}
                      >
                        {t.status === "verified" ? (
                          <Check size={15} className="shrink-0 text-ok" />
                        ) : (
                          <TriangleAlert size={15} className="shrink-0 text-warn" />
                        )}
                        <span className="leading-tight">
                          <span className="block text-[12.5px] font-semibold text-fg">
                            {t.tsa_id.replace("-", " ")}
                          </span>
                          <span className="block text-[11px] text-fg-dim">
                            {t.status === "verified" ? "Anchor verified" : "Unavailable"}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-3">
                  <div className="col-span-2 sm:col-span-1">
                    <div className="label">Tree Head</div>
                    <div className="mt-1.5">
                      <HashChip value={latestAnchor.tree_head} tone="ok" />
                    </div>
                  </div>
                  <div>
                    <div className="label">Tree Size</div>
                    <div className="mono mt-1.5 text-[15px] font-semibold text-fg">
                      {latestAnchor.tree_size}
                    </div>
                  </div>
                  <div>
                    <div className="label">Records Covered</div>
                    <div className="mono mt-1.5 text-[15px] font-semibold text-fg">
                      {latestAnchor.record_ids.length}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                icon={<AnchorIcon size={20} />}
                title="Nothing anchored yet"
                body="No tree head has been timestamped, so no record in the log has a bounded time."
              />
            )}
          </div>
        </Panel>
      </div>

      {/* ----------------------------------------- evidence flow + actions */}
      <div className="mb-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel className="min-w-0">
          <PanelHead
            title="Evidence Flow"
            icon={<Workflow size={17} />}
            right={
              <Link
                href="/cases/CASE-2026-00421"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
              >
                View Details <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="px-5 py-6">
            <EvidenceFlow
              steps={flowSteps}
              onSelect={(key) => router.push(flowTargets[key] ?? "/cases")}
            />
          </div>
        </Panel>

        <Panel className="min-w-0">
          <PanelHead title="Quick Actions" icon={<Zap size={17} />} />
          <div className="grid grid-cols-1 gap-2.5 px-5 py-5 sm:grid-cols-2">
            <QuickAction
              label="Capture Trigger"
              icon={<Camera size={17} />}
              tone="brand"
              href="/capture/trigger"
            />
            <QuickAction
              label="Record Field Test"
              icon={<FlaskConical size={17} />}
              tone="sim"
              href="/capture/field-test"
            />
            <QuickAction
              label="Process Queue"
              icon={<UploadCloud size={17} />}
              tone="warn"
              busy={busy === "queue"}
              onClick={async () => {
                if (store.connectivity.online && queuedRecords.length) {
                  setBusy("queue");
                  await run("sync.push", undefined, {
                    toast: {
                      title: "Queue pushed",
                      body: "Records arrived in sequence and were validated on ingest.",
                    },
                  });
                  setBusy(null);
                } else {
                  router.push("/queue");
                }
              }}
            />
            <QuickAction label="Start Handoff" icon={<Repeat size={17} />} tone="ok" href="/handoff" />
            <QuickAction
              label="Run Verification"
              icon={<ShieldCheck size={17} />}
              tone="info"
              href="/verification"
            />
            <QuickAction
              label="Generate Certificate"
              icon={<FileText size={17} />}
              tone="danger"
              href="/certificate"
            />
          </div>
        </Panel>
      </div>

      {/* ------------------------------------------ recent cases + closing */}
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel solid className="min-w-0 overflow-hidden">
          <PanelHead
            title="Recent Cases"
            icon={<FolderOpen size={17} />}
            right={
              <Link
                href="/cases"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand hover:underline"
              >
                View All <ArrowRight size={14} />
              </Link>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  {[
                    "Case Reference",
                    "Latest Record",
                    "Officer",
                    "Device",
                    "Evidence Status",
                    "Handoff",
                    "Anchor Status",
                    "Updated",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-fg-dim"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => {
                  const v = verdictFor(s.case_ref);
                  return (
                    <tr
                      key={s.case_ref}
                      className="group border-b border-line/60 transition-colors last:border-0 hover:bg-brand/[0.04]"
                    >
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/cases/${s.case_ref}`}
                          className="mono text-[12.5px] font-semibold text-fg group-hover:text-brand"
                        >
                          {s.case_ref}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        {s.latest_record ? <RecordTypePill type={s.latest_record.type} /> : "—"}
                      </td>
                      <td className="mono whitespace-nowrap px-4 py-3.5 text-[12px] text-fg-muted">{s.officer_id}</td>
                      <td className="mono whitespace-nowrap px-4 py-3.5 text-[12px] text-fg-muted">{s.device_id}</td>
                      <td className="px-4 py-3.5">
                        {v ? (
                          v.verified ? (
                            <Pill tone={v.degraded ? "warn" : "ok"} icon={<Check size={11} />}>
                              {v.degraded ? "Degraded" : "Verified"}
                            </Pill>
                          ) : (
                            <Pill tone="danger" icon={<X size={11} />}>
                              Verification Failed
                            </Pill>
                          )
                        ) : (
                          <StagePill stage={s.stage} />
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <HandoffPill status={s.handoff_status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <AnchorPill state={s.anchor_state} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-fg-muted">
                        {fmtRelative(s.latest_update)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="min-w-0 space-y-4">
          <Panel>
            <PanelHead
              title="Requires Action"
              subtitle="Only what a person has to do next."
              icon={<TriangleAlert size={17} />}
            />
            <div className="space-y-2.5 px-5 py-5">
              {pendingHandoffs.length === 0 &&
              queuedRecords.length === 0 &&
              certificatesReady.length === 0 ? (
                <EmptyState
                  icon={<Check size={20} />}
                  title="Nothing is waiting"
                  body="No custody transfer requires a receipt, no record is queued on a device, and every eligible case already has a certificate."
                />
              ) : null}

              {pendingHandoffs.map((s) => (
                <ActionRow
                  key={s.case_ref}
                  tone="warn"
                  icon={<Repeat size={16} />}
                  title={`${s.case_ref} — awaiting GRP receipt`}
                  body={`Transfer signed by ${s.handoff?.transfer_officer_id}. ${s.handoff?.sample_count} sample(s), seal ${s.handoff?.seal_state?.replace(/_/g, " ")}.`}
                  href="/handoff"
                  cta="Open handoff"
                />
              ))}
              {queuedRecords.length ? (
                <ActionRow
                  tone="warn"
                  icon={<Database size={16} />}
                  title={`${queuedRecords.length} record(s) queued on a device`}
                  body="Captured and signed locally. They reach the server on the next connectivity window."
                  href="/queue"
                  cta="Open queue"
                />
              ) : null}
              {certificatesReady.map((s) => (
                <ActionRow
                  key={s.case_ref}
                  tone="info"
                  icon={<FileText size={16} />}
                  title={`${s.case_ref} — certificate can be generated`}
                  body="Anchored, and the two-party handoff verifies. The Section 63 Schedule certificate is ready to produce."
                  href={`/certificate/${s.case_ref}`}
                  cta="Generate"
                />
              ))}
            </div>
          </Panel>

          <Panel className="min-w-0 overflow-hidden">
            <IndiaPledgeBanner />
          </Panel>

          <Callout tone="neutral" title="What this dashboard is not">
            No map, no heatmap, no live alert feed, no behavioural analytics and no patrol routing.
            Each was tested against the evidence and cut; removing them is a finding, not a gap.
          </Callout>
        </div>
      </div>
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
  tone: "warn" | "info";
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border px-3.5 py-3",
        tone === "warn" ? "border-warn/25 bg-warn/[0.08]" : "border-info/22 bg-info/[0.07]",
      )}
    >
      <div className="flex items-start gap-2.5">
        <IconContainer tone={tone} size="sm">
          {icon}
        </IconContainer>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold text-fg">{title}</div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">{body}</p>
          <Link
            href={href}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:underline"
          >
            {cta} <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
