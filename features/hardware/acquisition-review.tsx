"use client";

import * as React from "react";
import { AlertTriangle, Check, Cpu, Thermometer, TriangleAlert, Weight, X } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { useHardware } from "@/components/providers/hardware-provider";
import {
  Button,
  Callout,
  IconContainer,
  KeyValue,
  Panel,
  Pill,
  SimulatedNote,
  cx,
} from "@/components/ui/primitives";
import { Field, OptionGroup, Select } from "@/components/ui/form";
import {
  KIT_TYPES,
  MANUFACTURERS,
  OBSERVED_COLOURS,
  PRESUMPTIVE_NOTICE,
  REFERENCE_TABLES,
  RESULT_STATUSES,
} from "@/lib/domain/vocab";
import type { EvidenceRecord, FieldTestResult } from "@/lib/domain/types";
import {
  CasePickerDialog,
  NewCaseDialog,
  useActiveCase,
  useCasePosition,
} from "@/features/case/case-context";

/**
 * The review step.
 *
 * A sensor event never becomes evidence by itself. The board reports an
 * acquisition; this sheet shows the officer exactly what was measured, asks
 * for the three things only a human can supply (kit, observed colour, result),
 * and only then writes a signed field-test record through the existing capture
 * path. Nothing here bypasses the hash chain.
 */
