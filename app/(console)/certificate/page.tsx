"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { FileBadge } from "@/components/ui/icons";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Button,
  ButtonLink,
  Callout,
  EmptyState,
  HashChip,
  Panel,
  PanelHead,
  Pill,
} from "@/components/ui/primitives";
import { fmtDateTime } from "@/lib/format";
import { summariseAll } from "@/lib/domain/status";

export default function CertificatesPage() {
  const { store } = useApp();
  if (!store) return null;

  const summaries = summariseAll(store);
  const ready = summaries.filter((s) => s.certificate_ready && !s.has_certificate);

  return (
    <>
      <PageHeader
        eyebrow="Court output"
        title="Certificates"
        subtitle="Section 63 Schedule certificates (BSA 2023 s.63(4)(c)). Part A is filled from the verified records; Part B is left for the expert to sign."
      />

      <Callout tone="info" title="Two rules this system does not bend" icon={<Info size={13} />}>
        SHA-256 is always the algorithm, even though the Schedule still offers MD5 as a checkbox.
        And Part B is never auto-signed: the system is not the expert, and who may sign Part B was
        expressly left open by the Supreme Court.
      </Callout>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Panel className="min-w-0">
          <PanelHead
            title="Generated certificates"
            subtitle="Each hash was computed over the records the case actually holds."
            icon={<FileBadge size={16} />}
          />
          {store.certificates.length === 0 ? (
            <EmptyState
                scene
              icon={<FileBadge size={22} />}
              title="No certificate has been generated"
              body="A certificate needs at least one anchored record and a verified two-party handoff, so the hash it certifies is bounded in time and complete."
            />
          ) : (
            <ul className="divide-y divide-line">
              {store.certificates.map((c) => (
                <li key={c.certificate_id}>
                  <Link
                    href={`/certificate/${c.case_ref}`}
                    className="block px-5 py-4 transition-colors hover:bg-ink-750/60"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono text-[13.5px] font-semibold text-fg">
                        {c.certificate_id}
                      </span>
                      <Pill tone="brand">{c.algorithm}</Pill>
                      <span className="mono text-[12.5px] text-fg-muted">{c.case_ref}</span>
                      <span className="ml-auto text-[11.5px] text-fg-dim">
                        {fmtDateTime(c.generated_at)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-fg-muted">
                      <span className="flex items-center gap-1.5">
                        <span className="text-fg-dim">Hash</span>
                        <HashChip value={c.hash} tone="brand" />
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="text-fg-dim">Tree head</span>
                        <HashChip value={c.tree_head} tone="ok" />
                      </span>
                      <span>{c.record_ids.length} record(s)</span>
                      <span className="text-fg-dim">Part B: blank</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="min-w-0">
          <PanelHead
            title="Ready to generate"
            subtitle="Cases that meet the preconditions but have no certificate yet."
          />
          {ready.length === 0 ? (
            <EmptyState
              icon={<FileBadge size={22} />}
              title="Nothing is waiting"
              body="Every case that is anchored with a verified two-party handoff already has its certificate."
            />
          ) : (
            <ul className="divide-y divide-line">
              {ready.map((s) => (
                <li key={s.case_ref} className="flex flex-wrap items-center gap-2 px-5 py-3.5">
                  <span className="mono text-[13px] font-semibold text-fg">{s.case_ref}</span>
                  <span className="text-[12px] text-fg-muted">{s.record_count} records</span>
                  <ButtonLink
                    href={`/certificate/${s.case_ref}`}
                    className="ml-auto"
                    size="sm"
                    icon={<ArrowRight size={13} />}
                  >
                    Generate
                  </ButtonLink>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
