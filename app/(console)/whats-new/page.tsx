"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Cpu,
  FileBadge,
  FolderTree,
  Link2,
  Palette,
  ShieldCheck,
  Train,
  Wifi,
} from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { Panel, PanelHead, Pill } from "@/components/ui/primitives";

/**
 * What changed in V2.
 *
 * Every line here describes behaviour that exists in this build. Where
 * something is a demonstration rather than working hardware, it says so.
 */

type Change = { title: string; points: string[]; note?: string };

const SECTIONS: { id: string; title: string; icon: React.ReactNode; changes: Change[] }[] = [
  {
    id: "cases",
    title: "Case management",
    icon: <FolderTree size={18} />,
    changes: [
      {
        title: "New Case and Existing Cases are separate",
        points: [
          "A case is created deliberately, from Cases or the Dashboard, and opens its own workspace.",
          "Capture screens show which case they will write to, and how many records it already holds.",
          "The old case dropdown is gone: you can no longer slip into an existing case by accident.",
        ],
      },
      {
        title: "Append-only continuation",
        points: [
          "An existing case can receive new records, appended at the end.",
          "Records already in a case cannot be edited, reordered or deleted through the application.",
        ],
      },
    ],
  },
  {
    id: "integrity",
    title: "Evidence integrity",
    icon: <Link2 size={18} />,
    changes: [
      {
        title: "Every case has its own chain",
        points: [
          "Each record carries its position in its case, counted from 1, and links to the previous record of the same case.",
          "A new case starts at position 1 whatever any other case has reached.",
          "The per-device chain is still kept, so removing a record from a handset is still detectable.",
        ],
      },
      {
        title: "Stronger signatures and checks",
        points: [
          "A signature now covers the case reference and the record's position, so a record cannot be moved between cases or renumbered.",
          "Verification reports the exact position that failed, with the expected and actual link.",
          "Writes are refused — never silently repaired — when a case is unknown or a position is already taken.",
        ],
        note: "Records written before V2 keep their original signatures and are verified the way they were signed.",
      },
    ],
  },
  {
    id: "pramaan",
    title: "PRAMAAN",
    icon: <Cpu size={18} />,
    changes: [
      {
        title: "USB connection over a defined protocol",
        points: [
          "PRAMAAN-1: newline-delimited JSON at 115200 baud, with an identity handshake before the device is called connected.",
          "Live weight from the load cell and live temperature from the potentiometer, each labelled with its real source.",
          "Diagnostics show every serial line, including ones the console could not understand.",
        ],
        note: "The potentiometer is a simulated temperature input. There is no thermal sensor on this hardware, and the console shows thermal observation as unavailable.",
      },
      {
        title: "Telemetry is not evidence",
        points: [
          "Readings stream continuously, but only ACQUIRE followed by your confirmation creates a record.",
          "A capture records where each number came from, so a potentiometer reading can never be read back as a measurement of the sample.",
        ],
      },
    ],
  },
  {
    id: "tte",
    title: "TTE screening",
    icon: <Train size={18} />,
    changes: [
      {
        title: "New screening console — demonstration only",
        points: [
          "Walk a synthetic coach, review a cue for a seat, and flag it for RPF.",
          "A flag becomes a signed record in the same evidence chain, marked as a demo event inside the signed payload.",
          "Language is deliberately limited to screening cues, access and referral — never detection or identification.",
        ],
        note: "No TTE hardware exists in this build. Every seat, cue and record on that screen is synthetic.",
      },
    ],
  },
  {
    id: "offline",
    title: "Offline and sync",
    icon: <Wifi size={18} />,
    changes: [
      {
        title: "Offline-first, stated plainly",
        points: [
          "Capture works with no network: records are signed and saved on the device and listed under Pending Sync.",
          "Sync uploads them in order and the server checks each one on arrival.",
          "Recent lists are ordered by the append-only log, so a capture taken a minute ago appears first.",
        ],
      },
    ],
  },
  {
    id: "verification",
    title: "Verification and handoff",
    icon: <ShieldCheck size={18} />,
    changes: [
      {
        title: "A plain answer first",
        points: [
          "Verification answers one question — is this evidence chain intact? — with the technical checks behind a drawer.",
          "The tamper demonstration is still a real change to stored data, labelled DEMO / TRAINING.",
          "RPF → GRP handoff still needs two officers, two devices and two signatures; a receipt cannot exist without its transfer.",
        ],
      },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    icon: <ShieldCheck size={18} />,
    changes: [
      {
        title: "Operational audit trail",
        points: [
          "Every action — case opened, record captured, sync run, certificate generated — is logged on the server clock.",
          "Audit lines are kept apart from evidence: no signature, no chain position, no place in any case.",
        ],
      },
      {
        title: "Demo scenarios",
        points: [
          "Nine one-click scenarios set the system up for a specific demonstration.",
          "Each step calls the same action the interface calls — nothing is an animation.",
        ],
      },
    ],
  },
  {
    id: "certificates",
    title: "Certificates",
    icon: <FileBadge size={18} />,
    changes: [
      {
        title: "Unchanged where it matters",
        points: [
          "Section 63 certificates are filled from the verified records, always with SHA-256.",
          "Part B is left blank for the expert. The system never invents a signature or a conclusion.",
        ],
      },
    ],
  },
  {
    id: "design",
    title: "Design",
    icon: <Palette size={18} />,
    changes: [
      {
        title: "Railway visual system",
        points: [
          "Railway green for navigation and primary actions, brass for pending states, terracotta for attention and demo markers, red only for genuine integrity failures.",
          "A dark-green brand block, a shared utility header with search and system state, and the station hero on the dashboard.",
          "One icon set across navigation and actions, supplied with the V2 asset pack.",
        ],
      },
      {
        title: "Easier to read and operate",
        points: [
          "Status is never carried by colour alone: every state has a word and a shape.",
          "Every reading shows its source — LIVE, SIMULATED or UNAVAILABLE — next to the value.",
          "Skeletons while loading instead of spinners; no horizontal scrolling on phone-width screens.",
        ],
      },
    ],
  },
];

export default function WhatsNewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Release"
        title="What's New in Evidence Chain V2"
        subtitle="Everything listed here works in this build. Demonstrations are labelled as demonstrations."
        status={<Pill tone="brand">Version 2</Pill>}
        actions={
          <Link
            href="/system-guide"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-brand hover:underline"
          >
            System Guide <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="space-y-5">
        {SECTIONS.map((s) => (
          <Panel key={s.id} as="article" className="min-w-0">
            <PanelHead title={s.title} icon={s.icon} />
            <div className="grid gap-5 px-5 py-5 md:grid-cols-2">
              {s.changes.map((c) => (
                <div key={c.title} className="min-w-0">
                  <h3 className="text-[16px] font-semibold text-fg">{c.title}</h3>
                  <ul className="mt-2 space-y-1.5">
                    {c.points.map((p) => (
                      <li key={p} className="flex gap-2 text-[14.5px] leading-relaxed text-fg-muted">
                        <Check size={16} className="mt-[3px] shrink-0 text-ok" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  {c.note ? (
                    <p className="mt-2.5 rounded-xl border border-sim/25 bg-sim/[0.06] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-fg-muted">
                      {c.note}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="mt-5">
        <PanelHead title="What this system still does not do" />
        <ul className="grid gap-2 px-5 py-5 sm:grid-cols-2">
          {[
            "Identify a substance. A field test is presumptive; only a laboratory can identify.",
            "Detect concealment. There is no thermal imaging sensor on this hardware.",
            "Prove an exact time. Device clocks are untrusted; anchors prove a window.",
            "Judge a person. A screening flag means someone should look, nothing more.",
            "Prove physical truth. Verification shows records are unchanged, not that the world matched them.",
            "Run on real TTE hardware. That console is a demonstration.",
          ].map((t) => (
            <li key={t} className="flex gap-2 text-[14.5px] leading-relaxed text-fg-muted">
              <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-fg-dim" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
