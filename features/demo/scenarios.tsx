"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CircleDashed, Play } from "lucide-react";
import { Check, TriangleAlert } from "@/components/ui/icons";
import { useApp } from "@/components/providers/app-provider";
import { useHardware } from "@/components/providers/hardware-provider";
import { Button, Panel, PanelHead, Pill, cx } from "@/components/ui/primitives";
import type { CaseRecord, EvidenceRecord } from "@/lib/domain/types";

/**
 * Ready-made demonstrations.
 *
 * Every step below calls the same action the interface calls — a scenario is a
 * shortcut through the product, never a scripted animation. Each one ends by
 * naming the screen where the result can be inspected, so a presenter can show
 * the state rather than describe it.
 */

interface Ctx {
  run: ReturnType<typeof useApp>["run"];
  officerId: string;
  rpfDevice: string;
  grpDevice: string;
  grpOfficer: string;
  hw: ReturnType<typeof useHardware>;
  /** Carries values between steps of one scenario. */
  bag: Record<string, string>;
}

interface Scenario {
  id: string;
  title: string;
  blurb: string;
  /** Where to look once it has run. */
  lookAt: { href: string; label: string };
  steps: { label: string; go: (c: Ctx) => Promise<void> }[];
  caution?: string;
}

const newCase = async (c: Ctx, purpose: string, place: string) => {
  const res = await c.run<CaseRecord>(
    "case.create",
    { officer_id: c.officerId, device_id: c.rpfDevice, place, purpose },
    { toast: false },
  );
  if (res.ok && res.result) c.bag.case_ref = res.result.case_ref;
};

const trigger = async (c: Ctx, outcome: "material_recovered" | "nothing_recovered") => {
  await c.run<EvidenceRecord>(
    "capture.trigger",
    {
      case_ref: c.bag.case_ref,
      device_id: c.rpfDevice,
      officer_id: c.officerId,
      place: "Platform 3, Demo Junction (DMJ)",
      place_kind: "Platform",
      train_or_location_ref: "PF-03",
      officer_action: "searched",
      search_outcome: outcome,
      grounds_note: "Demo scenario",
    },
    { toast: false },
  );
};

const fieldTest = async (c: Ctx, result: string) => {
  await c.run<EvidenceRecord>(
    "capture.field_test",
    {
      case_ref: c.bag.case_ref,
      device_id: c.rpfDevice,
      officer_id: c.officerId,
      kit_type: "Demo Reagent Kit — Type A",
      manufacturer: "Demo Diagnostics Pvt Ltd",
      lot_number: "LOT-26A91",
      expiry_date: "2027-04-30",
      observed_colour: result === "inconclusive" ? "Indeterminate / mixed" : "Blue",
      reference_table: "Demo Reference Table A (kit insert)",
      ambient_temperature_c: 28,
      result_status: result,
    },
    { toast: false },
  );
};

