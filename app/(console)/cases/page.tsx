"use client";

import * as React from "react";
import Link from "next/link";
import { Check, FolderOpen, Radio, Search, X } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import { Button, ButtonLink, EmptyState, Panel, Pill, cx } from "@/components/ui/primitives";
import { TextInput } from "@/components/ui/form";
import {
  AnchorPill,
  HandoffPill,
  RecordTypePill,
  StagePill,
} from "@/components/ui/status";
import { summariseAll } from "@/lib/domain/status";
import { fmtRelative } from "@/lib/format";
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
    if (q && !s.case_ref.toLowerCase().includes(q) && !s.place.toLowerCase().includes(q)) return false;
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
        subtitle="One row per case. Evidence stage, handoff state, anchor state and verification verdict, computed from the records themselves."
        actions={
          <ButtonLink href="/capture/trigger" variant="primary" icon={<Radio size={15} />}>
              New trigger record
            </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-[300px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim" />
          <TextInput
            className="pl-9"
            placeholder="Search case reference or place"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cx(
                "rounded-lg border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                filter === f.key
                  ? "border-brand/50 bg-brand/12 text-fg"
                  : "border-line bg-ink-800 text-fg-muted hover:border-line-strong hover:text-fg",
              )}
            >
              {f.label}
              <span className="ml-1.5 text-[11px] text-fg-dim">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

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
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-ink-850/60">
                  {["Case ref", "Latest record", "Officer", "Device", "Evidence status", "Handoff", "Anchor", "Updated"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-fg-dim"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((s) => {
                  const v = verdictFor(s.case_ref);
                  return (
                    <tr
                      key={s.case_ref}
                      className="group cursor-pointer transition-colors hover:bg-ink-750/60"
                      onClick={() => {
                        window.location.href = `/cases/${s.case_ref}`;
                      }}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/cases/${s.case_ref}`}
                          className="mono text-[13px] font-semibold text-fg group-hover:text-brand"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {s.case_ref}
                        </Link>
                        <div className="mt-0.5 max-w-[220px] truncate text-[11.5px] text-fg-dim">
                          {s.place}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {s.latest_record ? <RecordTypePill type={s.latest_record.type} /> : "—"}
                      </td>
                      <td className="mono whitespace-nowrap px-4 py-3 text-[12.5px] text-fg-muted">{s.officer_id}</td>
                      <td className="mono whitespace-nowrap px-4 py-3 text-[12.5px] text-fg-muted">{s.device_id}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          <StagePill stage={s.stage} />
                          {v ? (
                            v.verified ? (
                              <Pill tone={v.degraded ? "warn" : "ok"} icon={<Check size={11} />}>
                                {v.degraded ? "Verified — degraded" : "Verified"}
                              </Pill>
                            ) : (
                              <Pill tone="danger" icon={<X size={11} />}>
                                Chain broken
                              </Pill>
                            )
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <HandoffPill status={s.handoff_status} />
                      </td>
                      <td className="px-4 py-3">
                        <AnchorPill state={s.anchor_state} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[12px] text-fg-muted">
                        {fmtRelative(s.latest_update)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
