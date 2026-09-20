"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  FlaskConical,
  Printer,
  Signature,
  Thermometer,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Button,
  ButtonLink,
  Callout,
  HashChip,
  KeyValue,
  Panel,
  PanelHead,
  Pill,
} from "@/components/ui/primitives";
import { Field, OptionGroup, Select, TextInput } from "@/components/ui/form";
import { RecordStatusPill } from "@/components/ui/status";
import {
  KIT_TYPES,
  MANUFACTURERS,
  OBSERVED_COLOURS,
  PRESUMPTIVE_NOTICE,
  REFERENCE_TABLES,
  RESULT_STATUSES,
} from "@/lib/domain/vocab";
import type { EvidenceRecord, FieldTestPayload } from "@/lib/domain/types";
import { CaptureDeviceHint, CaptureSteps, CaptureTargetBar } from "@/features/capture/capture-target";
import { CaseContextBar, useActiveCase } from "@/features/case/case-context";
import { useHardware } from "@/components/providers/hardware-provider";
import { HelpTip } from "@/components/ui/help-tip";
import { FieldTestDocument } from "@/features/field-test/field-test-document";

export default function FieldTestCapturePage() {
  return (
    <React.Suspense fallback={<div className="py-10 text-[13.5px] text-fg-muted">Loading capture form…</div>}>
      <FieldTestCaptureView />
    </React.Suspense>
  );
}