export function AcquisitionReview({ onDone }: { onDone?: (r: EvidenceRecord) => void }) {
  const { store, officer, run } = useApp();
  const { pending, clearPending, reset, brand } = useHardware();

  const { caseRef, setCase } = useActiveCase();
  const [pickOpen, setPickOpen] = React.useState(false);
  const [newOpen, setNewOpen] = React.useState(false);
  const [kit, setKit] = React.useState<string>(KIT_TYPES[0]);
  const [manufacturer, setManufacturer] = React.useState<string>(MANUFACTURERS[0]);
  const [lot, setLot] = React.useState("LOT-26A91");
  const [expiry, setExpiry] = React.useState("2027-04-30");
  const [colour, setColour] = React.useState<string>(OBSERVED_COLOURS[0]);
  const [table, setTable] = React.useState<string>(REFERENCE_TABLES[0]);
  const [result, setResult] = React.useState<FieldTestResult>("presumptive_positive");
  const [ackCollector, setAckCollector] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const casePosition = useCasePosition(caseRef);



  if (!pending || !store) return null;

  const obs = pending.observation;
  // Null means the device has no collector switch at all — that is not the
  // same as a collector reported absent, and it must not raise a warning.
  const collectorMissing = obs.collector_installed === false;
  const blocked = collectorMissing && !ackCollector;
  const { count: caseCount, nextPosition, isNew: caseIsNew } = casePosition;
  const temperature = obs.temperature_c ?? obs.thermal_avg_c ?? null;
  const temperatureSource =
    obs.temperature_source ?? (obs.thermal_avg_c !== null ? "thermal_camera" : null);
  const deviceName = obs.source === "pramaan" ? "PRAMAAN" : brand === "PRAMAAN" ? "PRAMAAN" : "Device";
  const device =
    store.devices.find((d) => d.assigned_officer_id === officer?.officer_id) ??
    store.devices.find((d) => d.force === "RPF") ??
    null;

  const confirm = async () => {
    if (!device || !officer || !caseRef) return;
    setBusy(true);
    const res = await run<EvidenceRecord>(
      "capture.field_test",
      {
        case_ref: caseRef,
        device_id: device.device_id,
        officer_id: officer.officer_id,
        kit_type: kit,
        manufacturer,
        lot_number: lot,
        expiry_date: expiry,
        observed_colour: colour,
        reference_table: table,
        // A real instrument value, not a typed one. Its source travels with the
        // hardware block, so a potentiometer reading is never mistaken for a
        // thermal measurement.
        ambient_temperature_c: temperature,
        result_status: result,
        hardware: obs,
      },
      {
        toast: {
          title: "Record signed and stored",
          body: store.connectivity.online
            ? "Pushed to the server log."
            : "Queued on the device until connectivity returns.",
        },
      },
    );
    setBusy(false);
    if (res.ok) {
      clearPending();
      void reset();
      if (res.result) onDone?.(res.result);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-[#252525]/35 backdrop-blur-sm" onClick={clearPending} />
      <Panel
        solid
        className="relative m-0 max-h-[94vh] w-full max-w-[560px] animate-fade-up overflow-y-auto rounded-b-none sm:m-4 sm:rounded-panel"
      >
        {/* ------------------------------------------------- what was measured */}
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <div className="label">Acquisition preview</div>
            <h2 className="mt-1 text-[18px] font-semibold tracking-tight text-brand-deep">
              Review before recording
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Describes the reading in hand, not the current link state: a
                capture stays real even if the cable is pulled a second later. */}
            <Pill tone={obs.source === "demo" ? "sim" : "ok"}>
              {obs.source === "demo" ? "Simulated sensor" : `LIVE • ${deviceName}`}
            </Pill>
            <button
              aria-label="Discard"
              onClick={clearPending}
              className="rounded-lg p-1.5 text-fg-dim hover:bg-ink-750 hover:text-fg"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-3 gap-3">
            <Measure
              icon={<Weight size={17} />}
              tone="brand"
              label="Weight"
              value={obs.load_cell_g === null ? "—" : `${obs.load_cell_g.toFixed(1)} g`}
              note={
                obs.load_cell_g === null
                  ? "Load cell unavailable"
                  : obs.weight_source === "load_cell"
                    ? "Load cell"
                    : obs.load_cell_stable
                      ? "Stable"
                      : "Unsettled"
              }
            />
            <Measure
              icon={<Thermometer size={17} />}
              tone="warn"
              label="Temperature"
              value={temperature === null ? "—" : `${temperature.toFixed(1)} °C`}
              note={
                temperatureSource === "potentiometer"
                  ? "Potentiometer (simulated)"
                  : temperatureSource === "thermal_camera"
                    ? obs.thermal_min_c !== null && obs.thermal_max_c !== null
                      ? `Thermal ${obs.thermal_min_c.toFixed(1)}–${obs.thermal_max_c.toFixed(1)}`
                      : "Thermal camera"
                    : "Unavailable"
              }
            />
            {obs.collector_installed === null ? (
              <Measure
                icon={<Cpu size={17} />}
                tone="brand"
                label="Sequence"
                value={obs.device_sequence === null || obs.device_sequence === undefined ? "—" : `#${obs.device_sequence}`}
                note={obs.capture_trigger === "app" ? "App Acquire" : "Device button"}
              />
            ) : (
              <Measure
                icon={obs.collector_installed ? <Check size={17} /> : <AlertTriangle size={17} />}
                tone={obs.collector_installed ? "ok" : "danger"}
                label="Collector"
                value={obs.collector_installed ? "Fitted" : "Absent"}
                note={obs.acquisition_id}
              />
            )}
          </div>

          {collectorMissing ? (
            <Callout tone="danger" title="Collector not installed" icon={<TriangleAlert size={13} />}>
              The microswitch reported no collector fitted when this acquisition was taken. The
              reading is not hidden — but it is recorded with that fact attached, and you have to
              acknowledge it.
              <label className="mt-2.5 flex cursor-pointer items-center gap-2.5 text-[12.5px] font-medium text-fg">
                <input
                  type="checkbox"
                  checked={ackCollector}
                  onChange={(e) => setAckCollector(e.target.checked)}
                  className="h-4 w-4 accent-[#B84035]"
                />
                I acknowledge the collector was not fitted.
              </label>
            </Callout>
          ) : null}

          <div className="rounded-xl border border-warn/30 bg-warn/[0.09] px-3.5 py-3">
            <div className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.05em] text-[#855A14]">
              <AlertTriangle size={14} />
              {PRESUMPTIVE_NOTICE}
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
              Weight and temperature describe how the sample was taken. They are not a detection and
              identify nothing.
              {temperatureSource === "potentiometer"
                ? " The temperature comes from a potentiometer standing in for a temperature probe, and the record says so."
                : ""}
            </p>
          </div>

          {/* ----------------------------------------- what only a human knows */}
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Case" required hint={caseRef ? `Appended as position ${nextPosition}` : undefined}>
              <div className="flex flex-wrap items-center gap-2">
                {caseRef ? (
                  <>
                    <span className="mono rounded-lg border border-line-strong bg-white px-2.5 py-2 text-[14px] font-semibold text-fg">
                      {caseRef}
                    </span>
                    <Pill tone={caseIsNew ? "brand" : "neutral"}>
                      {caseIsNew ? "New case" : `${caseCount} record${caseCount === 1 ? "" : "s"}`}
                    </Pill>
                  </>
                ) : (
                  <span className="text-[13.5px] font-medium text-[#855A14]">No case selected</span>
                )}
                <Button size="sm" type="button" onClick={() => setPickOpen(true)}>
                  {caseRef ? "Change" : "Choose case"}
                </Button>
                <Button size="sm" type="button" onClick={() => setNewOpen(true)}>
                  New case
                </Button>
              </div>
            </Field>
            <Field label="Observed colour" required hint="Fixed vocabulary — never free text">
              <Select value={colour} onChange={(e) => setColour(e.target.value)}>
                {OBSERVED_COLOURS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reagent kit" required>
              <Select value={kit} onChange={(e) => setKit(e.target.value)}>
                {KIT_TYPES.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reference table" required>
              <Select value={table} onChange={(e) => setTable(e.target.value)}>
                {REFERENCE_TABLES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Result" required>
            <OptionGroup
              columns={3}
              value={result}
              onChange={setResult}
              options={RESULT_STATUSES.map((r) => ({ value: r.value, label: r.label }))}
            />
          </Field>

          <details className="rounded-xl border border-line bg-white/60 px-3.5 py-2.5">
            <summary className="cursor-pointer text-[12px] font-medium text-fg-muted hover:text-fg">
              Kit lot and expiry · manufacturer
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Manufacturer">
                <Select value={manufacturer} onChange={(e) => setManufacturer(e.target.value)}>
                  {MANUFACTURERS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Lot number">
                <input
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  className="h-[44px] w-full rounded-xl border border-line-strong bg-white/85 px-3.5 text-[14px] text-fg shadow-chip"
                />
              </Field>
              <Field label="Expiry">
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="h-[44px] w-full rounded-xl border border-line-strong bg-white/85 px-3.5 text-[14px] text-fg shadow-chip"
                />
              </Field>
              <KeyValue k="Temperature (from device)">
                {temperature === null
                  ? "Unavailable"
                  : `${temperature.toFixed(1)} °C · ${
                      temperatureSource === "potentiometer" ? "potentiometer (simulated)" : "thermal camera"
                    }`}
              </KeyValue>
            </div>
          </details>

          {obs.source === "demo" ? (
            <SimulatedNote>
              These values came from the in-browser demo device, not a board. The record will carry
              <span className="mono"> source: &quot;demo&quot;</span> inside its signed payload, so it
              can never be mistaken for a real measurement.
            </SimulatedNote>
          ) : (
            <div className="rounded-xl border border-ok/25 bg-ok/[0.07] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-fg-muted">
              Measured on <span className="mono text-fg">{obs.device_id}</span> over{" "}
              {obs.transport === "wifi" ? "Wi-Fi" : "USB serial"}, firmware{" "}
              <span className="mono text-fg">{obs.firmware}</span>. Recorded as{" "}
              <span className="mono">source: &quot;{obs.source}&quot;</span>
              {temperatureSource === "potentiometer" ? (
                <>
                  {" "}with{" "}
                  <span className="mono">temperature_source: &quot;potentiometer&quot;</span>
                </>
              ) : null}
              .
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------ actions */}
        <div className="sticky bottom-0 flex gap-2.5 border-t border-line bg-white/90 px-5 py-4 backdrop-blur-sm">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              clearPending();
              void reset();
            }}
          >
            Retake
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-[2]"
            busy={busy}
            disabled={blocked || !caseRef}
            onClick={confirm}
            icon={<Check size={17} />}
          >
            Confirm record
          </Button>
        </div>
      </Panel>
    </div>
      <CasePickerDialog open={pickOpen} onClose={() => setPickOpen(false)} onPick={setCase} />
      <NewCaseDialog open={newOpen} onClose={() => setNewOpen(false)} onCreated={setCase} />
    </>
  );
}

function Measure({
  icon,
  tone,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  tone: "brand" | "warn" | "ok" | "danger";
  label: string;
  value: string;
  note: string;
}) {
  // Static map: Tailwind cannot see a class name built by interpolation.
  const ground = {
    brand: "border-brand/20 bg-brand/[0.07]",
    warn: "border-warn/22 bg-warn/[0.08]",
    ok: "border-ok/20 bg-ok/[0.07]",
    danger: "border-danger/25 bg-danger/[0.08]",
  }[tone];
  return (
    <div className={cx("rounded-xl border px-3 py-3 text-center", ground)}>
      <div className="flex justify-center">
        <IconContainer tone={tone} size="sm">
          {icon}
        </IconContainer>
      </div>
      <div className="mt-2 text-[17px] font-semibold leading-none tabular-nums text-fg">{value}</div>
      <div className="label mt-1.5">{label}</div>
      <div className="mono mt-0.5 truncate text-[10px] text-fg-dim">{note}</div>
    </div>
  );
}
