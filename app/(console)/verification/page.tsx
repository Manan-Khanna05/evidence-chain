"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RefreshCw, RotateCcw, Siren } from "lucide-react";
import {
  Check,
  MonitorPlay,
  TriangleAlert,
  X,
} from "@/components/ui/icons";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Button,
  ButtonLink,
  Callout,
  Panel,
  PanelHead,
  Pill,
  cx,
} from "@/components/ui/primitives";
import { Select } from "@/components/ui/form";
import type { VerificationResult } from "@/lib/domain/verify";
import { CheckList, Verdict } from "@/features/verification/checks";
import { ChainView } from "@/features/case/chain-view";
import { RecordDrawer } from "@/features/records/record-drawer";
import type { EvidenceRecord } from "@/lib/domain/types";
import { recordsForCase } from "@/lib/domain/records";
import { AssetImage } from "@/components/ui/asset-image";
import { TechnicalDetailsDrawer } from "@/components/ui/tech-drawer";

export default function VerificationPage() {
  return (
    <React.Suspense fallback={<div className="py-10 text-[13.5px] text-fg-muted">Loading verifier…</div>}>
      <VerificationView />
    </React.Suspense>
  );
}

function VerificationView() {
  const params = useSearchParams();
  const { store, verify, run } = useApp();
  const [scope, setScope] = React.useState<string>(params.get("case") ?? "CASE-2026-00421");
  const [result, setResult] = React.useState<VerificationResult | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [drawerRecord, setDrawerRecord] = React.useState<EvidenceRecord | null>(null);

  const stamp = store ? `${store.records.length}:${store.tamper.length}:${store.anchors.length}` : "";

  const runVerify = React.useCallback(async () => {
    setResult(null);
    const r = await verify(scope);
    setResult(r);
  }, [verify, scope]);

  React.useEffect(() => {
    void runVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, stamp]);

  if (!store) return null;

  const demoTampers = store.tamper.filter((t) => t.source === "demo");
  const seedTampers = store.tamper.filter((t) => t.source === "seed");
  const scopedRecords =
    scope === "all" ? store.records : recordsForCase(store.records, scope);

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

  const checkOf = (id: string) => result?.checks.find((c) => c.id === id) ?? null;
  const SIMPLE: { id: string; ok: string; bad: string }[] = [
    { id: "payload_hash", ok: "Record contents match what was captured", bad: "Record contents were changed" },
    { id: "signature", ok: "Officer device signatures are valid", bad: "A signature does not match" },
    { id: "chain_linkage", ok: "Records link correctly, in order", bad: "A link in the chain is broken" },
    { id: "case_chain", ok: "Each case's own chain is unbroken", bad: "A case's chain is broken" },
    { id: "merkle_inclusion", ok: "Every synced record is in the Merkle log", bad: "A record is missing from the Merkle log" },
    { id: "merkle_consistency", ok: "The Merkle log only ever grew", bad: "The Merkle log history was rewritten" },
    { id: "tsa_anchor", ok: "Trusted-time anchors are confirmed", bad: "A trusted-time anchor failed" },
    { id: "handoff", ok: "RPF → GRP handoff signatures match", bad: "The handoff does not match" },
  ];
  const scopeLabel = scope === "all" ? "Whole log" : scope;

  return (
    <>
      <PageHeader
        eyebrow="Independent check"
        title="Verification"
        subtitle="Is this evidence chain intact? The answer is recomputed from the stored records every time — nothing is cached."
        actions={
          <>
            <Button busy={!result} icon={<RefreshCw size={16} />} onClick={runVerify}>
              Check again
            </Button>
            <ButtonLink href={`/projector?case=${encodeURIComponent(scope)}`} variant="primary" icon={<MonitorPlay size={16} />}>
              Projector mode
            </ButtonLink>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-[360px]">
          <Select aria-label="What to verify" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">Whole log — every record in the store</option>
            {store.cases.map((c) => (
              <option key={c.case_ref} value={c.case_ref}>
                {c.case_ref} — {c.place}
              </option>
            ))}
          </Select>
        </div>
        <Pill tone="neutral">{scopedRecords.length} records in scope</Pill>
      </div>

      {/* ------------------------------------------------ the plain answer */}
      <Panel className="mb-5 overflow-hidden">
        <div className="grid items-center gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:p-7">
          <div className="min-w-0">
            <h2 className="text-[20px] font-semibold text-fg">Is this evidence chain intact?</h2>
            {!result ? (
              <div className="mt-6 flex items-center gap-3 text-fg-muted">
                <RefreshCw size={18} className="animate-spin text-brand" />
                <span className="text-[15px]">Checking {scopeLabel}…</span>
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-4">
                  <span
                    className={cx(
                      "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl",
                      result.verified ? (result.degraded ? "bg-warn/15 text-warn" : "bg-ok/15 text-ok") : "bg-danger/15 text-danger",
                    )}
                  >
                    {result.verified ? <Check size={36} strokeWidth={3} /> : <TriangleAlert size={34} strokeWidth={2.4} />}
                  </span>
                  <div>
                    <div
                      className={cx(
                        "font-display text-[30px] font-bold leading-tight tracking-tight",
                        result.verified ? (result.degraded ? "text-[#855A14]" : "text-ok") : "text-danger",
                      )}
                    >
                      {result.verified ? "Evidence chain verified" : "Integrity attention"}
                    </div>
                    <div className="mt-1.5 text-[14px] text-fg-muted">
                      {result.verified ? "Intact — " : "A record no longer matches what was signed — "}
                      {scopeLabel} · {result.record_count} record{result.record_count === 1 ? "" : "s"} checked
                    </div>
                  </div>
                </div>

                {!result.verified && result.broken_record_id ? (
                  <div className="mt-5 rounded-2xl border border-danger/30 bg-danger/[0.06] px-4 py-3.5">
                    <div className="text-[15px] font-semibold text-fg">
                      Record <span className="mono">{result.broken_record_id}</span> no longer matches what was signed.
                    </div>
                    <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">
                      Everything captured after it on the same device can no longer be trusted to be in its original order.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const r = store.records.find((x) => x.record_id === result.broken_record_id);
                        if (r) setDrawerRecord(r);
                      }}
                      className="mt-2 inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold text-brand hover:underline"
                    >
                      Open this record
                    </button>
                  </div>
                ) : null}
                {result.verified && result.degraded ? (
                  <p className="mt-4 text-[14px] text-[#855A14]">
                    One time authority was unavailable. The chain still verifies.
                  </p>
                ) : null}

                <ul className="mt-5 space-y-2.5">
                  {SIMPLE.map((c) => {
                    const r = checkOf(c.id);
                    if (!r || r.status === "not_applicable") return null;
                    const pass = r.status === "pass";
                    const degraded = r.status === "degraded";
                    return (
                      <li key={c.id} className="flex items-center gap-3 text-[15px]">
                        <span
                          className={cx(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                            pass ? "bg-ok text-white" : degraded ? "bg-warn text-white" : "bg-danger text-white",
                          )}
                        >
                          {pass ? <Check size={16} strokeWidth={3} /> : degraded ? <TriangleAlert size={14} /> : <X size={16} strokeWidth={3} />}
                        </span>
                        <span className={pass ? "text-fg" : "font-semibold text-fg"}>{pass || degraded ? c.ok : c.bad}</span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <TechnicalDetailsDrawer
                buttonVariant="secondary"
                buttonSize="md"
                subtitle="Every check, the Merkle tree head, and the chain the checks were run against."
              >
                <div className="space-y-5">
                  <Verdict result={result} scopeLabel={scopeLabel} />
                  <div className="rounded-2xl border border-line">
                    {result ? <CheckList result={result} /> : null}
                  </div>
                  <div>
                    <div className="label mb-2">Chain under inspection</div>
                    <ChainView
                      records={scopedRecords}
                      store={store}
                      onOpenRecord={setDrawerRecord}
                      treeHead={result?.tree_head ?? null}
                    />
                  </div>
                </div>
              </TechnicalDetailsDrawer>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[333px] lg:w-[320px]">
            <AssetImage name="helpVerify" alt="Laptop showing Evidence Verified with four checks passed" />
          </div>
        </div>
      </Panel>

      {/* ------------------------------------------------ tamper demo */}
      <Panel className={cx(store.tamper.length > 0 && "border-danger/30")}>
        <PanelHead
          title="Tamper demonstration"
          subtitle="A real change to a stored record — not an animation. Verification then catches it."
          icon={<Siren size={16} />}
          right={<Pill tone="sim">DEMO / TRAINING</Pill>}
        />
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="danger"
                size="lg"
                busy={busy === "tamper"}
                icon={<Siren size={17} />}
                onClick={() =>
                  act("tamper", "demo.tamper", undefined, {
                    title: "A record was altered (demo)",
                    body: "Verification now fails and names the record.",
                  })
                }
              >
                Simulate tampering
              </Button>
              <Button
                variant="success"
                size="lg"
                busy={busy === "restore"}
                disabled={demoTampers.length === 0}
                icon={<RotateCcw size={17} />}
                onClick={() =>
                  act("restore", "demo.restore", undefined, {
                    title: "Demo data restored",
                    body: "The altered records were replaced with the originals.",
                  })
                }
              >
                Restore chain
              </Button>
            </div>
            <p className="text-[14px] leading-relaxed text-fg-muted">
              &ldquo;Simulate tampering&rdquo; edits a stored record the way someone with database
              access would, even recomputing its fingerprint to hide the change. The officer&apos;s
              signature was made over the original, so it stops matching — and every later record
              on that device loses its link.
            </p>
            {seedTampers.length ? (
              <p className="text-[13px] leading-relaxed text-fg-dim">
                &ldquo;Restore chain&rdquo; undoes only changes made with this control. The seeded
                example in{" "}
                <span className="mono">
                  {store.records.find((r) => r.record_id === seedTampers[0].record_id)?.case_ref}
                </span>{" "}
                stays broken on purpose, so a failure can always be shown. Use{" "}
                <Link href="/demo" className="text-brand hover:underline">
                  Reset demo
                </Link>{" "}
                to return everything to the seeded state.
              </p>
            ) : null}
          </div>

          <div>
            {store.tamper.length ? (
              <ul className="space-y-2">
                {store.tamper.map((t) => (
                  <li key={t.record_id} className="rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono text-[13px] font-semibold text-fg">{t.record_id}</span>
                      <Pill tone={t.source === "seed" ? "neutral" : "danger"}>
                        {t.source === "seed" ? "Seeded example" : "Demo tamper"}
                      </Pill>
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{t.note}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Callout tone="ok" title="Nothing is altered">
                Every record in the store still matches what was signed.
              </Callout>
            )}
          </div>
        </div>
      </Panel>

      <RecordDrawer record={drawerRecord} store={store} onClose={() => setDrawerRecord(null)} />
    </>
  );
}
