"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { ACCESS_CLASSES, SCREENING_CUES } from "@/lib/domain/vocab";
import type {
  ClientStore,
  EvidenceRecord,
  FieldTestPayload,
  ScreeningFlagPayload,
  HandoffReceiptPayload,
  HandoffTransferPayload,
  TriggerPayload,
} from "@/lib/domain/types";
import { REFERRAL_TIERS, RESULT_STATUSES, SEAL_STATES } from "@/lib/domain/vocab";
import { fmtDate, fmtTime } from "@/lib/format";
import { KeyValue, Pill } from "@/components/ui/primitives";
import { MOCK_SENSOR_PILL } from "@/components/ui/status";

export function resultLabel(v: FieldTestPayload["result_status"]) {
  return RESULT_STATUSES.find((r) => r.value === v)?.label ?? v;
}

export function sealLabel(v: HandoffTransferPayload["seal_state"]) {
  return SEAL_STATES.find((s) => s.value === v)?.label ?? v;
}

export function tierLabel(v: TriggerPayload["sensor"]["tier"]) {
  return REFERRAL_TIERS[v].label;
}

export function PayloadView({ record, store }: { record: EvidenceRecord; store: ClientStore }) {
  if (record.type === "trigger") return <TriggerView payload={record.payload as TriggerPayload} />;
  if (record.type === "field_test")
    return <FieldTestView payload={record.payload as FieldTestPayload} store={store} />;
  if (record.type === "screening_flag")
    return <ScreeningFlagView payload={record.payload as ScreeningFlagPayload} />;
  if (record.type === "handoff_transfer")
    return <TransferView payload={record.payload as HandoffTransferPayload} store={store} />;
  return <ReceiptView payload={record.payload as HandoffReceiptPayload} store={store} />;
}

function officerName(store: ClientStore, id: string) {
  const o = store.officers.find((x) => x.officer_id === id);
  return o ? `${o.name} · ${o.officer_id}` : id;
}

/* ---------------------------------------------------------------- trigger */

export function TriggerView({ payload }: { payload: TriggerPayload }) {
  const tier = REFERRAL_TIERS[payload.sensor.tier];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
        <KeyValue k="Place">{payload.place}</KeyValue>
        <KeyValue k="Place kind">{payload.place_kind}</KeyValue>
        <KeyValue k="Location reference">
          <span className="mono">{payload.train_or_location_ref || "—"}</span>
        </KeyValue>
        <KeyValue k="Officer action">
          {payload.officer_action === "searched" ? "Searched" : "Not searched"}
        </KeyValue>
        <KeyValue k="Search outcome" className="col-span-2">
          {payload.search_outcome === "material_recovered"
            ? "Material recovered"
            : payload.search_outcome === "nothing_recovered"
              ? "Nothing recovered"
              : "Not applicable (no search)"}
        </KeyValue>
      </div>

      <div className="rounded-lg border border-sim/30 bg-sim/[0.06] p-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <span className="label">Sensor output</span>
          {MOCK_SENSOR_PILL}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <KeyValue k="Sensor type">{payload.sensor.sensor_type}</KeyValue>
          <KeyValue k="Sensor ID">
            <span className="mono">{payload.sensor.sensor_id}</span>
          </KeyValue>
          <KeyValue k="Reading" className="col-span-2">
            {payload.sensor.raw_value}
          </KeyValue>
          <KeyValue k="Referral tier" hint={tier.note}>
            <Pill tone={payload.sensor.tier === "no_referral" ? "neutral" : "brand"}>
              {tier.label}
            </Pill>
          </KeyValue>
          <KeyValue k="Reading taken">{fmtTime(payload.sensor.taken_at)}</KeyValue>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-fg-dim">
          A referral tier is not a probability. No confidence score is produced, and none should be
          read into this record.
        </p>
      </div>

      {payload.grounds_note ? (
        <KeyValue k="Officer note">
          <span className="leading-relaxed">{payload.grounds_note}</span>
        </KeyValue>
      ) : null}

      <KeyValue k="Statutory basis" hint="s.43 imposes no writing duty; this record is voluntary.">
        {payload.statutory_basis}
      </KeyValue>
    </div>
  );
}

/* ------------------------------------------------------------- field test */

