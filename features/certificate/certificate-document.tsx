"use client";

import * as React from "react";
import { BadgeCheck } from "lucide-react";
import type { Certificate, ClientStore } from "@/lib/domain/types";
import { fmtDate, fmtDateTime, fmtInterval, fmtTime } from "@/lib/format";
import { Panel } from "@/components/ui/primitives";

/**
 * Section 63 Schedule certificate, BSA 2023.
 *
 * Part A is auto-filled from what the system actually holds. Part B is left
 * blank: the system is not the expert, and who may sign Part B is a question
 * the courts have expressly left open.
 *
 * SHA-256 always. The Schedule offers MD5 as a checkbox; NIST SP 800-86 bars
 * it, so it is never selected here.
 */
export function CertificateDocument({
  certificate,
  store,
}: {
  certificate: Certificate;
  store: ClientStore;
}) {
  const kase = store.cases.find((c) => c.case_ref === certificate.case_ref);
  const records = store.records.filter((r) => certificate.record_ids.includes(r.record_id));
  const device = store.devices.find((d) => d.device_id === records[0]?.device_id);
  const signatory = store.officers.find(
    (o) => o.officer_id === certificate.part_a_signatory_officer_id,
  );
  const anchor = store.anchors.find((a) => a.anchor_id === certificate.anchor_id) ?? null;

  return (
    <Panel className="print-sheet overflow-hidden bg-white text-[#111827]">
      {/* ------------------------------------------------------- masthead */}
      <div className="border-b-2 border-[#111827] px-7 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BadgeCheck size={17} />
              <span className="text-[11px] font-bold uppercase tracking-[0.22em]">
                Evidence Chain
              </span>
            </div>
            <h2 className="mt-2 text-[21px] font-bold leading-tight tracking-tight">
              Certificate under Section 63(4)(c)
            </h2>
            <p className="text-[13px] text-[#374151]">
              The Schedule · Bharatiya Sakshya Adhiniyam, 2023
            </p>
          </div>
          <div className="text-right text-[11px] leading-relaxed">
            <div className="font-mono font-semibold">{certificate.certificate_id}</div>
            <div className="text-[#4b5563]">{fmtDateTime(certificate.generated_at)}</div>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-7 py-6">
        {/* ---------------------------------------------------- part a */}
        <Section title="Part A — to be filled by the person in charge of the computer or communication device">
          <Grid>
            <Cell label="Case reference" value={certificate.case_ref} mono />
            <Cell label="Place" value={kase?.place ?? "—"} />
            <Cell label="Person in charge" value={signatory ? signatory.name : certificate.part_a_signatory_officer_id} />
            <Cell
              label="Designation / force"
              value={signatory ? `${signatory.rank}, ${signatory.force}` : "—"}
            />
          </Grid>

          <SubTitle>Device particulars</SubTitle>
          <Grid>
            <Cell label="Device type" value={device?.device_type ?? "—"} />
            <Cell label="Make" value={device?.make ?? "—"} />
            <Cell label="Model" value={device?.model ?? "—"} />
            <Cell label="Serial number" value={device?.serial ?? "—"} mono />
            <Cell
              label={device?.hardware_identifier_kind ?? "IMEI / UIN / UID / MAC / Cloud ID"}
              value={device?.hardware_identifier ?? "—"}
              mono
            />
            <Cell label="Records certified" value={`${certificate.record_ids.length}`} />
          </Grid>

          <SubTitle>Hash</SubTitle>
          <div className="rounded-lg border-2 border-[#111827] px-4 py-3.5">
            <p className="text-[12.5px] leading-relaxed">
              I state that the HASH value/s of the electronic/digital record/s is
            </p>
            <div className="mono mt-2 break-all rounded border border-[#d1d5db] bg-[#f9fafb] px-3 py-2 text-[12px] font-semibold">
              {certificate.hash}
            </div>
            <p className="mt-2.5 text-[12.5px]">obtained through the following algorithm:—</p>
            <div className="mt-2 flex flex-wrap gap-4 text-[12.5px]">
              <Checkbox label="SHA1" checked={false} />
              <Checkbox label="SHA256" checked />
              <Checkbox label="MD5" checked={false} note="not used — barred by NIST SP 800-86" />
              <Checkbox label="Other" checked={false} />
            </div>
            <p className="mt-2.5 text-[11px] italic text-[#4b5563]">
              (Hash report to be enclosed with the certificate.)
            </p>
          </div>

          <SubTitle>Records covered by this hash</SubTitle>
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="border-b border-[#9ca3af] text-left">
                <th className="py-1.5 pr-3 font-bold uppercase tracking-wider">Record ID</th>
                <th className="py-1.5 pr-3 font-bold uppercase tracking-wider">Type</th>
                <th className="py-1.5 pr-3 font-bold uppercase tracking-wider">Seq</th>
                <th className="py-1.5 pr-3 font-bold uppercase tracking-wider">Payload hash</th>
                <th className="py-1.5 font-bold uppercase tracking-wider">Claimed time</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.record_id} className="border-b border-[#e5e7eb]">
                  <td className="py-1.5 pr-3 font-mono">{r.record_id}</td>
                  <td className="py-1.5 pr-3">{TYPE_TEXT[r.type]}</td>
                  <td className="py-1.5 pr-3 font-mono">#{r.seq}</td>
                  <td className="py-1.5 pr-3 font-mono">{r.payload_hash.slice(0, 24)}…</td>
                  <td className="py-1.5 font-mono">{fmtTime(r.claimed_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <SubTitle>Integrity context</SubTitle>
          <Grid>
            <Cell label="Merkle tree head" value={certificate.tree_head} mono small />
            <Cell label="Anchor" value={certificate.anchor_id ?? "Not anchored"} mono />
            <Cell
              label="Trusted interval"
              value={anchor ? fmtInterval(anchor.interval_start, anchor.interval_end) : "—"}
            />
            <Cell
              label="Timestamp authorities"
              value={
                anchor
                  ? anchor.tsa
                      .map((t) => `${t.tsa_name}: ${t.status === "verified" ? "verified" : "unavailable"}`)
                      .join(" · ")
                  : "—"
              }
              small
            />
          </Grid>
          <p className="text-[11px] leading-relaxed text-[#4b5563]">
            The device clock recorded against each record is untrusted and is stated as claimed time
            only. The interval above is the bound established by the timestamp anchors.
          </p>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <SignatureLine label="Signature" />
            <SignatureLine label="Date" value={fmtDate(certificate.generated_at)} />
          </div>
        </Section>

        {/* ---------------------------------------------------- part b */}
        <Section title="Part B — to be filled by the expert">
          <p className="text-[12.5px] leading-relaxed">
            I state that the HASH value/s of the electronic/digital record/s is
            <span className="mx-2 inline-block min-w-[220px] border-b border-[#111827] align-bottom">
              &nbsp;
            </span>
            obtained through the following algorithm:—
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-[12.5px]">
            <Checkbox label="SHA1" checked={false} />
            <Checkbox label="SHA256" checked={false} />
            <Checkbox label="MD5" checked={false} />
            <Checkbox label="Other" checked={false} />
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-[#9ca3af] bg-[#f9fafb] px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#4b5563]">
              Deliberately left blank
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#374151]">
              This system does not sign as the expert. Section 63(4) requires a certificate signed by
              the person in charge <em>and</em> an expert; who may sign Part B was expressly left
              open by the Supreme Court, so this part is completed by a Section 79A-notified Examiner
              of Electronic Evidence or another qualified expert, not by the software.
            </p>
          </div>

          <div className="mt-4 grid gap-6 sm:grid-cols-3">
            <SignatureLine label="Name of expert" />
            <SignatureLine label="Signature" />
            <SignatureLine label="Date" />
          </div>
        </Section>
      </div>

      <div className="border-t border-[#d1d5db] px-7 py-3 text-[10px] leading-relaxed text-[#6b7280]">
        Prototype-generated certificate · synthetic demo data · hash values are genuine SHA-256 over
        the records held in this build; signatures were produced with a software key, not a
        hardware-backed key. Integrity verification does not establish chemical identification.
      </div>
    </Panel>
  );
}

const TYPE_TEXT: Record<string, string> = {
  trigger: "s.43 trigger",
  field_test: "Field test",
  handoff_transfer: "Handoff transfer",
  handoff_receipt: "Handoff receipt",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 border-b border-[#111827] pb-1.5 text-[12px] font-bold uppercase tracking-[0.13em]">
        {title}
      </h3>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6b7280]">
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Cell({
  label,
  value,
  mono,
  small,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#6b7280]">{label}</div>
      <div
        className={`mt-0.5 break-words text-[#111827] ${mono ? "font-mono" : ""} ${small ? "text-[10.5px]" : "text-[12.5px]"}`}
      >
        {value}
      </div>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  note,
}: {
  label: string;
  checked: boolean;
  note?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`flex h-3.5 w-3.5 items-center justify-center border ${checked ? "border-[#111827] bg-[#111827] text-white" : "border-[#6b7280]"}`}
      >
        {checked ? <span className="text-[9px] leading-none">✓</span> : null}
      </span>
      <span className={checked ? "font-semibold" : ""}>{label}</span>
      {note ? <span className="text-[10px] italic text-[#6b7280]">({note})</span> : null}
    </span>
  );
}

function SignatureLine({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="h-7 border-b border-[#111827] text-[12px]">{value ?? ""}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.13em] text-[#6b7280]">
        {label}
      </div>
    </div>
  );
}
