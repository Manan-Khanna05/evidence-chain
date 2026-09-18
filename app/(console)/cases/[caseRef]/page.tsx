"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  Clock3,
  FileBadge,
  FlaskConical,
  GitCommitVertical,
  History,
  Info,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Button,
  ButtonLink,
  Callout,
  EmptyState,
  KeyValue,
  Panel,
  PanelHead,
  Pill,
} from "@/components/ui/primitives";
import {
  AnchorPill,
  HandoffPill,
  StagePill,
  VerificationPill,
} from "@/components/ui/status";
import { summariseCase } from "@/lib/domain/status";
import { fmtDateTime, fmtTime } from "@/lib/format";
import type { EvidenceRecord } from "@/lib/domain/types";
import type { VerificationResult } from "@/lib/domain/verify";
import { EvidenceTimeline } from "@/features/case/timeline";
import { ChainView } from "@/features/case/chain-view";
import { EvidencePipeline, type PipelineNodeKey } from "@/features/case/pipeline";
import { IntervalBar } from "@/features/time/interval";
import { RecordDrawer } from "@/features/records/record-drawer";
import { CheckList, Verdict } from "@/features/verification/checks";
import { HandoffDocument } from "@/features/handoff/handoff-document";

export default function CaseDetailPage() {
  const params = useParams<{ caseRef: string }>();
  const router = useRouter();
  const caseRef = decodeURIComponent(params.caseRef);
  const { store, verify, officer, run } = useApp();
  const [result, setResult] = React.useState<VerificationResult | null>(null);
  const [drawerRecord, setDrawerRecord] = React.useState<EvidenceRecord | null>(null);
  const [busy, setBusy] = React.useState(false);

  const stamp = store
    ? `${store.records.length}:${store.anchors.length}:${store.tamper.length}:${store.certificates.length}`
    : "";

  React.useEffect(() => {
    let alive = true;
    void verify(caseRef).then((r) => {
      if (alive) setResult(r);
    });
    return () => {
      alive = false;
    };
  }, [verify, caseRef, stamp]);

  // Global search links straight to a record: /cases/<ref>?record=<id>.
  const recordParam = React.useRef<string | null>(null);
  React.useEffect(() => {
    recordParam.current = new URLSearchParams(window.location.search).get("record");
  }, []);
  React.useEffect(() => {
    if (!store || !recordParam.current) return;
    const r = store.records.find((x) => x.record_id === recordParam.current);
    recordParam.current = null;
    if (r) setDrawerRecord(r);
  }, [store]);

  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const scrollTo = (key: PipelineNodeKey) => {
    const map: Record<PipelineNodeKey, string> = {
      trigger: "timeline",
      field_test: "timeline",
      chain: "chain",
      merkle: "chain",
      anchor: "time",
      time: "time",
      handoff: "handoff",
      certificate: "certificate",
    };
    sectionRefs.current[map[key]]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!store) return null;

  const kase = store.cases.find((c) => c.case_ref === caseRef);
  if (!kase) {
    return (
      <Panel>
        <EmptyState
          icon={<Info size={22} />}
          title="No such case"
          body={`Nothing in the evidence store is filed under ${caseRef}.`}
          action={
            <ButtonLink href="/cases" icon={<ArrowLeft size={14} />}>Back to cases</ButtonLink>
          }
        />
      </Panel>
    );
  }

  const summary = summariseCase(store, kase);
  const certificate = store.certificates.find((c) => c.case_ref === caseRef) ?? null;
  const handoff = summary.handoff;
  const transfer = summary.records.find((r) => r.type === "handoff_transfer") ?? null;
  const receipt = summary.records.find((r) => r.type === "handoff_receipt") ?? null;
  const anchoredRecords = summary.records.filter((r) => r.status === "anchored");
  const representative =
    summary.records.find((r) => r.type === "field_test") ?? summary.records[0] ?? null;
  const anchor = anchoredRecords.length
    ? (store.anchors.find((a) => a.anchor_id === anchoredRecords[anchoredRecords.length - 1].anchor_id) ??
      null)
    : null;

  const pipelineStates: Partial<Record<PipelineNodeKey, "done" | "pending" | "failed">> = {
    trigger: summary.records.some((r) => r.type === "trigger") ? "done" : "pending",
    field_test: summary.records.some((r) => r.type === "field_test") ? "done" : "pending",
    chain: result ? (result.checks.find((c) => c.id === "chain_linkage")?.status === "pass" ? "done" : "failed") : "pending",
    merkle: result
      ? result.checks.find((c) => c.id === "merkle_inclusion")?.status === "fail"
        ? "failed"
        : anchoredRecords.length
          ? "done"
          : "pending"
      : "pending",
    anchor: anchoredRecords.length ? "done" : "pending",
    time: anchor ? "done" : "pending",
    handoff:
      summary.handoff_status === "verified"
        ? "done"
        : summary.handoff_status === "mismatch"
          ? "failed"
          : "pending",
    certificate: certificate ? "done" : "pending",
  };

  const generateCertificate = async () => {
    setBusy(true);
    const res = await run("certificate.generate", {
      case_ref: caseRef,
      officer_id: officer?.officer_id ?? summary.officer_id,
    }, { toast: { title: "Certificate generated", body: "Section 63 Schedule, Part A auto-filled. Part B left blank." } });
    setBusy(false);
    if (res.ok) router.push(`/certificate/${caseRef}`);
  };

  return (
    <>
      <PageHeader
        eyebrow={
          <span>
            <Link href="/cases" className="transition-colors hover:text-fg">
              Cases
            </Link>
            <span className="mx-1.5 text-fg-dim">/</span>
            {caseRef}
          </span>
        }
        title={caseRef}
        subtitle={`${kase.title} · ${kase.place}`}
        status={
          <>
            <StagePill stage={summary.stage} />
            {result ? <VerificationPill verified={result.verified} degraded={result.degraded} /> : null}
          </>
        }
        actions={
          <>
            <ButtonLink href={`/projector?case=${encodeURIComponent(caseRef)}`} icon={<ShieldCheck size={15} />}>Projector view</ButtonLink>
            {certificate ? (
              <ButtonLink href={`/certificate/${caseRef}`} variant="primary" icon={<FileBadge size={15} />}>
                  View certificate
                </ButtonLink>
            ) : (
              <Button
                variant="primary"
                icon={<FileBadge size={15} />}
                busy={busy}
                disabled={!summary.certificate_ready}
                title={
                  summary.certificate_ready
                    ? "Generate the Section 63 Schedule certificate"
                    : "Requires an anchored record and a verified two-party handoff"
                }
                onClick={generateCertificate}
              >
                Generate certificate
              </Button>
            )}
          </>
        }
      />

      {/* ----------------------------------------------------- case summary */}
      <Panel className="mb-5">
        <div className="grid gap-5 p-5 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              <KeyValue k="Opened">{fmtDateTime(kase.opened_at)}</KeyValue>
              <KeyValue k="Opening officer">
                <span className="mono">{summary.officer_id}</span>
              </KeyValue>
              <KeyValue k="Capture device">
                <span className="mono">{summary.device_id}</span>
              </KeyValue>
              <KeyValue k="Records">{summary.record_count} in this case</KeyValue>
              <KeyValue k="Anchor state">
                <AnchorPill state={summary.anchor_state} />
              </KeyValue>
              <KeyValue k="Handoff">
                <HandoffPill status={summary.handoff_status} />
              </KeyValue>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-fg-muted">{kase.notes}</p>
          </div>

          <div className="rounded-lg border border-line bg-ink-850/70 p-4">
            <div className="label mb-2.5">Evidence pipeline</div>
            <EvidencePipeline states={pipelineStates} onSelect={scrollTo} />
            <p className="mt-3 text-[11.5px] leading-relaxed text-fg-dim">
              Each node is a stage this case&apos;s records actually passed through. Select one to
              jump to the section that shows it.
            </p>
          </div>
        </div>
      </Panel>

      {summary.tampered ? (
        <Callout tone="danger" title="A record in this case was altered in storage" icon={<AlertTriangle size={14} />}>
          The stored payload of {store.tamper.find((t) => summary.records.some((r) => r.record_id === t.record_id))?.record_id}{" "}
          no longer matches what was signed. The verifier below names the failure. Nothing has been
          hidden: the altered record is still in the log, and its break is visible from the chain
          view.
        </Callout>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_1fr]">
        {/* ------------------------------------------------------ left col */}
        <div className="min-w-0 space-y-5">
          <div ref={(el) => { sectionRefs.current.timeline = el; }}>
            <Panel className="min-w-0">
              <PanelHead
                title="Evidence timeline"
                subtitle="What happened, what was recorded, and what state each record reached."
                icon={<History size={16} />}
              />
              <div className="p-5">
                <EvidenceTimeline summary={summary} store={store} onOpenRecord={setDrawerRecord} />
              </div>
            </Panel>
          </div>

          <div ref={(el) => { sectionRefs.current.chain = el; }}>
            <Panel className="min-w-0">
              <PanelHead
                title="Hash-chained evidence log"
                subtitle="Not a blockchain: no blocks, nodes or consensus. Each record carries the hash of the one before it on the same device."
                icon={<GitCommitVertical size={16} />}
              />
              <div className="p-5">
                <ChainView
                  records={summary.records}
                  store={store}
                  onOpenRecord={setDrawerRecord}
                  treeHead={result?.tree_head ?? null}
                />
              </div>
            </Panel>
          </div>

          <div ref={(el) => { sectionRefs.current.handoff = el; }}>
            <Panel className="min-w-0">
              <PanelHead
                title="RPF → GRP custody handoff"
                subtitle="Two officers, two devices, two signatures over one transfer."
                icon={<ArrowLeftRight size={16} />}
                right={
                  summary.handoff_status !== "verified" ? (
                    <ButtonLink href="/handoff" size="sm">Open handoff</ButtonLink>
                  ) : null
                }
              />
              <div className="p-5">
                {handoff && transfer ? (
                  <HandoffDocument
                    store={store}
                    handoff={handoff}
                    transfer={transfer}
                    receipt={receipt}
                    onOpenRecord={setDrawerRecord}
                  />
                ) : (
                  <EmptyState
                    icon={<ArrowLeftRight size={22} />}
                    title="Handoff not started"
                    body="No custody transfer has been created for this case. The RPF-side transfer record must exist before a GRP receipt can be signed."
                    action={
                      <ButtonLink href="/handoff" size="sm">Create transfer</ButtonLink>
                    }
                  />
                )}
              </div>
            </Panel>
          </div>
        </div>

        {/* ----------------------------------------------------- right col */}
        <div className="min-w-0 space-y-5">
          <Panel className="min-w-0">
            <PanelHead
              title="Verification"
              subtitle="Re-walked from the live store each time this page loads."
              icon={<ShieldCheck size={16} />}
              right={
                <ButtonLink href={`/verification?case=${encodeURIComponent(caseRef)}`} size="sm" variant="ghost">
                    Full verifier
                  </ButtonLink>
              }
            />
            <div className="p-5">
              <Verdict result={result} scopeLabel={caseRef} />
            </div>
            {result ? <CheckList result={result} /> : null}
          </Panel>

          <div ref={(el) => { sectionRefs.current.time = el; }}>
            <Panel className="min-w-0">
              <PanelHead
                title="Bounded trusted time"
                subtitle="The system never claims an instant of creation."
                icon={<Clock3 size={16} />}
              />
              <div className="p-5">
                {representative ? (
                  <IntervalBar
                    claimed={representative.claimed_time}
                    start={summary.interval?.start ?? null}
                    end={summary.interval?.end ?? null}
                  />
                ) : (
                  <EmptyState
                    icon={<Clock3 size={22} />}
                    title="No records"
                    body="Nothing has been captured for this case yet."
                  />
                )}
              </div>
            </Panel>
          </div>

          <div ref={(el) => { sectionRefs.current.certificate = el; }}>
            <Panel className="min-w-0">
              <PanelHead
                title="Section 63 Schedule certificate"
                subtitle="BSA 2023 s.63(4)(c). The hash requirement lives in the Schedule, not the operative text."
                icon={<FileBadge size={16} />}
              />
              <div className="p-5">
                {certificate ? (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
                      <KeyValue k="Certificate ID">
                        <span className="mono">{certificate.certificate_id}</span>
                      </KeyValue>
                      <KeyValue k="Generated">{fmtTime(certificate.generated_at)}</KeyValue>
                      <KeyValue k="Algorithm">
                        <Pill tone="brand">{certificate.algorithm}</Pill>
                      </KeyValue>
                      <KeyValue k="Part B">
                        <span className="text-fg-dim">Left blank for the expert</span>
                      </KeyValue>
                    </div>
                    <ButtonLink href={`/certificate/${caseRef}`} className="w-full" icon={<FileBadge size={14} />}>
                        View and export certificate
                      </ButtonLink>
                  </div>
                ) : (
                  <EmptyState
                    icon={<FileBadge size={22} />}
                    title="No certificate yet"
                    body={
                      summary.certificate_ready
                        ? "All preconditions are met. Generating it fills Part A from the records this case already holds."
                        : "A certificate needs at least one anchored record and a verified two-party handoff, so the hash it certifies is bounded in time and complete."
                    }
                    action={
                      <Button
                        size="sm"
                        disabled={!summary.certificate_ready}
                        busy={busy}
                        onClick={generateCertificate}
                      >
                        Generate certificate
                      </Button>
                    }
                  />
                )}
              </div>
            </Panel>
          </div>

          <Callout tone="warn" title="The limit, on the face of the case" icon={<FlaskConical size={13} />}>
            Integrity verification does not establish chemical identification. A presumptive colour
            test screens; it does not identify. Only Magistrate-certified samples drawn under NDPS
            s.52A are primary evidence.
          </Callout>
        </div>
      </div>

      <RecordDrawer record={drawerRecord} store={store} onClose={() => setDrawerRecord(null)} />
    </>
  );
}
