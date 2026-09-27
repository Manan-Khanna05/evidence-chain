"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Flag,
  Info,
  MonitorPlay,
  RotateCcw,
  Train,
  TriangleAlert,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Button,
  ButtonLink,
  Callout,
  KeyValue,
  Panel,
  PanelHead,
  Pill,
  cx,
} from "@/components/ui/primitives";
import { Field, Select, TextArea } from "@/components/ui/form";
import { ACCESS_CLASSES, SCREENING_CUES, SCREENING_NOTICE } from "@/lib/domain/vocab";
import type { AccessClass, EvidenceRecord, ScreeningCue, ScreeningFlagPayload } from "@/lib/domain/types";

/**
 * TTE screening console — DEMO ONLY.
 *
 * No TTE hardware exists. Everything on this screen is synthetic and labelled
 * as such, including the record a flag produces. What it demonstrates is the
 * workflow: a screening node raises a cue, a person reviews it, and if they
 * flag it, a signed record enters the SAME evidence chain the RPF console uses
 * — carrying a cue and an access class, never a detection or an identification.
 */

const DEMO_NODE_ID = "TTE-DEMO-NODE-01";
const DEMO_TRAIN = "12456";
const DEMO_COACH = "S4";
const SEATS = Array.from({ length: 24 }, (_, i) => String(i + 1));

type SeatState = "not_screened" | "screened" | "attention" | "flagged";

/**
 * Deterministic synthetic cues: seat number decides the outcome, so a demo
 * runs the same way twice and nothing pretends to be a live measurement.
 */
function syntheticState(seat: string): { state: SeatState; cue: ScreeningCue | null; note: string } {
  const n = Number(seat);
  if (n % 8 === 0) {
    return {
      state: "attention",
      cue: "surface_trace_cue",
      note: "Synthetic demo cue: surface warranted a closer look.",
    };
  }
  if (n % 7 === 0) {
    return {
      state: "attention",
      cue: "thermal_observation_cue",
      note: "Synthetic demo cue: temperature difference observed.",
    };
  }
  if (n % 5 === 0) return { state: "not_screened", cue: null, note: "Passenger absent in this demo." };
  return { state: "screened", cue: null, note: "Nothing warranted a closer look in this demo." };
}

