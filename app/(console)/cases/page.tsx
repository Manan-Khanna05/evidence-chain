"use client";

import * as React from "react";
import Link from "next/link";
import { Check, FolderOpen, Radio, Search, X } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import { Button, ButtonLink, EmptyState, Panel, Pill, cx } from "@/components/ui/primitives";
import { TextInput } from "@/components/ui/form";
import { AnchorPill, HandoffPill, RecordTypePill } from "@/components/ui/status";
import { summariseAll } from "@/lib/domain/status";
import { fmtDate, fmtRelative } from "@/lib/format";
import type { CaseVerdict } from "@/app/api/verify/route";

type Filter =
  | "all"
  | "triggered"
  | "field_test"
  | "handoff_pending"
  | "handoff_complete"
  | "anchored"
  | "failed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "triggered", label: "Triggered" },
  { key: "field_test", label: "Field test complete" },
  { key: "handoff_pending", label: "Handoff pending" },
  { key: "handoff_complete", label: "Handoff complete" },
  { key: "anchored", label: "Anchored" },
  { key: "failed", label: "Verification failed" },
];

export default function CasesPage() {
  const { store, verifyAllCases } = useApp();
  const [verdicts, setVerdicts] = React.useState<CaseVerdict[] | null>(null);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [officerFilter, setOfficerFilter] = React.useState<string | null>(null);

  // Global search links here as /cases?officer=<id>.
  React.useEffect(() => {
    setOfficerFilter(new URLSearchParams(window.location.search).get("officer"));
  }, []);

  const stamp = store ? `${store.records.length}:${store.tamper.length}:${store.anchors.length}` : "";

  React.useEffect(() => {
    let alive = true;
    void verifyAllCases().then((r) => {
      if (alive && r) setVerdicts(r.cases);
    });
    return () => {
      alive = false;
    };
  }, [verifyAllCases, stamp]);

  if (!store) return null;

  const summaries = summariseAll(store);
  const verdictFor = (ref: string) => verdicts?.find((v) => v.case_ref === ref) ?? null;

  const filtered = summaries.filter((s) => {
    const q = query.trim().toLowerCase();
    if (
      q &&
      ![s.case_ref, s.place, s.officer_id, s.device_id, s.title].some((x) => x.toLowerCase().includes(q))
    )
      return false;
    if (officerFilter && !s.records.some((r) => r.officer_id === officerFilter) && s.officer_id !== officerFilter)
      return false;
    const v = verdictFor(s.case_ref);
    switch (filter) {
      case "triggered":
        return s.records.some((r) => r.type === "trigger");
      case "field_test":
        return s.records.some((r) => r.type === "field_test");
      case "handoff_pending":
        return s.handoff_status === "awaiting_receipt" || s.handoff_status === "transfer_created";
      case "handoff_complete":
        return s.handoff_status === "verified";
      case "anchored":
        return s.anchor_state === "dual_anchored";
      case "failed":
        return Boolean(v && !v.verified);
      default:
        return true;
    }
  });

  const counts: Record<Filter, number> = {
    all: summaries.length,
    triggered: summaries.filter((s) => s.records.some((r) => r.type === "trigger")).length,
    field_test: summaries.filter((s) => s.records.some((r) => r.type === "field_test")).length,
    handoff_pending: summaries.filter(
      (s) => s.handoff_status === "awaiting_receipt" || s.handoff_status === "transfer_created",
    ).length,
    handoff_complete: summaries.filter((s) => s.handoff_status === "verified").length,
    anchored: summaries.filter((s) => s.anchor_state === "dual_anchored").length,
    failed: verdicts ? verdicts.filter((v) => !v.verified).length : 0,
  };

  return (
    <>
      <PageHeader
        eyebrow="Evidence chain"
        title="Cases"
        subtitle="Every case, with where its evidence is right now. Open a case for its full timeline."
        actions={
          <ButtonLink href="/capture/trigger" variant="primary" icon={<Radio size={16} />}>
            New capture
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-[320px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
          <TextInput
            className="pl-9"
            aria-label="Search cases"
            placeholder="Case ID, location, officer or device"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cx(
                "min-h-[40px] rounded-xl border px-3 text-[13.5px] font-medium transition-colors duration-150",
                filter === f.key
                  ? "border-brand/40 bg-brand/[0.09] text-brand-deep"
                  : "border-line bg-white text-fg-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {f.label}
              <span className="ml-1.5 text-[12px] text-fg-dim">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {officerFilter ? (
        <div className="mb-4 flex items-center gap-2">
          <Pill tone="brand">Officer {officerFilter}</Pill>
          <button
            type="button"
            onClick={() => {
              setOfficerFilter(null);
              window.history.replaceState(null, "", "/cases");
            }}
            className="inline-flex min-h-[36px] items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
          >
            <X size={14} /> Clear
          </button>
        </div>
      ) : null}

      <Panel className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={22} />}
            title="No cases match"
            body="Adjust the filter or clear the search to see the rest of the store."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                  setOfficerFilter(null);
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_80px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-line bg-ink-750/50 px-5 py-3 lg:grid">
              {["Case", "Date", "Evidence", "Sync", "Verification", "Handoff"].map((h) => (
                <span key={h} className="text-[11px] font-bold uppercase tracking-[0.1em] text-fg-dim">
                  {h}
                </span>
              ))}
            </div>
            <ul className="divide-y divide-line">
              {filtered.map((s) => {
                const v = verdictFor(s.case_ref);
                const sync =
                  s.queued_count > 0 ? (
                    <Pill tone="warn">{s.queued_count} waiting to sync</Pill>
                  ) : (
                    <AnchorPill state={s.anchor_state} />
                  );
                const verification = v ? (
                  v.verified ? (
                    <Pill tone={v.degraded ? "warn" : "ok"} icon={<Check size={11} />}>
                      {v.degraded ? "Verified — degraded" : "Verified"}
                    </Pill>
                  ) : (
                    <Pill tone="danger" icon={<X size={11} />}>
                      Chain broken
                    </Pill>
                  )
                ) : (
                  <Pill tone="neutral">Checking…</Pill>
                );
                return (
                  <li key={s.case_ref}>
                    <Link
                      href={`/cases/${s.case_ref}`}
                      className="group grid gap-3 px-5 py-4 transition-colors duration-150 hover:bg-brand/[0.04] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)_80px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="mono text-[14px] font-semibold text-fg group-hover:text-brand">
                            {s.case_ref}
                          </span>
                          {s.latest_record ? <RecordTypePill type={s.latest_record.type} /> : null}
                        </div>
                        <div className="mt-0.5 truncate text-[13.5px] text-fg-muted">{s.place}</div>
                        <div className="mono mt-0.5 text-[12px] text-fg-dim">
                          {s.officer_id} · {s.device_id}
                        </div>
                      </div>
                      <div className="text-[13.5px] text-fg-muted">
                        <span className="label mr-2 lg:hidden">Date</span>
                        {fmtDate(s.opened_at)}
                        <div className="text-[12px] text-fg-dim">Updated {fmtRelative(s.latest_update)}</div>
                      </div>
                      <div className="text-[14px] font-semibold text-fg">
                        <span className="label mr-2 lg:hidden">Evidence</span>
                        {s.record_count}
                        <span className="ml-1 text-[12.5px] font-normal text-fg-dim lg:hidden">records</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="label lg:hidden">Sync</span>
                        {sync}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="label lg:hidden">Verification</span>
                        {verification}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="label lg:hidden">Handoff</span>
                        <HandoffPill status={s.handoff_status} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>
    </>
  );
}
