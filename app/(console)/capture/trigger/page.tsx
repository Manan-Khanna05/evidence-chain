"use client";

import * as React from "react";
import Link from "next/link";
import {
  CircleDashed,
  Radio,
  RefreshCw,
  Signature,
} from "lucide-react";
import { Check, FlaskConical } from "@/components/ui/icons";
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
  SimulatedNote,
  cx,
} from "@/components/ui/primitives";
import { Field, OptionGroup, Select, TextArea, TextInput } from "@/components/ui/form";
import { MOCK_SENSOR_PILL, RecordStatusPill } from "@/components/ui/status";
import { OFFICER_ACTIONS, PLACE_KINDS, REFERRAL_TIERS, SEARCH_OUTCOMES } from "@/lib/domain/vocab";
import type { EvidenceRecord, SensorReading, TriggerPayload } from "@/lib/domain/types";
import { CaptureDeviceHint, CaptureSteps, CaptureTargetBar } from "@/features/capture/capture-target";
import { CaseContextBar, useActiveCase } from "@/features/case/case-context";

export default function TriggerCapturePage() {
  const { store, officer, run } = useApp();
  const [reading, setReading] = React.useState<SensorReading | null>(null);
  const [sensorBusy, setSensorBusy] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [created, setCreated] = React.useState<EvidenceRecord | null>(null);

  // The case is chosen once, up front, and shown in the context bar. It is
  // never a plain dropdown inside the form: an existing case must be opened
  // deliberately, not fallen into.
  const { caseRef, setCase } = useActiveCase();
  const [place, setPlace] = React.useState("Platform 3, Demo Junction (DMJ)");
  const [placeKind, setPlaceKind] = React.useState<string>(PLACE_KINDS[0]);
  const [locRef, setLocRef] = React.useState("PF-03");
  const [action, setAction] = React.useState<TriggerPayload["officer_action"]>("searched");
  const [outcome, setOutcome] = React.useState<TriggerPayload["search_outcome"]>("material_recovered");
  const [note, setNote] = React.useState("");

  const readSensor = React.useCallback(async () => {
    setSensorBusy(true);
    try {
      const res = await fetch("/api/sensor", { cache: "no-store" });
      const data = (await res.json()) as { reading: SensorReading };
      setReading(data.reading);
    } finally {
      setSensorBusy(false);
    }
  }, []);

  React.useEffect(() => {
    void readSensor();
  }, [readSensor]);

  React.useEffect(() => {
    if (action === "not_searched") setOutcome("not_applicable");
    else if (outcome === "not_applicable") setOutcome("material_recovered");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action]);

  if (!store) return null;

  const device = store.devices.find((d) => d.assigned_officer_id === officer?.officer_id) ?? null;
  const canCapture = Boolean(officer && device && officer.force === "RPF");

  const submit = async () => {
    if (!device || !officer || !reading) return;
    setBusy(true);
    const res = await run<EvidenceRecord>("capture.trigger", {
      case_ref: caseRef,
      device_id: device.device_id,
      officer_id: officer.officer_id,
      place,
      place_kind: placeKind,
      train_or_location_ref: locRef,
      officer_action: action,
      search_outcome: outcome,
      grounds_note: note,
      sensor: reading,
    });
    setBusy(false);
    if (res.ok && res.result) {
      setCreated(res.result);
      void readSensor();
    }
  };

  /* ------------------------------------------------------------- result */
  if (created) {
    const fresh = store.records.find((r) => r.record_id === created.record_id) ?? created;
    return (
      <>
        <PageHeader
          eyebrow="Capture"
          title="Evidence saved"
          subtitle="Signed on this device, linked into the chain, and saved."
          status={<RecordStatusPill status={fresh.status} />}
          actions={
            <>
              <Button onClick={() => setCreated(null)} icon={<Radio size={15} />}>
                Capture another
              </Button>
              <ButtonLink href={`/capture/field-test?case=${encodeURIComponent(fresh.case_ref)}`} variant="primary" icon={<FlaskConical size={15} />}>
                  Run field test
                </ButtonLink>
            </>
          }
        />
        <div className="mb-5">
          <CaptureSteps saved synced={fresh.status === "pushed" || fresh.status === "anchored"} />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <Panel className="min-w-0">
            <PanelHead title="What just happened" icon={<Signature size={16} />} />
            <ul className="space-y-2.5 p-5">
              {[
                ["Record signed", "ECDSA P-256 over payload_hash + prev_hash + seq"],
                ["Added to the local chain", `seq #${fresh.seq} on ${fresh.device_id}`],
                [
                  fresh.status === "queued" ? "Stored offline" : "Pushed to the server",
                  fresh.status === "queued"
                    ? "Waiting for the next connectivity window"
                    : "Accepted after signature, sequence and linkage checks",
                ],
                fresh.status === "anchored"
                  ? ["Anchored", "Covered by a timestamped Merkle tree head"]
                  : ["Time not yet proven", "No authority has timestamped a tree containing it"],
              ].map(([title, body], i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ok/15 text-ok">
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <div>
                    <div className="text-[13.5px] font-medium text-fg">{title}</div>
                    <div className="text-[12px] text-fg-muted">{body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead title="Record" subtitle="The values this build actually produced." />
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-5">
              <KeyValue k="Record ID">
                <span className="mono">{fresh.record_id}</span>
              </KeyValue>
              <KeyValue k="Case reference">
                <Link href={`/cases/${fresh.case_ref}`} className="mono text-brand hover:underline">
                  {fresh.case_ref}
                </Link>
              </KeyValue>
              <KeyValue k="Sequence">
                <span className="mono">#{fresh.seq}</span>
              </KeyValue>
              <KeyValue k="Status">
                <RecordStatusPill status={fresh.status} />
              </KeyValue>
              <KeyValue k="Previous hash" className="col-span-2">
                {fresh.prev_hash ? <HashChip value={fresh.prev_hash} full /> : <Pill tone="brand">Genesis</Pill>}
              </KeyValue>
              <KeyValue k="Payload hash" className="col-span-2">
                <HashChip value={fresh.payload_hash} full tone="info" />
              </KeyValue>
              <KeyValue k="Signature" className="col-span-2">
                <HashChip value={fresh.signature} full tone="sim" />
              </KeyValue>
            </div>
          </Panel>
        </div>
      </>
    );
  }

  /* -------------------------------------------------------------- form */
  return (
    <>
      <PageHeader
        eyebrow="Capture"
        title="Capture Evidence"
        subtitle="Record what caused the stop — including stops where nothing was found. Fill in each card, review, then sign and save."
      />

      <CaptureTargetBar />

      <div className="mt-4">
        <CaseContextBar caseRef={caseRef} onPick={setCase} />
      </div>

      <div className="mt-4">
        <CaptureDeviceHint />
      </div>

      {!canCapture ? (
        <Callout tone="warn" title="This role cannot capture a trigger record">
          Trigger and field-test capture belong to the RPF side. Sign in as an RPF officer to record
          one, or use Demo mode to switch device roles.
        </Callout>
      ) : null}

      <div className="mt-4 grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Panel className="min-w-0">
            <PanelHead title="Place" subtitle="Where the stop happened." />
            <div className="space-y-4 p-5">
              <Field label="Place" required>
                <TextInput value={place} onChange={(e) => setPlace(e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Place kind" required>
                  <Select value={placeKind} onChange={(e) => setPlaceKind(e.target.value)}>
                    {PLACE_KINDS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Location reference" hint="Platform, coach or parcel-office identifier">
                  <TextInput value={locRef} onChange={(e) => setLocRef(e.target.value)} />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead
              title="Officer action"
              subtitle="Negative outcomes are recorded too. A log of only the hits cannot tell anyone whether the programme works."
            />
            <div className="space-y-4 p-5">
              <Field label="Action taken" required>
                <OptionGroup
                  value={action}
                  onChange={setAction}
                  options={OFFICER_ACTIONS.map((a) => ({ value: a.value, label: a.label }))}
                />
              </Field>
              <Field label="Search outcome" required>
                <OptionGroup
                  columns={3}
                  value={outcome}
                  onChange={setOutcome}
                  options={SEARCH_OUTCOMES.filter((o) =>
                    action === "not_searched"
                      ? o.value === "not_applicable"
                      : o.value !== "not_applicable",
                  ).map((o) => ({ value: o.value, label: o.label }))}
                />
              </Field>
              <Field
                label="Officer note"
                hint="Free text is allowed here because this is the officer's own account, not a structured observation."
              >
                <TextArea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Grounds on which the officer formed a reason to believe, in their own words."
                />
              </Field>
            </div>
          </Panel>
        </div>

        {/* -------------------------------------------------- sensor side */}
        <div className="min-w-0 space-y-5">
          <Panel className="min-w-0">
            <PanelHead
              title="Sensor output"
              subtitle="Auto-populated. The officer never types the reading."
              icon={<Radio size={16} />}
              right={
                <Button
                  size="sm"
                  variant="ghost"
                  busy={sensorBusy}
                  icon={<RefreshCw size={13} />}
                  onClick={readSensor}
                >
                  Re-read
                </Button>
              }
            />
            <div className="space-y-4 p-5">
              {!reading ? (
                <div className="flex items-center gap-3 py-6 text-fg-muted">
                  <CircleDashed size={17} className="animate-spin" />
                  <span className="text-[13.5px]">Reading the adapter…</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {MOCK_SENSOR_PILL}
                    <Pill tone="neutral">Simulated sensor input</Pill>
                  </div>

                  <div className="rounded-xl border border-line bg-ink-850 p-4">
                    <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                      <KeyValue k="Sensor type">{reading.sensor_type}</KeyValue>
                      <KeyValue k="Sensor ID">
                        <span className="mono">{reading.sensor_id}</span>
                      </KeyValue>
                      <KeyValue k="Adapter">{reading.adapter}</KeyValue>
                      <KeyValue k="Reading taken">
                        <span className="mono tabular-nums">
                          {new Date(reading.taken_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      </KeyValue>
                    </div>

                    <div className="mt-4 rounded-lg border border-line bg-ink-900/60 px-3.5 py-3">
                      <div className="label">Reading</div>
                      <div className="mt-1 text-[15px] font-medium text-fg">{reading.raw_value}</div>
                    </div>

                    <div
                      className={cx(
                        "mt-3 rounded-lg border px-3.5 py-3",
                        reading.tier === "no_referral"
                          ? "border-line bg-ink-900/60"
                          : "border-brand/35 bg-brand/[0.08]",
                      )}
                    >
                      <div className="label">Referral tier</div>
                      <div className="mt-1 text-[19px] font-semibold tracking-tight text-fg">
                        {REFERRAL_TIERS[reading.tier].label}
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-fg-muted">
                        {REFERRAL_TIERS[reading.tier].note}
                      </div>
                    </div>
                  </div>

                  <SimulatedNote>
                    There is no ion-mobility spectrometer behind this reading and none is claimed.
                    The adapter is a scripted mock; a serial adapter can replace it without touching
                    the app. A tier is not a probability — no confidence score is produced anywhere
                    in this system.
                  </SimulatedNote>
                </>
              )}
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead title="Sign and store" />
            <div className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                <KeyValue k="Device">
                  <span className="mono">{device?.device_id ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Officer">
                  <span className="mono">{officer?.officer_id ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Connectivity">
                  {store.connectivity.online ? "Online — saves and syncs" : "Offline — saved on this device"}
                </KeyValue>
                <KeyValue k="Next sequence">
                  <span className="mono">
                    #
                    {device
                      ? store.records.filter((r) => r.device_id === device.device_id).length + 1
                      : "—"}
                  </span>
                </KeyValue>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                busy={busy}
                disabled={!canCapture || !reading || !caseRef}
                onClick={submit}
                icon={<Signature size={16} />}
              >
                Create signed trigger record
              </Button>
              <p className="text-[11.5px] leading-relaxed text-fg-dim">
                The record is signed on the device before it goes anywhere. Signing at the server
                would prove only that the server received something.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
