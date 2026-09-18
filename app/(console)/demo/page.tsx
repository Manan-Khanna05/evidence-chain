"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Anchor as AnchorIcon,
  ArrowLeftRight,
  CheckCircle2,
  CloudOff,
  Download,
  FileBadge,
  FlaskConical,
  MonitorPlay,
  PenLine,
  Radio,
  RotateCcw,
  Siren,
  UploadCloud,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Button,
  ButtonLink,
  Callout,
  Panel,
  PanelHead,
  Pill,
  cx,
} from "@/components/ui/primitives";
import { ConnectivityPill } from "@/components/ui/status";
import { fmtInterval } from "@/lib/format";
import { summariseAll } from "@/lib/domain/status";

const DEMO_CASE = "CASE-2026-00421";

interface Step {
  n: number;
  title: string;
  detail: string;
  say?: string;
  icon: React.ReactNode;
  action?: () => Promise<void> | void;
  actionLabel: string;
  done: boolean;
  disabled?: boolean;
  key: string;
}

export default function DemoPage() {
  const { store, run, refresh } = useApp();
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  /**
   * A run starts when this screen opens (or when the demo is reset). Steps are
   * ticked off against what has happened SINCE then, so the seeded cases — which
   * already contain a queued record, a handoff and a certificate — never make a
   * step look finished before the presenter has done it.
   */
  const [runMark, setRunMark] = React.useState<{ records: number; certificates: number } | null>(
    null,
  );
  React.useEffect(() => {
    if (store && !runMark) {
      setRunMark({ records: store.records.length, certificates: store.certificates.length });
    }
  }, [store, runMark]);

  if (!store || !runMark) return null;

  const newRecords = store.records.slice(runMark.records);
  const newCertificates = store.certificates.slice(runMark.certificates);

  const online = store.connectivity.online;
  const queued = store.records.filter((r) => r.status === "queued" || r.status === "captured");
  const unanchored = store.records.filter((r) => r.status === "pushed");
  const summaries = summariseAll(store);
  const demoSummary = summaries.find((s) => s.case_ref === DEMO_CASE) ?? null;
  const demoTampers = store.tamper.filter((t) => t.source === "demo");
  const pendingHandoff = store.handoffs.find((h) => h.transfer_record_id && !h.receipt_record_id);
  const latestAnchor = store.anchors[store.anchors.length - 1] ?? null;

  const act = async (
    key: string,
    action: string,
    payload?: Record<string, unknown>,
    toast?: { title: string; body?: string },
  ) => {
    setBusy(key);
    await run(action, payload, { toast: toast ?? false });
    setBusy(null);
  };

  const steps: Step[] = [
    {
      n: 1,
      key: "offline",
      title: "Go offline, then capture a trigger",
      detail:
        "Put the handheld in aeroplane mode and record what caused the stop. The sensor reading and referral tier are auto-populated by the mock adapter; the officer never types them.",
      say: "The phone has no connectivity. It still signs, and it still chains.",
      icon: <CloudOff size={16} />,
      actionLabel: online ? "Simulate offline" : "Capture trigger",
      done: newRecords.some((r) => r.type === "trigger"),
      action: online
        ? () =>
            act("offline", "connectivity.set", { online: false }, {
              title: "Aeroplane mode",
              body: "Capture continues locally; records will queue.",
            })
        : () => router.push("/capture/trigger"),
    },
    {
      n: 2,
      key: "field_test",
      title: "Run the presumptive field test",
      detail:
        "Reagent, manufacturer, lot, expiry, observed colour from a fixed vocabulary, reference table, ambient conditions and operator. The record prints its epistemic status on its face.",
      say: "Presumptive — not a chemical identification. Say it before a judge has to.",
      icon: <FlaskConical size={16} />,
      actionLabel: "Open field test",
      done: newRecords.some((r) => r.type === "field_test"),
      action: () => router.push("/capture/field-test"),
    },
    {
      n: 3,
      key: "reconnect",
      title: "Reconnect, push and anchor",
      detail:
        "The queue drains in sequence, the server validates each record, and the tree head goes to two independent timestamp authorities.",
      say: latestAnchor
        ? `Created between ${fmtInterval(latestAnchor.interval_start, latestAnchor.interval_end)} — never “created at” a single instant.`
        : "Created inside an interval, not at an instant.",
      icon: <UploadCloud size={16} />,
      actionLabel: !online ? "Simulate reconnect" : queued.length ? "Push queue" : "Anchor tree",
      done:
        online &&
        newRecords.length > 0 &&
        newRecords.every((r) => r.status === "anchored"),
      action: !online
        ? () =>
            act("reconnect", "connectivity.set", { online: true }, {
              title: "Connectivity restored",
              body: "Queued records can now be pushed.",
            })
        : queued.length
          ? () =>
              act("push", "sync.push", undefined, {
                title: "Queue pushed",
                body: "Records arrived in sequence and were validated on ingest.",
              })
          : () =>
              act("anchor", "anchor.create", undefined, {
                title: "Tree head anchored",
                body: "Two simulated authorities timestamped the current tree head.",
              }),
    },
    {
      n: 4,
      key: "handoff",
      title: "Complete the RPF → GRP handoff",
      detail:
        "The transferring officer signs on Device A; the receiving officer signs on Device B, against that transfer record. Sample count and seal state are carried across and compared.",
      say: "This is the seam where Indian NDPS cases are actually lost.",
      icon: <ArrowLeftRight size={16} />,
      actionLabel: pendingHandoff ? "Sign the pending receipt" : "Open handoff",
      done: newRecords.some((r) => r.type === "handoff_receipt"),
      action: () => router.push("/handoff"),
    },
    {
      n: 5,
      key: "certificate",
      title: "Export the Section 63 certificate",
      detail:
        "Part A auto-filled with device type, make, model, serial and hardware identifier, plus the hash. SHA-256 ticked, never MD5. Part B left blank for the expert.",
      say: "The statute requires a certificate in the prescribed form, and the prescribed form requires a hash.",
      icon: <FileBadge size={16} />,
      actionLabel: demoSummary?.has_certificate ? "Open certificate" : "Generate certificate",
      done: newCertificates.length > 0,
      action: () => {
        const fresh = newRecords[0]?.case_ref;
        router.push(`/certificate/${fresh ?? DEMO_CASE}`);
      },
    },
    {
      n: 6,
      key: "tamper",
      title: "Cheat — then get caught",
      detail:
        "Alter a stored record the way an administrator with database access would, then re-run the verifier. It goes red and names the record. Restore, and it goes green again.",
      say: "This is a real state change, not an animation.",
      icon: <Siren size={16} />,
      actionLabel: demoTampers.length ? "Restore chain" : "Simulate tampering",
      done: false,
      action: demoTampers.length
        ? () =>
            act("restore", "demo.restore", undefined, {
              title: "Demo data restored",
              body: "The altered records were replaced with the originals.",
            })
        : () =>
            act("tamper", "demo.tamper", undefined, {
              title: "A record was altered",
              body: "Open the verifier — it will name the broken record.",
            }),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Presentation"
        title="Demo control centre"
        subtitle="The six-minute demonstration, in order, with the controls that drive it. Every button here changes real state in the evidence store."
        status={<ConnectivityPill online={online} />}
        actions={
          <>
            <ButtonLink href={`/projector?case=${DEMO_CASE}`} icon={<MonitorPlay size={15} />}>Projector mode</ButtonLink>
            <Button
              variant="danger"
              busy={busy === "reset"}
              icon={<RotateCcw size={15} />}
              onClick={async () => {
                setBusy("reset");
                await run("demo.reset", undefined, {
                  toast: {
                    title: "Demo reset",
                    body: "All six seeded cases were rebuilt with fresh keys, hashes and anchors.",
                  },
                });
                await refresh();
                setRunMark(null);
                setBusy(null);
              }}
            >
              Reset demo
            </Button>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        {/* ------------------------------------------------------- the run */}
        <Panel className="min-w-0">
          <PanelHead
            title="Six minutes, in this order"
            subtitle="Each step leaves the system in the state the next one needs."
          />
          <ol className="divide-y divide-line">
            {steps.map((s) => (
              <li key={s.key} className="flex gap-4 px-5 py-4">
                <div
                  className={cx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                    s.done
                      ? "border-ok/45 bg-ok/12 text-ok"
                      : "border-line-strong bg-ink-800 text-fg-dim",
                  )}
                >
                  {s.done ? <CheckCircle2 size={17} /> : s.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono text-[11px] text-fg-dim">
                      {String(s.n).padStart(2, "0")}
                    </span>
                    <span className="text-[14px] font-semibold text-fg">{s.title}</span>
                    {s.done ? <Pill tone="ok">Done</Pill> : null}
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">{s.detail}</p>
                  {s.say ? (
                    <p className="mt-2 border-l-2 border-brand/50 pl-3 text-[12.5px] italic leading-relaxed text-fg">
                      “{s.say}”
                    </p>
                  ) : null}
                  <Button
                    size="sm"
                    className="mt-2.5"
                    variant={s.n === 6 ? (demoTampers.length ? "success" : "danger") : "secondary"}
                    busy={busy === s.key || busy === "offline" || busy === "reconnect" ? busy === s.key : false}
                    onClick={() => s.action?.()}
                  >
                    {s.actionLabel}
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          <div className="border-t border-line p-5">
            <Callout tone="warn" title="Then say the limit out loud">
              “This does not make the field test correct. It cannot. It makes the test&apos;s
              reagent, lot, operator and epistemic status legible to a court that today receives one
              sentence in a panchanama.” Naming your own limit is what makes the rest of it credible.
            </Callout>
          </div>
        </Panel>

        {/* ---------------------------------------------------- controls */}
        <div className="min-w-0 space-y-5">
          <Panel className="min-w-0">
            <PanelHead
              title="Direct controls"
              subtitle="Every control the demo needs, in one place."
            />
            <div className="grid grid-cols-2 gap-2 p-5">
              <Control
                label="Capture trigger"
                icon={<Radio size={15} />}
                onClick={() => router.push("/capture/trigger")}
              />
              <Control
                label="Run field test"
                icon={<FlaskConical size={15} />}
                onClick={() => router.push("/capture/field-test")}
              />
              <Control
                label={online ? "Go offline" : "Reconnect"}
                icon={online ? <CloudOff size={15} /> : <UploadCloud size={15} />}
                busy={busy === "conn"}
                onClick={() =>
                  act("conn", "connectivity.set", { online: !online }, {
                    title: online ? "Aeroplane mode" : "Connectivity restored",
                  })
                }
              />
              <Control
                label="Push queue"
                icon={<UploadCloud size={15} />}
                disabled={!online || queued.length === 0}
                busy={busy === "push2"}
                onClick={() =>
                  act("push2", "sync.push", undefined, { title: "Queue pushed" })
                }
              />
              <Control
                label="Anchor tree"
                icon={<AnchorIcon size={15} />}
                disabled={!online}
                busy={busy === "anchor2"}
                onClick={() =>
                  act("anchor2", "anchor.create", undefined, { title: "Tree head anchored" })
                }
              />
              <Control
                label="Open handoff"
                icon={<PenLine size={15} />}
                onClick={() => router.push("/handoff")}
              />
              <Control
                label="Certificate"
                icon={<Download size={15} />}
                onClick={() => router.push(`/certificate/${DEMO_CASE}`)}
              />
              <Control
                label="Verifier"
                icon={<MonitorPlay size={15} />}
                onClick={() => router.push("/verification")}
              />
              <Control
                label="Simulate tamper"
                tone="danger"
                icon={<Siren size={15} />}
                busy={busy === "tamper2"}
                onClick={() =>
                  act("tamper2", "demo.tamper", undefined, { title: "A record was altered" })
                }
              />
              <Control
                label="Restore chain"
                tone="success"
                icon={<RotateCcw size={15} />}
                disabled={demoTampers.length === 0}
                busy={busy === "restore2"}
                onClick={() =>
                  act("restore2", "demo.restore", undefined, { title: "Demo data restored" })
                }
              />
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead title="Current state" subtitle="What a presenter needs to see at a glance." />
            <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 p-5 text-[13px]">
              <State k="Connectivity" v={online ? "Online" : "Offline"} tone={online ? "ok" : "warn"} />
              <State
                k="Queued records"
                v={String(queued.length)}
                tone={queued.length ? "warn" : "ok"}
              />
              <State
                k="Unanchored"
                v={String(unanchored.length)}
                tone={unanchored.length ? "warn" : "ok"}
              />
              <State k="Anchors" v={String(store.anchors.length)} tone="neutral" />
              <State
                k="Pending handoff"
                v={pendingHandoff ? pendingHandoff.case_ref : "None"}
                tone={pendingHandoff ? "warn" : "ok"}
              />
              <State
                k="Altered records"
                v={String(store.tamper.length)}
                tone={store.tamper.length ? "danger" : "ok"}
              />
              <State k="Cases" v={String(store.cases.length)} tone="neutral" />
              <State k="Certificates" v={String(store.certificates.length)} tone="neutral" />
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead title="Seeded cases" subtitle="What each one is there to demonstrate." />
            <ul className="divide-y divide-line">
              {summaries.map((s) => (
                <li key={s.case_ref} className="px-5 py-3">
                  <Link
                    href={`/cases/${s.case_ref}`}
                    className="mono text-[12.5px] font-semibold text-fg hover:text-brand"
                  >
                    {s.case_ref}
                  </Link>
                  <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">{s.title}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Callout tone="danger" title="Reset rebuilds everything">
            &ldquo;Reset demo&rdquo; regenerates the seed: new device keys, new signatures, freshly
            computed hashes, Merkle roots and anchor tokens, and the seeded tampered case restored to
            its tampered state. Anything captured during a run is discarded.
          </Callout>
        </div>
      </div>
    </>
  );
}

function Control({
  label,
  icon,
  onClick,
  disabled,
  busy,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: "danger" | "success";
}) {
  return (
    <Button
      variant={tone === "danger" ? "danger" : tone === "success" ? "success" : "secondary"}
      className="justify-start"
      icon={icon}
      onClick={onClick}
      disabled={disabled}
      busy={busy}
    >
      {label}
    </Button>
  );
}

function State({
  k,
  v,
  tone,
}: {
  k: string;
  v: string;
  tone: "ok" | "warn" | "danger" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-dim">{k}</span>
      <Pill tone={tone}>{v}</Pill>
    </div>
  );
}
