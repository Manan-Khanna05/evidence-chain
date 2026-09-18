"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, CircleDashed, RefreshCw, X } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Button, ButtonLink, cx } from "@/components/ui/primitives";
import { BrandLockup } from "@/components/brand/marks";
import { ASSETS } from "@/lib/assets";
import { fmtInterval, fmtTime } from "@/lib/format";
import { summariseCase } from "@/lib/domain/status";
import type { VerificationResult } from "@/lib/domain/verify";

/**
 * Projector mode. Minimal chrome, very large type, readable from several metres.
 */
export default function ProjectorPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-fg-muted">
          <CircleDashed size={20} className="animate-spin" />
        </div>
      }
    >
      <ProjectorView />
    </React.Suspense>
  );
}

function ProjectorView() {
  const params = useSearchParams();
  const { store, verify } = useApp();
  const scope = params.get("case") ?? "CASE-2026-00421";
  const [result, setResult] = React.useState<VerificationResult | null>(null);

  const stamp = store ? `${store.records.length}:${store.tamper.length}:${store.anchors.length}` : "";

  const runVerify = React.useCallback(async () => {
    setResult(null);
    setResult(await verify(scope));
  }, [verify, scope]);

  React.useEffect(() => {
    void runVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, stamp]);

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center text-fg-muted">
        <CircleDashed size={20} className="animate-spin" />
      </div>
    );
  }

  const kase = store.cases.find((c) => c.case_ref === scope) ?? null;
  const summary = kase ? summariseCase(store, kase) : null;
  const certificate = store.certificates.find((c) => c.case_ref === scope) ?? null;
  const good = result?.verified ?? false;

  const rows: { k: string; v: string; ok: boolean | null }[] = result
    ? [
        {
          k: "Trigger",
          v: summary?.records.some((r) => r.type === "trigger") ? "Signed" : "Absent",
          ok: summary?.records.some((r) => r.type === "trigger") ?? null,
        },
        {
          k: "Field test",
          v: summary?.records.some((r) => r.type === "field_test") ? "Recorded" : "Absent",
          ok: summary?.records.some((r) => r.type === "field_test") ?? null,
        },
        {
          k: "Hash chain",
          v: check(result, "chain_linkage") ? "Intact" : "Broken",
          ok: check(result, "chain_linkage"),
        },
        {
          k: "Signatures",
          v: check(result, "signature") ? "Valid" : "Invalid",
          ok: check(result, "signature"),
        },
        {
          k: "Merkle tree",
          v: check(result, "merkle_inclusion") ? "Verified" : "Failed",
          ok: check(result, "merkle_inclusion"),
        },
        {
          k: "Timestamp anchors",
          v:
            result.checks.find((c) => c.id === "tsa_anchor")?.status === "degraded"
              ? "One authority — degraded"
              : check(result, "tsa_anchor")
                ? "Two authorities"
                : "Failed",
          ok: check(result, "tsa_anchor"),
        },
        {
          k: "Bounded time",
          v: summary?.interval
            ? fmtInterval(summary.interval.start, summary.interval.end)
            : "Not anchored",
          ok: Boolean(summary?.interval),
        },
        {
          k: "Handoff",
          v:
            summary?.handoff_status === "verified"
              ? "RPF → GRP verified"
              : summary?.handoff_status === "mismatch"
                ? "Transfer mismatch"
                : summary?.handoff_status === "awaiting_receipt"
                  ? "Awaiting GRP receipt"
                  : "Not started",
          ok: summary?.handoff_status === "verified",
        },
        {
          k: "Certificate",
          v: certificate ? "Ready" : summary?.certificate_ready ? "Can be generated" : "Not ready",
          ok: Boolean(certificate),
        },
      ]
    : [];

  return (
    <div className="relative min-h-screen px-6 py-6 lg:px-12 lg:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[240px] opacity-60"
        style={{
          backgroundImage: `url(${ASSETS.railwayHero.src})`,
          backgroundSize: "cover",
          backgroundPosition: "right 62%",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(246,248,252,0.5) 0%, rgba(246,248,252,0.95) 30%, rgba(246,248,252,1) 55%)",
        }}
      />
      <div className="relative no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <ButtonLink href="/verification" variant="ghost" icon={<ArrowLeft size={15} />}>
            Back to verifier
          </ButtonLink>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-fg-dim">Synthetic demo data</span>
          <Button size="sm" icon={<RefreshCw size={14} />} onClick={runVerify}>
            Re-run
          </Button>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-3"><BrandLockup subtitle="Verifier · Projector mode" /></div>
        <h1 className="mono text-[40px] font-bold leading-none tracking-tight text-fg lg:text-[64px]">
          {scope}
        </h1>
        {kase ? (
          <p className="mt-3 text-[18px] text-fg-muted lg:text-[22px]">
            {kase.title} · {kase.place}
          </p>
        ) : null}

        {!result ? (
          <div className="mt-14 flex items-center gap-4 text-fg-muted">
            <CircleDashed size={30} className="animate-spin" />
            <span className="text-[24px]">Re-walking the chain…</span>
          </div>
        ) : (
          <>
            <div
              className={cx(
                "mt-8 flex flex-wrap items-center gap-6 rounded-3xl border-4 px-8 py-8 lg:px-12",
                good ? "border-ok/60 bg-ok/[0.09]" : "border-danger/60 bg-danger/[0.09]",
              )}
            >
              <div
                className={cx(
                  "flex h-[110px] w-[110px] shrink-0 items-center justify-center rounded-3xl border-4 lg:h-[140px] lg:w-[140px]",
                  good ? "border-ok text-ok" : "border-danger text-danger",
                )}
              >
                {good ? <Check size={82} strokeWidth={3.5} /> : <X size={82} strokeWidth={3.5} />}
              </div>
              <div className="min-w-0">
                <div
                  className={cx(
                    "text-[52px] font-bold uppercase leading-[0.95] tracking-tight lg:text-[84px]",
                    good ? "text-ok" : "text-danger",
                  )}
                >
                  {good ? "Verified" : "Chain broken"}
                </div>
                <div className="mt-3 text-[20px] text-fg-muted lg:text-[26px]">
                  {result.record_count} records · {result.anchored_count} anchored · tree size{" "}
                  {result.tree_size}
                </div>
              </div>
            </div>

            {!good && result.broken_record_id ? (
              <div className="panel panel-solid mt-6 border-2 border-danger/50 px-8 py-6">
                <div className="text-[16px] font-bold uppercase tracking-[0.16em] text-danger">
                  Broken record
                </div>
                <div className="mono mt-2 text-[42px] font-bold leading-none text-fg lg:text-[56px]">
                  {result.broken_record_id}
                </div>
                <div className="mt-3 text-[18px] leading-snug text-fg-muted lg:text-[21px]">
                  {result.broken_reason}
                </div>
              </div>
            ) : null}

            <div className="mt-8 grid gap-x-10 gap-y-1 md:grid-cols-2">
              {rows.map((r) => (
                <div
                  key={r.k}
                  className="flex items-center justify-between gap-4 border-b border-line py-3.5"
                >
                  <span className="text-[19px] font-medium uppercase tracking-[0.06em] text-fg-muted lg:text-[22px]">
                    {r.k}
                  </span>
                  <span className="flex items-center gap-2.5">
                    <span
                      className={cx(
                        "text-[19px] font-semibold lg:text-[22px]",
                        r.ok === true ? "text-ok" : r.ok === false ? "text-danger" : "text-fg-muted",
                      )}
                    >
                      {r.v}
                    </span>
                    {r.ok === true ? (
                      <Check size={24} className="text-ok" />
                    ) : r.ok === false ? (
                      <X size={24} className="text-danger" />
                    ) : null}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div>
                <div className="text-[14px] font-bold uppercase tracking-[0.16em] text-fg-dim">
                  Tree head
                </div>
                <div className="mono mt-1.5 break-all text-[17px] text-fg lg:text-[19px]">
                  {result.tree_head}
                </div>
              </div>
              <div>
                <div className="text-[14px] font-bold uppercase tracking-[0.16em] text-fg-dim">
                  Latest anchor
                </div>
                <div className="mono mt-1.5 text-[24px] tabular-nums text-fg lg:text-[28px]">
                  {result.latest_anchor_time ? fmtTime(result.latest_anchor_time) : "—"}
                </div>
              </div>
            </div>

            <p className="mt-10 border-t border-line pt-5 text-[16px] leading-relaxed text-fg-dim lg:text-[18px]">
              Integrity verification does not establish chemical identification.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function check(result: VerificationResult, id: string): boolean {
  const c = result.checks.find((x) => x.id === id);
  if (!c) return false;
  return c.status === "pass" || c.status === "degraded" || c.status === "not_applicable";
}
