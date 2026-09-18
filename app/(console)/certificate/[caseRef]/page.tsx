"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  FileBadge,
  Info,
  Printer,
  ShieldCheck,
  X,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Button,
  ButtonLink,
  Callout,
  EmptyState,
  HashChip,
  KeyValue,
  Panel,
  PanelHead,
  Pill,
} from "@/components/ui/primitives";
import { fmtDateTime } from "@/lib/format";
import { summariseCase } from "@/lib/domain/status";
import { CertificateDocument } from "@/features/certificate/certificate-document";
import { exportCertificatePdf } from "@/features/certificate/export-pdf";

interface HashCheck {
  matches: boolean;
  stored: string;
  recomputed: string;
  algorithm: string;
}

export default function CertificatePage() {
  const params = useParams<{ caseRef: string }>();
  const caseRef = decodeURIComponent(params.caseRef);
  const { store, officer, run } = useApp();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [hashCheck, setHashCheck] = React.useState<HashCheck | null>(null);

  const certificate = store?.certificates.find((c) => c.case_ref === caseRef) ?? null;

  React.useEffect(() => {
    setHashCheck(null);
  }, [certificate?.hash, store?.tamper.length]);

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
            <ButtonLink href="/certificate" icon={<ArrowLeft size={14} />}>Back to certificates</ButtonLink>
          }
        />
      </Panel>
    );
  }

  const summary = summariseCase(store, kase);

  const generate = async () => {
    setBusy("generate");
    await run("certificate.generate", {
      case_ref: caseRef,
      officer_id: officer?.officer_id ?? summary.officer_id,
    }, {
      toast: {
        title: "Certificate generated",
        body: "Part A auto-filled from the records; Part B left blank for the expert.",
      },
    });
    setBusy(null);
  };

  const verifyHash = async () => {
    setBusy("hash");
    const res = await run<HashCheck>("certificate.verify_hash", { case_ref: caseRef });
    setBusy(null);
    if (res.ok && res.result) setHashCheck(res.result);
  };

  const download = async () => {
    if (!certificate) return;
    setBusy("pdf");
    try {
      await exportCertificatePdf(certificate, store);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={
          <span>
            <Link href="/certificate" className="transition-colors hover:text-fg">
              Certificates
            </Link>
            <span className="mx-1.5 text-fg-dim">/</span>
            {caseRef}
          </span>
        }
        title="Section 63 Schedule certificate"
        subtitle={`${kase.title} · ${kase.place}`}
        status={certificate ? <Pill tone="brand">{certificate.algorithm}</Pill> : null}
        actions={
          certificate ? (
            <>
              <Button
                icon={<ShieldCheck size={15} />}
                busy={busy === "hash"}
                onClick={verifyHash}
              >
                Verify certificate hash
              </Button>
              <Button className="no-print" icon={<Printer size={15} />} onClick={() => window.print()}>
                Print
              </Button>
              <Button
                variant="primary"
                icon={<Download size={15} />}
                busy={busy === "pdf"}
                onClick={download}
              >
                Export certificate (PDF)
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              icon={<FileBadge size={15} />}
              busy={busy === "generate"}
              disabled={!summary.certificate_ready}
              onClick={generate}
            >
              Generate certificate
            </Button>
          )
        }
      />

      {!certificate ? (
        <Panel>
          <EmptyState
            icon={<FileBadge size={22} />}
            title="No certificate for this case yet"
            body={
              summary.certificate_ready
                ? "All preconditions are met. Generating it fills Part A from the device particulars, record hashes and anchor this case already holds."
                : "A certificate needs at least one anchored record and a verified two-party handoff, so the hash it certifies is bounded in time and covers a complete chain."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  disabled={!summary.certificate_ready}
                  busy={busy === "generate"}
                  onClick={generate}
                >
                  Generate certificate
                </Button>
                <ButtonLink href={`/cases/${caseRef}`} variant="ghost">Open case</ButtonLink>
              </div>
            }
          />
        </Panel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <CertificateDocument certificate={certificate} store={store} />

          <div className="no-print space-y-5">
            <Panel className="min-w-0">
              <PanelHead
                title="Certificate hash"
                subtitle="Recomputed from the records as they stand right now, then compared."
                icon={<ShieldCheck size={16} />}
              />
              <div className="space-y-4 p-5">
                <KeyValue k="Stored hash" hint="Computed when the certificate was generated">
                  <HashChip value={certificate.hash} full tone="brand" />
                </KeyValue>

                {hashCheck ? (
                  <>
                    <KeyValue k="Recomputed now">
                      <HashChip
                        value={hashCheck.recomputed}
                        full
                        tone={hashCheck.matches ? "ok" : "danger"}
                      />
                    </KeyValue>
                    <div
                      className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 ${
                        hashCheck.matches
                          ? "border-ok/45 bg-ok/[0.08]"
                          : "border-danger/50 bg-danger/[0.09]"
                      }`}
                    >
                      {hashCheck.matches ? (
                        <Check size={20} className="text-ok" />
                      ) : (
                        <X size={20} className="text-danger" />
                      )}
                      <div>
                        <div
                          className={`text-[14px] font-semibold ${hashCheck.matches ? "text-ok" : "text-danger"}`}
                        >
                          {hashCheck.matches
                            ? "Certificate hash matches the record hash"
                            : "Certificate hash mismatch"}
                        </div>
                        <div className="text-[12px] text-fg-muted">
                          {hashCheck.matches
                            ? `Recomputed with ${hashCheck.algorithm} over the same records and the same tree head.`
                            : "The records this certificate covers are no longer the records it was generated from."}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <Callout tone="neutral">
                    Run the check to recompute the hash over the current records and compare it with
                    the value printed on the certificate.
                  </Callout>
                )}

                <Button
                  className="w-full"
                  busy={busy === "hash"}
                  onClick={verifyHash}
                  icon={<ShieldCheck size={15} />}
                >
                  Verify certificate hash
                </Button>
              </div>
            </Panel>

            <Panel className="min-w-0">
              <PanelHead title="Certificate metadata" />
              <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-5">
                <KeyValue k="Certificate ID">
                  <span className="mono">{certificate.certificate_id}</span>
                </KeyValue>
                <KeyValue k="Generated">{fmtDateTime(certificate.generated_at)}</KeyValue>
                <KeyValue k="Algorithm" hint="MD5 is offered by the Schedule and never used here">
                  <Pill tone="brand">{certificate.algorithm}</Pill>
                </KeyValue>
                <KeyValue k="Records covered">{certificate.record_ids.length}</KeyValue>
                <KeyValue k="Anchor">
                  <span className="mono">{certificate.anchor_id ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Part B">
                  <span className="text-fg-dim">Blank — signed by the expert</span>
                </KeyValue>
              </div>
            </Panel>

            <Callout tone="info" title="Why generating at capture time matters">
              Whether the certificate is mandatory or a curable defect is unresolved between
              co-equal benches. A system that emits a truthful certificate at the moment of record
              creation is correct under either reading — it never needs the impossibility exception
              and never needs to cure anything later.
            </Callout>
          </div>
        </div>
      )}
    </>
  );
}
