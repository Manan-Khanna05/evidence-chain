"use client";

import * as React from "react";
import { BadgeCheck } from "lucide-react";
import { AlertTriangle } from "@/components/ui/icons";
import type { ClientStore, EvidenceRecord, FieldTestPayload } from "@/lib/domain/types";
import { fmtDate, fmtInterval, fmtTime } from "@/lib/format";
import { intervalFor } from "@/lib/domain/status";
import { resultLabel } from "@/features/records/payload-view";
import { Panel, cx } from "@/components/ui/primitives";

/**
 * Printable, document-style rendering of a field-test record — the artefact
 * that travels the whole distance from platform to Magistrate to trial.
 */
export function FieldTestDocument({
  record,
  store,
}: {
  record: EvidenceRecord;
  store: ClientStore;
}) {
  const p = record.payload as FieldTestPayload;
  const officer = store.officers.find((o) => o.officer_id === p.operator_id);
  const device = store.devices.find((d) => d.device_id === record.device_id);
  const interval = intervalFor(record, store.anchors);
  const tampered = store.tamper.some((t) => t.record_id === record.record_id);

  return (
    <Panel className="print-sheet overflow-hidden bg-white text-[#111827]">
      {/* header */}
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#111827] px-6 py-5">
        <div>
          <div className="flex items-center gap-2">
            <BadgeCheck size={18} />
            <span className="text-[12px] font-bold uppercase tracking-[0.2em]">Evidence Chain</span>
          </div>
          <h2 className="mt-1.5 text-[22px] font-bold tracking-tight">Field Test Record</h2>
        </div>
        <div className="text-right text-[11px] leading-relaxed">
          <div className="font-mono font-semibold">{record.record_id}</div>
          <div className="text-[#4b5563]">Sequence #{record.seq}</div>
          <div className="text-[#4b5563]">{fmtDate(record.claimed_time)}</div>
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        <Row2>
          <Cell label="Case" value={record.case_ref} mono />
          <Cell label="Operator" value={officer ? `${officer.name} · ${p.operator_id}` : p.operator_id} />
        </Row2>
        <Row2>
          <Cell
            label="Device"
            value={`${record.device_id}${device ? ` · ${device.make} ${device.model}` : ""}`}
          />
          <Cell label="Serial" value={device?.serial ?? "—"} mono />
        </Row2>

        <Divider label="Kit" />
        <Row2>
          <Cell label="Reagent / kit type" value={p.kit_type} />
          <Cell label="Manufacturer" value={p.manufacturer} />
        </Row2>
        <Row2>
          <Cell label="Lot number" value={p.lot_number} mono />
          <Cell
            label="Expiry"
            value={fmtDate(p.expiry_date)}
            warn={p.lot_expired ? "EXPIRED LOT" : undefined}
          />
        </Row2>

        <Divider label="Observation" />
        <Row2>
          <Cell label="Observed colour" value={p.observed_colour} />
          <Cell label="Reference table" value={p.reference_table} />
        </Row2>
        <Row2>
          <Cell
            label="Ambient conditions"
            value={p.ambient_temperature_c === null ? "Not recorded" : `${p.ambient_temperature_c} °C`}
          />
          <Cell label="Linked trigger record" value={p.linked_trigger_record_id ?? "—"} mono />
        </Row2>

        <Divider label="Result" />
        <div className="rounded-lg border-2 border-[#111827] px-4 py-3.5">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4b5563]">
            Result status
          </div>
          <div className="mt-1 text-[24px] font-bold uppercase tracking-tight">
            {resultLabel(p.result_status)}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-lg border-2 border-warn-ink bg-[#fffbeb] px-4 py-3.5">
          <AlertTriangle size={20} className="mt-[2px] shrink-0 text-warn-ink" />
          <div>
            <div className="text-[15px] font-bold uppercase leading-tight tracking-tight text-[#92400e]">
              Presumptive — not a chemical identification
            </div>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#78350f]">
              This record documents an observation, not an identification. Confirmation is a
              laboratory step; only samples drawn and certified in a Magistrate&apos;s presence under
              NDPS s.52A are primary evidence at trial.
            </p>
          </div>
        </div>

        <Divider label="Cryptographic integrity" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Cell label="Payload hash (SHA-256)" value={record.payload_hash} mono small />
          <Cell label="Signature (ECDSA P-256, demo key)" value={record.signature} mono small />
          <Cell label="Previous hash" value={record.prev_hash ?? "Genesis"} mono small />
          <Cell
            label="Claimed time (untrusted device clock)"
            value={`${fmtTime(record.claimed_time)}`}
          />
          <Cell
            label="Trusted interval"
            value={interval ? fmtInterval(interval.start, interval.end) : "Not yet anchored — time unproven"}
          />
          <Cell
            label="Verification"
            value={tampered ? "FAILS — record altered after signing" : "Signature and chain verify"}
            warn={tampered ? "ALTERED" : undefined}
          />
        </div>
      </div>

      <div className="border-t border-[#d1d5db] px-6 py-3 text-[10px] leading-relaxed text-[#6b7280]">
        Prototype-generated document · synthetic demo data · signatures produced with a software key,
        not a hardware-backed key.
      </div>
    </Panel>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Cell({
  label,
  value,
  mono,
  small,
  warn,
}: {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
  warn?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#6b7280]">{label}</div>
      <div
        className={cx(
          "mt-0.5 break-words",
          mono && "font-mono",
          small ? "text-[10.5px]" : "text-[13px]",
          "text-[#111827]",
        )}
      >
        {value}
      </div>
      {warn ? (
        <div className="mt-1 inline-block rounded border border-[#b91c1c] px-1.5 py-[1px] text-[10px] font-bold uppercase tracking-[0.1em] text-[#b91c1c]">
          {warn}
        </div>
      ) : null}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b7280]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[#d1d5db]" />
    </div>
  );
}