export function FieldTestView({
  payload,
  store,
}: {
  payload: FieldTestPayload;
  store: ClientStore;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-warn/40 bg-warn/[0.09] px-3.5 py-3">
        <div className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.09em] text-[#855A14]">
          <AlertTriangle size={14} />
          {payload.epistemic_status}
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">
          A colour test screens; it does not identify. Confirmation is a laboratory step under
          NDPS s.52A, and only Magistrate-certified samples are primary evidence.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
        <KeyValue k="Reagent / kit type">{payload.kit_type}</KeyValue>
        <KeyValue k="Manufacturer">{payload.manufacturer}</KeyValue>
        <KeyValue k="Lot number">
          <span className="mono">{payload.lot_number}</span>
        </KeyValue>
        <KeyValue k="Expiry date">
          <span className="flex flex-wrap items-center gap-2">
            {fmtDate(payload.expiry_date)}
            {payload.lot_expired ? (
              <Pill tone="danger" icon={<AlertTriangle size={11} />}>
                Expired lot
              </Pill>
            ) : null}
          </span>
        </KeyValue>
        <KeyValue k="Observed colour" hint="Selected from a fixed vocabulary">
          {payload.observed_colour}
        </KeyValue>
        <KeyValue k="Reference table">{payload.reference_table}</KeyValue>
        <KeyValue k="Ambient temperature">
          {payload.ambient_temperature_c === null ? "Not recorded" : `${payload.ambient_temperature_c} °C`}
        </KeyValue>
        <KeyValue k="Operator">{officerName(store, payload.operator_id)}</KeyValue>
        <KeyValue k="Result status" className="col-span-2">
          <Pill
            tone={
              payload.result_status === "presumptive_positive"
                ? "warn"
                : payload.result_status === "presumptive_negative"
                  ? "info"
                  : "neutral"
            }
          >
            {resultLabel(payload.result_status)}
          </Pill>
        </KeyValue>
        {payload.linked_trigger_record_id ? (
          <KeyValue k="Linked trigger record" className="col-span-2">
            <span className="mono">{payload.linked_trigger_record_id}</span>
          </KeyValue>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- handoff */

export function TransferView({
  payload,
  store,
}: {
  payload: HandoffTransferPayload;
  store: ClientStore;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
      <KeyValue k="Handoff ID">
        <span className="mono">{payload.handoff_id}</span>
      </KeyValue>
      <KeyValue k="Receiving post">{payload.receiving_post}</KeyValue>
      <KeyValue k="Transferor">{officerName(store, payload.transferor_officer_id)}</KeyValue>
      <KeyValue k="Receiving agency">{payload.receiving_agency}</KeyValue>
      <KeyValue k="Sample count">
        <span className="mono text-[16px] font-semibold">
          {String(payload.sample_count).padStart(2, "0")}
        </span>
      </KeyValue>
      <KeyValue k="Seal state">{sealLabel(payload.seal_state)}</KeyValue>
      <KeyValue k="Seal marks" className="col-span-2">
        <span className="mono">{payload.seal_marks || "—"}</span>
      </KeyValue>
      <KeyValue k="Article description" className="col-span-2">
        {payload.article_description || "—"}
      </KeyValue>
      <KeyValue k="Gross weight">{payload.gross_weight_g} g</KeyValue>
      <KeyValue k="Linked records">
        <span className="mono text-[11.5px]">{payload.linked_record_ids.join(", ") || "—"}</span>
      </KeyValue>
    </div>
  );
}

export function ReceiptView({
  payload,
  store,
}: {
  payload: HandoffReceiptPayload;
  store: ClientStore;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
      <KeyValue k="Handoff ID">
        <span className="mono">{payload.handoff_id}</span>
      </KeyValue>
      <KeyValue k="Transfer record">
        <span className="mono">{payload.transfer_record_id}</span>
      </KeyValue>
      <KeyValue k="Receiving officer">{officerName(store, payload.receiving_officer_id)}</KeyValue>
      <KeyValue k="Receiving force">{payload.receiving_force}</KeyValue>
      <KeyValue k="Sample count receipted">
        <span className="mono text-[16px] font-semibold">
          {String(payload.sample_count).padStart(2, "0")}
        </span>
      </KeyValue>
      <KeyValue k="Seal state">{sealLabel(payload.seal_state)}</KeyValue>
      <KeyValue k="Seal marks" className="col-span-2">
        <span className="mono">{payload.seal_marks || "—"}</span>
      </KeyValue>
      <KeyValue k="Remarks" className="col-span-2">
        <span className="leading-relaxed">{payload.remarks || "—"}</span>
      </KeyValue>
    </div>
  );
}

/* -------------------------------------------------------- screening flag */

function ScreeningFlagView({ payload }: { payload: ScreeningFlagPayload }) {
  const cue = SCREENING_CUES.find((c) => c.value === payload.cue_type);
  const access = ACCESS_CLASSES.find((a) => a.value === payload.access_class);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-sim/30 bg-sim/[0.08] px-4 py-3">
        <div className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#8E4331]">
          TTE demo · screening flag
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">{payload.demo_note}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
        <KeyValue k="Train">
          <span className="mono">{payload.train_id}</span>
        </KeyValue>
        <KeyValue k="Coach / seat">
          <span className="mono">
            {payload.coach} · {payload.seat}
          </span>
        </KeyValue>
        <KeyValue k="Screening cue" hint={cue?.detail}>
          {cue?.label ?? payload.cue_type}
        </KeyValue>
        <KeyValue k="Access" hint={access?.detail}>
          {access?.label ?? payload.access_class}
        </KeyValue>
        <KeyValue k="Screening node">
          <span className="mono">{payload.screening_node_id}</span>
        </KeyValue>
        <KeyValue k="Referred to">{payload.referred_to}</KeyValue>
        <KeyValue k="Note" className="col-span-2">
          {payload.cue_note || "—"}
        </KeyValue>
      </div>
    </div>
  );
}