export default function TteScreeningPage() {
  const { store, officer, run } = useApp();
  const [screened, setScreened] = React.useState<Record<string, SeatState>>({});
  const [selected, setSelected] = React.useState<string | null>(null);
  const [cue, setCue] = React.useState<ScreeningCue>("surface_trace_cue");
  const [access, setAccess] = React.useState<AccessClass>("AC1");
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [lastFlag, setLastFlag] = React.useState<EvidenceRecord | null>(null);

  if (!store) return null;

  const device =
    store.devices.find((d) => d.assigned_officer_id === officer?.officer_id) ??
    store.devices.find((d) => d.force === "RPF") ??
    null;

  const flags = store.records.filter((r) => r.type === "screening_flag");
  const seatState = (seat: string): SeatState =>
    screened[seat] ?? (flags.some((f) => (f.payload as ScreeningFlagPayload).seat === seat) ? "flagged" : "not_screened");

  const walkTo = (seat: string) => {
    const s = syntheticState(seat);
    setSelected(seat);
    setScreened((prev) => ({ ...prev, [seat]: prev[seat] === "flagged" ? "flagged" : s.state }));
    if (s.cue) setCue(s.cue);
    setNote(s.note);
  };

  const raiseFlag = async () => {
    if (!selected || !officer || !device) return;
    setBusy(true);
    const res = await run<EvidenceRecord>(
      "screening.flag",
      {
        operator_id: officer.officer_id,
        device_id: device.device_id,
        screening_node_id: DEMO_NODE_ID,
        train_id: DEMO_TRAIN,
        coach: DEMO_COACH,
        seat: selected,
        cue_type: cue,
        cue_note: note,
        access_class: access,
      },
      {
        toast: {
          title: "Flag sent to RPF (demo)",
          body: "A signed screening record was added to a demo case. It is not a detection.",
        },
      },
    );
    setBusy(false);
    if (res.ok && res.result) {
      setLastFlag(res.result);
      setScreened((prev) => ({ ...prev, [selected]: "flagged" }));
    }
  };

  const resetWalk = () => {
    setScreened({});
    setSelected(null);
    setLastFlag(null);
    setNote("");
  };

  const current = selected ? syntheticState(selected) : null;
  const flagCase = lastFlag ? store.cases.find((c) => c.case_ref === lastFlag.case_ref) : null;

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="TTE Screening Console"
        subtitle="How a screening node would hand work to RPF. Every seat, cue and record on this page is synthetic."
        status={
          <Pill tone="sim" icon={<MonitorPlay size={11} />}>
            DEMO MODE
          </Pill>
        }
        actions={
          <Button icon={<RotateCcw size={16} />} onClick={resetWalk}>
            Reset demo walk
          </Button>
        }
      />

      <Callout tone="sim" title="No TTE hardware is connected" icon={<Info size={13} />}>
        There is no Travelling Ticket Examiner device in this build. Seats, cues and timings below are
        generated in the browser and marked <span className="mono">demo</span> inside every record
        they produce. Nothing here measures or identifies a substance.
      </Callout>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------- coach map */}
        <Panel className="min-w-0">
          <PanelHead
            title={`Train ${DEMO_TRAIN} · Coach ${DEMO_COACH}`}
            subtitle="Walk the coach as a TTE would. Select a seat to see its synthetic screening state."
            icon={<Train size={17} />}
            right={<Pill tone="neutral">{DEMO_NODE_ID}</Pill>}
          />
          <div className="px-5 py-5">
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {SEATS.map((seat) => {
                const st = seatState(seat);
                return (
                  <li key={seat}>
                    <button
                      type="button"
                      onClick={() => walkTo(seat)}
                      aria-pressed={selected === seat}
                      className={cx(
                        "flex min-h-[56px] w-full flex-col items-center justify-center rounded-xl border text-[13px] font-semibold transition-all duration-150",
                        selected === seat && "ring-2 ring-brand/45",
                        st === "flagged" && "border-sim/35 bg-sim/[0.12] text-[#8A4B32]",
                        st === "attention" && "border-warn/35 bg-warn/[0.12] text-[#8A5A12]",
                        st === "screened" && "border-ok/25 bg-ok/[0.08] text-[#236B45]",
                        st === "not_screened" && "border-line bg-white text-fg-dim",
                      )}
                    >
                      <span>{seat}</span>
                      <span className="text-[11px] font-medium">
                        {st === "flagged" ? "Flagged" : st === "attention" ? "Attention" : st === "screened" ? "Screened" : "—"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex flex-wrap gap-3 text-[13px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-ok" /> Screened — looked at, not chemically cleared
              </span>
              <span className="inline-flex items-center gap-1.5">
                <TriangleAlert size={14} className="text-warn" /> Attention — a cue to review
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Flag size={14} className="text-sim" /> Flagged — referred to RPF
              </span>
              <span className="inline-flex items-center gap-1.5">— Not screened</span>
            </div>
          </div>
        </Panel>

        {/* ---------------------------------------------------- review panel */}
        <div className="min-w-0 space-y-5">
          <Panel className="min-w-0">
            <PanelHead
              title={selected ? `Seat ${selected}` : "Select a seat"}
              subtitle={selected ? "Review the cue, then decide." : "Nothing is flagged until you decide."}
              icon={<Flag size={17} />}
            />
            <div className="space-y-4 px-5 py-5">
              <div role="note" className="rounded-xl border-2 border-warn/45 bg-warn/[0.10] px-4 py-3">
                <div className="text-[14px] font-bold uppercase tracking-[0.04em] text-[#8A5A12]">
                  {SCREENING_NOTICE}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
                  A flag means someone should look. It is not evidence of possession and identifies
                  nothing.
                </p>
              </div>

              {selected && current ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <KeyValue k="Screening state">
                      {seatState(selected) === "flagged"
                        ? "Flagged"
                        : current.state === "attention"
                          ? "Attention"
                          : current.state === "screened"
                            ? "Screened"
                            : "Not screened"}
                    </KeyValue>
                    <KeyValue k="Journey">
                      <span className="mono">
                        {DEMO_TRAIN} · {DEMO_COACH}
                      </span>
                    </KeyValue>
                  </div>

                  <Field label="Screening cue" required hint={SCREENING_CUES.find((c) => c.value === cue)?.detail}>
                    <Select value={cue} onChange={(e) => setCue(e.target.value as ScreeningCue)}>
                      {SCREENING_CUES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Access" required hint={ACCESS_CLASSES.find((a) => a.value === access)?.detail}>
                    <Select value={access} onChange={(e) => setAccess(e.target.value as AccessClass)}>
                      {ACCESS_CLASSES.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Note" hint="What the operator saw. Optional.">
                    <TextArea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                  </Field>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      size="lg"
                      icon={<Flag size={17} />}
                      busy={busy}
                      disabled={busy || !officer || !device}
                      onClick={raiseFlag}
                    >
                      Flag for RPF
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => {
                        setScreened((prev) => ({ ...prev, [selected]: "screened" }));
                        setSelected(null);
                      }}
                    >
                      Dismiss — nothing to refer
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-[14px] leading-relaxed text-fg-muted">
                  Choose a seat in the coach map. Seats are generated synthetically, so the same seat
                  always produces the same cue.
                </p>
              )}
            </div>
          </Panel>

          {lastFlag ? (
            <Panel className="min-w-0 border-ok/30">
              <PanelHead title="Flag sent to RPF" icon={<Check size={17} />} />
              <div className="space-y-3 px-5 py-5">
                <p className="text-[14px] leading-relaxed text-fg-muted">
                  A signed screening record was appended to{" "}
                  <span className="mono text-fg">{lastFlag.case_ref}</span> at position{" "}
                  <span className="mono text-fg">#{lastFlag.case_seq}</span>. It went through the same
                  chain, signing and verification as any other record — and it is marked as a demo
                  event inside the signed payload.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <KeyValue k="Record">
                    <span className="mono">{lastFlag.record_id}</span>
                  </KeyValue>
                  <KeyValue k="Case">
                    <span className="mono">{lastFlag.case_ref}</span>
                  </KeyValue>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/cases/${lastFlag.case_ref}`} variant="primary" icon={<ArrowRight size={16} />}>
                    Open the RPF case
                  </ButtonLink>
                  <ButtonLink href={`/verification?case=${encodeURIComponent(lastFlag.case_ref)}`}>
                    Verify this chain
                  </ButtonLink>
                </div>
                {flagCase ? (
                  <p className="text-[13px] leading-relaxed text-fg-dim">{flagCase.notes}</p>
                ) : null}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      {/* --------------------------------------------------------- the flow */}
      <Panel className="mt-5 min-w-0">
        <PanelHead title="Where a flag goes" subtitle="The same evidence core as the RPF console." />
        <ol className="grid gap-2 px-5 py-5 sm:grid-cols-3 xl:grid-cols-6">
          {[
            ["Screening node", "A seat is looked at"],
            ["Cue", "Something warrants a closer look"],
            ["TTE review", "A person decides"],
            ["Flag", "Referred to RPF"],
            ["Signed record", "Chained into a case"],
            ["RPF follow-up", "Capture, verify, hand over"],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-xl border border-line bg-white px-3.5 py-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white">
                {i + 1}
              </span>
              <span className="mt-2 block text-[14px] font-semibold text-fg">{t}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-fg-muted">{d}</span>
            </li>
          ))}
        </ol>
      </Panel>

      {flags.length ? (
        <Panel className="mt-5 min-w-0">
          <PanelHead title="Demo flags raised" subtitle="Every one is a real record in a demo case." />
          <ul className="divide-y divide-line">
            {flags.slice(-6).reverse().map((f) => {
              const p = f.payload as ScreeningFlagPayload;
              return (
                <li key={f.record_id}>
                  <Link
                    href={`/cases/${f.case_ref}?record=${encodeURIComponent(f.record_id)}`}
                    className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand/[0.04]"
                  >
                    <Pill tone="sim" icon={<MonitorPlay size={11} />}>
                      DEMO
                    </Pill>
                    <span className="mono text-[13.5px] font-semibold text-fg">{f.record_id}</span>
                    <span className="text-[13.5px] text-fg-muted">
                      Train {p.train_id} · {p.coach} · Seat {p.seat}
                    </span>
                    <span className="ml-auto text-[13px] text-fg-dim">{f.case_ref}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}