const SCENARIOS: Scenario[] = [
  {
    id: "verified",
    title: "1 · Normal verified case",
    blurb: "A clean case from opening to trusted time: trigger, field test, sync, anchor.",
    lookAt: { href: "/cases", label: "Open the case" },
    steps: [
      { label: "Open a new case", go: (c) => newCase(c, "Scenario — verified case", "Platform 3, Demo Junction (DMJ)") },
      { label: "Capture the trigger", go: (c) => trigger(c, "material_recovered") },
      { label: "Record the field test", go: (c) => fieldTest(c, "presumptive_positive") },
      { label: "Sync to the server", go: (c) => c.run("sync.push", undefined, { toast: false }).then(() => undefined) },
      { label: "Anchor to trusted time", go: (c) => c.run("anchor.create", undefined, { toast: false }).then(() => undefined) },
    ],
  },
  {
    id: "offline",
    title: "2 · Offline capture",
    blurb: "Network off, capture anyway. Records are signed and held on the device.",
    lookAt: { href: "/queue", label: "Open Pending Sync" },
    steps: [
      { label: "Go offline", go: (c) => c.run("connectivity.set", { online: false }, { toast: false }).then(() => undefined) },
      { label: "Open a new case", go: (c) => newCase(c, "Scenario — offline capture", "Coach S4, Demo Express 10000") },
      { label: "Capture the trigger", go: (c) => trigger(c, "material_recovered") },
      { label: "Record the field test", go: (c) => fieldTest(c, "presumptive_positive") },
    ],
    caution: "Leaves the system offline so the queue can be shown. Scenario 3 puts it back.",
  },
  {
    id: "sync",
    title: "3 · Pending sync, then sync",
    blurb: "Reconnect and watch the queue drain in order, with checks on arrival.",
    lookAt: { href: "/queue", label: "Open Pending Sync" },
    steps: [
      { label: "Come back online", go: (c) => c.run("connectivity.set", { online: true }, { toast: false }).then(() => undefined) },
      { label: "Sync the queue", go: (c) => c.run("sync.push", undefined, { toast: false }).then(() => undefined) },
      { label: "Anchor to trusted time", go: (c) => c.run("anchor.create", undefined, { toast: false }).then(() => undefined) },
    ],
  },
  {
    id: "tamper",
    title: "4 · Chain tampering",
    blurb: "Edit a stored record the way someone with database access would, then let the verifier catch it.",
    lookAt: { href: "/verification", label: "Open Verification" },
    steps: [
      { label: "Alter a stored record (DEMO)", go: (c) => c.run("demo.tamper", undefined, { toast: false }).then(() => undefined) },
    ],
    caution: "Changes real stored data, labelled DEMO. Scenario 5 restores it, as does Restore chain on Verification.",
  },
  {
    id: "restore",
    title: "5 · Restore after tampering",
    blurb: "Put the altered records back and watch verification pass again.",
    lookAt: { href: "/verification", label: "Open Verification" },
    steps: [
      { label: "Restore the chain", go: (c) => c.run("demo.restore", undefined, { toast: false }).then(() => undefined) },
    ],
  },
  {
    id: "handoff",
    title: "6 · RPF → GRP handoff",
    blurb: "A case carried to a signed transfer, waiting for the receiving officer.",
    lookAt: { href: "/handoff", label: "Open Handoff" },
    steps: [
      { label: "Open a new case", go: (c) => newCase(c, "Scenario — custody handoff", "Parcel office, Demo Junction (DMJ)") },
      { label: "Capture the trigger", go: (c) => trigger(c, "material_recovered") },
      { label: "Record the field test", go: (c) => fieldTest(c, "presumptive_positive") },
      { label: "Sync to the server", go: (c) => c.run("sync.push", undefined, { toast: false }).then(() => undefined) },
      {
        label: "Sign the RPF transfer",
        go: async (c) => {
          await c.run(
            "handoff.transfer",
            {
              case_ref: c.bag.case_ref,
              device_id: c.rpfDevice,
              officer_id: c.officerId,
              receiving_post: "GRP Post, Demo Junction",
              sample_count: 3,
              seal_state: "intact",
              seal_marks: "SEAL-DMJ-26-0701 / 0702 / 0703",
              article_description: "Three sealed packets, synthetic demo article",
              gross_weight_g: 840,
            },
            { toast: false },
          );
        },
      },
    ],
    caution: "Stops at the transfer. The GRP receipt is signed on the Handoff screen, on the other device.",
  },
  {
    id: "tte",
    title: "7 · TTE screening flag",
    blurb: "A synthetic screening cue raised by a TTE and referred to RPF as a signed record.",
    lookAt: { href: "/tte", label: "Open TTE console" },
    steps: [
      {
        label: "Raise a demo screening flag",
        go: async (c) => {
          await c.run(
            "screening.flag",
            {
              operator_id: c.officerId,
              device_id: c.rpfDevice,
              screening_node_id: "TTE-DEMO-NODE-01",
              train_id: "12456",
              coach: "S4",
              seat: String(1 + Math.floor(Math.random() * 24)),
              cue_type: "surface_trace_cue",
              cue_note: "Scenario — synthetic cue raised from the demo control centre.",
              access_class: "AC1",
            },
            { toast: false },
          );
        },
      },
    ],
    caution: "Creates a record marked demo inside its signed payload, in a demo screening case.",
  },
  {
    id: "device",
    title: "8 · Device connect and drop",
    blurb: "Bring up the in-browser demo device, then drop it, to show how the console reports a lost link.",
    lookAt: { href: "/hardware", label: "Open PRAMAAN" },
    steps: [
      {
        label: "Start the demo device",
        go: async (c) => {
          c.hw.useDemoHardware();
          await new Promise((r) => setTimeout(r, 1200));
        },
      },
      {
        label: "Drop the link",
        go: async (c) => {
          await c.hw.disconnect();
          await new Promise((r) => setTimeout(r, 400));
        },
      },
    ],
    caution: "Touches the device link only. No evidence is created or changed.",
  },
  {
    id: "inconclusive",
    title: "9 · Inconclusive field test",
    blurb: "A test that decides nothing — recorded as inconclusive, never quietly turned into a negative.",
    lookAt: { href: "/cases", label: "Open the case" },
    steps: [
      { label: "Open a new case", go: (c) => newCase(c, "Scenario — inconclusive result", "Concourse, Demo Junction (DMJ)") },
      { label: "Capture the trigger", go: (c) => trigger(c, "nothing_recovered") },
      { label: "Record an inconclusive test", go: (c) => fieldTest(c, "inconclusive") },
      { label: "Sync to the server", go: (c) => c.run("sync.push", undefined, { toast: false }).then(() => undefined) },
    ],
  },
];