function FieldTestCaptureView() {
  const params = useSearchParams();
  const { store, officer, run } = useApp();
  const hw = useHardware();
  const [busy, setBusy] = React.useState(false);
  const [created, setCreated] = React.useState<EvidenceRecord | null>(null);

  const { caseRef, setCase } = useActiveCase();
  const [kit, setKit] = React.useState<string>(KIT_TYPES[0]);
  const [manufacturer, setManufacturer] = React.useState<string>(MANUFACTURERS[0]);
  const [lot, setLot] = React.useState("LOT-26A91");
  const [expiry, setExpiry] = React.useState("2027-04-30");
  const [colour, setColour] = React.useState<string>(OBSERVED_COLOURS[0]);
  const [table, setTable] = React.useState<string>(REFERENCE_TABLES[0]);
  const [ambient, setAmbient] = React.useState("28");
  /**
   * Where the ambient temperature on screen came from. Typing switches it back
   * to "manual"; a live value is never written over what an officer typed.
   */
  const [ambientSource, setAmbientSource] = React.useState<"manual" | "pramaan">("manual");
  const [result, setResult] = React.useState<FieldTestPayload["result_status"]>("presumptive_positive");

  if (!store) return null;

  const device = store.devices.find((d) => d.assigned_officer_id === officer?.officer_id) ?? null;
  const canCapture = Boolean(officer && device && officer.force === "RPF");
  const expired = expiry ? new Date(expiry).getTime() < Date.now() : false;
  const candidateCases = store.cases.filter((c) =>
    store.records.some((r) => r.case_ref === c.case_ref),
  );

  const submit = async () => {
    if (!device || !officer) return;
    setBusy(true);
    const res = await run<EvidenceRecord>("capture.field_test", {
      case_ref: caseRef,
      device_id: device.device_id,
      officer_id: officer.officer_id,
      kit_type: kit,
      manufacturer,
      lot_number: lot,
      expiry_date: expiry,
      observed_colour: colour,
      reference_table: table,
      ambient_temperature_c: ambient === "" ? null : Number(ambient),
      result_status: result,
    });
    setBusy(false);
    if (res.ok && res.result) setCreated(res.result);
  };

  /* ------------------------------------------------------------- result */
  if (created) {
    const fresh = store.records.find((r) => r.record_id === created.record_id) ?? created;
    return (
      <>
        <PageHeader
          eyebrow="Capture"
          title="Field test saved"
          subtitle="Signed and saved. The document below states on its face that the result is presumptive."
          status={<RecordStatusPill status={fresh.status} />}
          actions={
            <>
              <Button onClick={() => setCreated(null)} icon={<FlaskConical size={15} />}>
                Record another
              </Button>
              <Button onClick={() => window.print()} icon={<Printer size={15} />}>
                Print
              </Button>
              <ButtonLink href={`/cases/${fresh.case_ref}`} variant="primary" icon={<ArrowLeftRight size={15} />}>
                  Open case
                </ButtonLink>
            </>
          }
        />
        <div className="no-print mb-5">
          <CaptureSteps saved synced={fresh.status === "pushed" || fresh.status === "anchored"} />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
          <FieldTestDocument record={fresh} store={store} />
          <Panel className="no-print h-fit">
            <PanelHead title="Cryptographic integrity" icon={<Signature size={16} />} />
            <div className="space-y-4 p-5">
              <ul className="space-y-2.5">
                {[
                  ["SHA-256 payload hash", "Computed over the canonicalised payload"],
                  ["Device signature", "ECDSA P-256 over payload_hash + prev_hash + seq"],
                  ["Chain-linked", `seq #${fresh.seq} on ${fresh.device_id}`],
                  [
                    fresh.status === "queued" ? "Stored offline" : "Stored on the server",
                    fresh.status === "queued"
                      ? "Queued until the next connectivity window"
                      : "Accepted into the append-only log",
                  ],
                ].map(([t, b], i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ok/15 text-ok">
                      <Check size={11} strokeWidth={3} />
                    </span>
                    <div>
                      <div className="text-[13.5px] font-medium text-fg">{t}</div>
                      <div className="text-[12px] text-fg-muted">{b}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="grid gap-3 border-t border-line pt-4">
                <KeyValue k="Record ID">
                  <span className="mono">{fresh.record_id}</span>
                </KeyValue>
                <KeyValue k="Payload hash">
                  <HashChip value={fresh.payload_hash} full tone="info" />
                </KeyValue>
                <KeyValue k="Signature">
                  <HashChip value={fresh.signature} full tone="sim" />
                </KeyValue>
              </div>
            </div>
          </Panel>
        </div>
      </>
    );
  }

  /* --------------------------------------------------------------- form */
  return (
    <>
      <PageHeader
        eyebrow="Capture"
        title="Field Test"
        subtitle="Record the kit, the lot, what colour you saw, and the result — all from fixed choices. Review, then confirm to save."
      />

      <CaptureTargetBar />

      <div role="note" className="mt-4 rounded-2xl border-2 border-warn/50 bg-warn/[0.10] px-5 py-4">
        <div className="flex items-center gap-2.5 text-[16px] font-bold uppercase tracking-[0.05em] text-[#B45309] sm:text-[18px]">
          <AlertTriangle size={20} className="shrink-0" />
          {PRESUMPTIVE_NOTICE}
          <HelpTip term="presumptive" />
        </div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">
          A colour test screens; it does not identify. Nothing on this screen will record a
          substance as confirmed, identified or detected. Only a laboratory can identify a substance.
        </p>
      </div>

      <div className="mt-4">
        <CaseContextBar caseRef={caseRef} onPick={setCase} />
      </div>

      <div className="mt-4">
        <CaptureDeviceHint />
      </div>

      {!canCapture ? (
        <Callout tone="warn" title="This role cannot record a field test">
          Field-test capture belongs to the RPF side in this workflow. Sign in as an RPF officer, or
          use Demo mode to switch device roles.
        </Callout>
      ) : null}

      <div className="mt-4 grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Panel className="min-w-0">
            <PanelHead
              title="Kit and lot"
              subtitle="No Indian standard prescribes reagent composition or shelf life, which is exactly why these fields have to be on the record."
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Reagent / kit type" required>
                <Select value={kit} onChange={(e) => setKit(e.target.value)}>
                  {KIT_TYPES.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Manufacturer" required>
                <Select value={manufacturer} onChange={(e) => setManufacturer(e.target.value)}>
                  {MANUFACTURERS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Lot number" required>
                <TextInput value={lot} onChange={(e) => setLot(e.target.value)} spellCheck={false} />
              </Field>
              <Field
                label="Expiry date"
                required
                error={expired ? "Expired lot — this warning is carried into the record" : null}
              >
                <TextInput type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              </Field>
            </div>
            {expired ? (
              <div className="mx-5 mb-5 rounded-lg border border-danger/45 bg-danger/[0.09] px-3.5 py-3">
                <div className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.08em] text-danger">
                  <AlertTriangle size={14} /> Expired lot
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
                  The record can still be created — refusing to record what happened would be worse —
                  but the expiry warning becomes part of the signed payload and appears on the face of
                  the document.
                </p>
              </div>
            ) : null}
          </Panel>

          <Panel className="min-w-0">
            <PanelHead
              title="Observation"
              subtitle="Colour is a dropdown, never free text. Leaving it to officer perception is what a High Court called arbitrary."
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="Observed colour" required>
                <Select value={colour} onChange={(e) => setColour(e.target.value)}>
                  {OBSERVED_COLOURS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Reference table used" required>
                <Select value={table} onChange={(e) => setTable(e.target.value)}>
                  {REFERENCE_TABLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Ambient temperature (°C)"
                hint={
                  ambientSource === "pramaan"
                    ? `LIVE • PRAMAAN — source: ${
                        hw.temperature.source === "potentiometer"
                          ? "potentiometer (simulated)"
                          : "thermal camera"
                      }`
                    : "MANUAL — typed by the operator. Optional."
                }
              >
                <div className="flex gap-2">
                  <TextInput
                    type="number"
                    value={ambient}
                    onChange={(e) => {
                      setAmbient(e.target.value);
                      setAmbientSource("manual");
                    }}
                    min={-10}
                    max={60}
                  />
                  {hw.temperature.value !== null ? (
                    <Button
                      type="button"
                      icon={<Thermometer size={15} />}
                      onClick={() => {
                        const v = hw.temperature.value;
                        if (v === null) return;
                        setAmbient(v.toFixed(1));
                        setAmbientSource("pramaan");
                      }}
                      title="Copy the current PRAMAAN reading into this field"
                    >
                      Use live reading
                    </Button>
                  ) : null}
                </div>
                {ambientSource === "pramaan" ? (
                  <button
                    type="button"
                    onClick={() => setAmbientSource("manual")}
                    className="mt-1.5 text-[13px] font-semibold text-brand hover:underline"
                  >
                    Enter manually instead
                  </button>
                ) : null}
              </Field>
              <Field label="Operator" hint="Taken from the signed-in identity — never typed">
                <TextInput value={officer?.officer_id ?? ""} readOnly disabled />
              </Field>
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-5">
          <Panel className="min-w-0">
            <PanelHead
              title="Result status"
              subtitle="Three values, all presumptive. There is no fourth option."
            />
            <div className="space-y-4 p-5">
              <OptionGroup
                columns={1}
                value={result}
                onChange={setResult}
                options={RESULT_STATUSES.map((r) => ({
                  value: r.value,
                  label: r.label,
                  hint:
                    r.value === "presumptive_positive"
                      ? "A colour change consistent with the reference table"
                      : r.value === "presumptive_negative"
                        ? "No colour change consistent with the reference table"
                        : "The observation does not support either reading",
                }))}
              />
              <Callout tone="warn" title="Words this system will not print">
                Confirmed · Identified · Drug detected. None of them is supported by a colour test,
                so none appears anywhere in the product.
              </Callout>
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead title="Sign and store" />
            <div className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <KeyValue k="Device">
                  <span className="mono">{device?.device_id ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Operator">
                  <span className="mono">{officer?.officer_id ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Connectivity">
                  {store.connectivity.online ? "Online — will push immediately" : "Offline — will queue"}
                </KeyValue>
                <KeyValue k="Epistemic status">
                  <Pill tone="warn">Presumptive</Pill>
                </KeyValue>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                busy={busy}
                disabled={!canCapture || !caseRef || !lot.trim() || !expiry}
                onClick={submit}
                icon={<Signature size={16} />}
              >
                Create signed field-test record
              </Button>
              {!caseRef ? (
                <p className="text-[13px] text-fg-muted">
                  Choose the case this test belongs to, or start a new one, before signing.
                </p>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
