"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MonitorPlay,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Siren,
  TriangleAlert,
} from "lucide-react";
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

  return (
    <>
      <PageHeader
        eyebrow="Independent check"
        title="Evidence verifier"
        subtitle="Re-walks the chain from the stored data. Nothing here is cached, and nothing is a fixture — this runs against the live store."
        actions={
          <>
            <Button busy={!result} icon={<RefreshCw size={15} />} onClick={runVerify}>
              Re-run verification
            </Button>
            <ButtonLink href={`/projector?case=${encodeURIComponent(scope)}`} variant="primary" icon={<MonitorPlay size={15} />}>
                Projector mode
              </ButtonLink>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-[340px]">
          <Select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">Whole log — every record in the store</option>
            {store.cases.map((c) => (
              <option key={c.case_ref} value={c.case_ref}>
                {c.case_ref} — {c.place}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="neutral">{scopedRecords.length} records in scope</Pill>
          {store.tamper.length ? (
            <Pill tone="danger" icon={<TriangleAlert size={11} />}>
              {store.tamper.length} record(s) altered in storage
            </Pill>
          ) : (
            <Pill tone="ok">No altered records</Pill>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Verdict result={result} scopeLabel={scope === "all" ? "Whole log" : scope} />

          <Panel className="min-w-0">
            <PanelHead
              title="Verification checks"
              subtitle="Each is computed here and now, from the stored records."
              icon={<ShieldCheck size={16} />}
            />
            {result ? (
              <CheckList result={result} />
            ) : (
              <div className="px-5 py-8 text-[13.5px] text-fg-muted">Running checks…</div>
            )}
          </Panel>
        </div>

        <div className="min-w-0 space-y-5">
          {/* ------------------------------------------------ tamper demo */}
          <Panel className={cx(store.tamper.length > 0 && "border-danger/40")}>
            <PanelHead
              title="Tamper demonstration"
              subtitle="This is a real state change, not an animation. The stored record is edited and the verifier catches it."
              icon={<Siren size={16} />}
            />
            <div className="space-y-4 p-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="danger"
                  busy={busy === "tamper"}
                  icon={<Siren size={15} />}
                  onClick={() =>
                    act("tamper", "demo.tamper", undefined, {
                      title: "A record was altered",
                      body: "Re-run verification — the chain should now fail and name the record.",
                    })
                  }
                >
                  Simulate tampering
                </Button>
                <Button
                  variant="success"
                  busy={busy === "restore"}
                  disabled={demoTampers.length === 0}
                  icon={<RotateCcw size={15} />}
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

              <p className="text-[12px] leading-relaxed text-fg-muted">
                &ldquo;Simulate tampering&rdquo; edits a stored record the way an administrator with
                database access would: it changes a payload field and recomputes the payload hash to
                cover the tracks. The signature was made over the original hash, so it stops
                verifying — and every record after it on that device loses its link.
              </p>

              {store.tamper.length ? (
                <ul className="space-y-2">
                  {store.tamper.map((t) => (
                    <li
                      key={t.record_id}
                      className="rounded-lg border border-danger/35 bg-danger/[0.07] px-3.5 py-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono text-[12.5px] font-semibold text-fg">
                          {t.record_id}
                        </span>
                        <Pill tone={t.source === "seed" ? "neutral" : "danger"}>
                          {t.source === "seed" ? "Seeded example" : "Demo tamper"}
                        </Pill>
                      </div>
                      <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">{t.note}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Callout tone="ok" title="Nothing is altered">
                  Every record in the store hashes and verifies against what was signed.
                </Callout>
              )}

              {seedTampers.length ? (
                <p className="text-[11.5px] leading-relaxed text-fg-dim">
                  &ldquo;Restore chain&rdquo; undoes only the alterations made by this control. The
                  seeded example in{" "}
                  <span className="mono">
                    {store.records.find((r) => r.record_id === seedTampers[0].record_id)?.case_ref}
                  </span>{" "}
                  stays broken on purpose, so the failure state is always demonstrable. Use{" "}
                  <Link href="/demo" className="text-brand hover:underline">
                    Reset demo
                  </Link>{" "}
                  to return everything to the seeded state.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead
              title="Chain under inspection"
              subtitle="The records the checks above were run against."
            />
            <div className="max-h-[560px] overflow-y-auto p-5">
              <ChainView
                records={scopedRecords}
                store={store}
                onOpenRecord={setDrawerRecord}
                treeHead={result?.tree_head ?? null}
              />
            </div>
          </Panel>
        </div>
      </div>

      <RecordDrawer record={drawerRecord} store={store} onClose={() => setDrawerRecord(null)} />
    </>
  );
}