export function DemoScenarios() {
  const app = useApp();
  const hw = useHardware();
  const [running, setRunning] = React.useState<string | null>(null);
  const [step, setStep] = React.useState(0);
  const [done, setDone] = React.useState<Record<string, string>>({});

  const { store, officer } = app;
  if (!store) return null;

  const rpfDevice =
    store.devices.find((d) => d.assigned_officer_id === officer?.officer_id)?.device_id ??
    store.devices.find((d) => d.force === "RPF")?.device_id ??
    "";
  const grpDevice = store.devices.find((d) => d.force === "GRP")?.device_id ?? "";
  const grpOfficer =
    store.officers.find((o) => o.force === "GRP")?.officer_id ?? "";

  const play = async (s: Scenario) => {
    if (!officer) return;
    setRunning(s.id);
    setStep(0);
    const ctx: Ctx = {
      run: app.run,
      officerId: officer.officer_id,
      rpfDevice,
      grpDevice,
      grpOfficer,
      hw,
      bag: {},
    };
    for (let i = 0; i < s.steps.length; i++) {
      setStep(i + 1);
      await s.steps[i].go(ctx);
    }
    setDone((d) => ({ ...d, [s.id]: ctx.bag.case_ref ?? "" }));
    setRunning(null);
    setStep(0);
    app.pushToast({
      tone: "ok",
      title: `${s.title.replace(/^\d+ · /, "")} — ready`,
      body: `Open ${s.lookAt.label.toLowerCase()} to show the result.`,
    });
  };

  return (
    <Panel className="min-w-0">
      <PanelHead
        title="Scenarios"
        subtitle="One click sets the system up for a specific thing to show. Each step is a real action."
        icon={<Play size={17} />}
      />
      <ul className="grid gap-3 px-5 py-5 lg:grid-cols-2">
        {SCENARIOS.map((s) => {
          const isRunning = running === s.id;
          return (
            <li
              key={s.id}
              className={cx(
                "rounded-2xl border bg-white px-4 py-3.5",
                isRunning ? "border-brand/40" : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[15.5px] font-semibold text-fg">{s.title}</h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{s.blurb}</p>
                </div>
                {done[s.id] !== undefined && !isRunning ? (
                  <Pill tone="ok" icon={<Check size={11} />}>
                    Ready
                  </Pill>
                ) : null}
              </div>

              {s.caution ? (
                <p className="mt-2 flex gap-1.5 text-[12.5px] leading-relaxed text-fg-dim">
                  <TriangleAlert size={13} className="mt-[2px] shrink-0 text-warn" />
                  {s.caution}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  busy={isRunning}
                  disabled={Boolean(running) || !officer}
                  icon={<Play size={14} />}
                  onClick={() => void play(s)}
                >
                  {isRunning ? `Step ${step} of ${s.steps.length}` : "Run scenario"}
                </Button>
                <Link
                  href={s.lookAt.href}
                  className="inline-flex min-h-[36px] items-center gap-1.5 text-[13.5px] font-semibold text-brand hover:underline"
                >
                  {s.lookAt.label} <ArrowRight size={14} />
                </Link>
                {isRunning ? (
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted">
                    <CircleDashed size={13} className="animate-spin" />
                    {s.steps[Math.max(0, step - 1)]?.label}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-5 py-3.5 text-[13px] leading-relaxed text-fg-muted">
        Scenarios write to the same evidence store as everything else. Use{" "}
        <span className="font-semibold">Reset demo</span> above to return to the seeded state.
      </p>
    </Panel>
  );
}
