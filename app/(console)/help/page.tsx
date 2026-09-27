"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Eye,
  ListChecks,
  Route,
} from "lucide-react";
import { PlayCircle } from "@/components/ui/icons";
import { PageHeader } from "@/components/layout/app-shell";
import { Button, Panel, cx } from "@/components/ui/primitives";
import { AssetImage } from "@/components/ui/asset-image";
import { useReplayGuide } from "@/components/onboarding/onboarding";
import type { AssetKey } from "@/lib/assets";

type Section = {
  id: string;
  title: string;
  image: AssetKey;
  alt: string;
  todo: string[];
  see: string;
  next: string;
  link?: { href: string; label: string };
};

const SECTIONS: Section[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    image: "evidenceFlow",
    alt: "Evidence flow: capture, secure on the device, sync, verify, hand over",
    todo: [
      "Sign in with your officer ID.",
      "Look at the top of the screen: it shows whether you are online and whether the evidence device is connected.",
      "Use Dashboard to see what needs your attention today.",
    ],
    see: "Your name in the greeting, four quick actions, and the Device Status and Pending Sync cards.",
    next: "Connect the evidence device, or start a capture straight away — the device is optional.",
    link: { href: "/dashboard", label: "Open Dashboard" },
  },
  {
    id: "new-case",
    title: "New Case",
    image: "helpCapture",
    alt: "Capture evidence steps: select the case, press Acquire, wait, review, save",
    todo: [
      "Open Cases and press Create New Case.",
      "Enter where it happened — platform, train or location reference. The case number is generated for you.",
      "Press Create Case. It opens in its own workspace.",
    ],
    see: "NEW CASE and “Chain empty” beside the case number. Its first record will be position 1 of its own chain.",
    next: "Capture the trigger, then the field test, from the case workspace.",
    link: { href: "/cases", label: "Open Cases" },
  },
  {
    id: "existing-case",
    title: "Existing Case",
    image: "evidenceFlow",
    alt: "Evidence flow from capture to certificate",
    todo: [
      "Open Cases and pick the case you want. Search by case ID, place, officer or device.",
      "Read the timeline: it shows everything already recorded, in order.",
      "To add something new, use the buttons in the case workspace.",
    ],
    see: "“Existing case”, the number of records, and “Append-only” on the workspace.",
    next: "New work is added at the end. Nothing already recorded can be changed, reordered or deleted.",
    link: { href: "/cases", label: "Open Cases" },
  },
  {
    id: "capture",
    title: "Capture",
    image: "helpCapture",
    alt: "An officer pressing Acquire on the evidence device",
    todo: [
      "Choose what you did (searched, or did not search) and what was found.",
      "Record stops where nothing was found too — they matter as much as the hits.",
      "Check the sensor reading, which fills in by itself.",
    ],
    see: "The reading appears with a “Mock sensor” or device label — you never type it.",
    next: "Review everything, then Sign and save.",
  },
  {
    id: "review-save",
    title: "Review & Save",
    image: "helpCapture",
    alt: "Steps four and five: review details, save the record",
    todo: [
      "Read the review screen. Check the case, place, readings and result.",
      "If a device reading is shown, confirm that you took it (officer confirmation).",
      "Press Sign and save.",
    ],
    see: "“Evidence saved”, with the step guide showing Save complete.",
    next: "The record is signed and chained. Nothing can change it later without verification noticing.",
  },
  {
    id: "pramaan",
    title: "PRAMAAN",
    image: "pramaanDevice",
    alt: "The PRAMAAN evidence unit: load cell, status display, indicator lights and ACQUIRE buttons",
    todo: [
      "Plug PRAMAAN into the laptop with its USB cable. Use Chrome or Edge.",
      "Press Connect PRAMAAN and choose its serial port.",
      "Wait for the handshake: the console only says connected once the device has identified itself.",
    ],
    see: "PRAMAAN ONLINE, its device ID and firmware, Weight “LIVE • Load Cell” and Temperature “SIMULATED • Potentiometer”.",
    next: "Readings stream live but never become evidence by themselves. Press ACQUIRE, review, and confirm to save a record.",
    link: { href: "/hardware", label: "Open PRAMAAN" },
  },
  {
    id: "field-test",
    title: "Field Test",
    image: "helpCapture",
    alt: "Capture steps: select the case, press Acquire, review, save",
    todo: [
      "Open Field Test and select the case.",
      "Pick the kit, lot and expiry, and the colour you saw — all from lists.",
      "Choose the result: presumptive positive, presumptive negative, or inconclusive.",
    ],
    see: "A large notice: PRESUMPTIVE RESULT — NOT A CHEMICAL IDENTIFICATION.",
    next: "Only a laboratory can identify a substance. The record says so on its face.",
    link: { href: "/capture/field-test", label: "Open Field Test" },
  },
  {
    id: "offline",
    title: "Offline",
    image: "helpSync",
    alt: "Laptop showing Saved Offline with two records queued",
    todo: [
      "Keep working — capture does not need a network.",
      "Records are saved safely on this device.",
      "Check Pending Sync to see how many are waiting.",
    ],
    see: "An amber “Working offline” status and a count on Pending Sync.",
    next: "When the network returns, sync them.",
    link: { href: "/queue", label: "Open Pending Sync" },
  },
  {
    id: "sync",
    title: "Sync",
    image: "helpSync",
    alt: "Records uploading to the cloud when connected",
    todo: [
      "When online, press Sync Now on the Dashboard or Pending Sync.",
      "Then press Anchor Now to give the records trusted time.",
    ],
    see: "The waiting count goes to zero and records show as Synced, then Trusted time.",
    next: "Records are on the server, in the same order they were captured.",
    link: { href: "/queue", label: "Open Pending Sync" },
  },
  {
    id: "verify",
    title: "Verification",
    image: "helpVerify",
    alt: "Laptop showing Evidence Verified with four checks passed",
    todo: ["Open Verification.", "Pick a case, or the whole log.", "Read the answer."],
    see: "“Evidence chain verified” with green checks — or “Integrity attention”, naming the changed record.",
    next: "If it needs attention, open that record. Technical Details show exactly which check failed.",
    link: { href: "/verification", label: "Open Verification" },
  },
  {
    id: "handoff",
    title: "Handoff",
    image: "handoff",
    alt: "RPF officer handing a sealed evidence box to a GRP officer",
    todo: [
      "RPF: open Handoff, pick the case, enter samples, seal marks and weight, and sign the transfer.",
      "GRP: on the other phone, count the samples, check the seals, and sign the receipt.",
    ],
    see: "The handoff document with both signatures, or a clear mismatch if counts or seals differ.",
    next: "A receipt cannot exist without its transfer. The case is ready for its certificate.",
    link: { href: "/handoff", label: "Open Handoff" },
  },
  {
    id: "certificate",
    title: "Certificate",
    image: "evidenceFlow",
    alt: "Evidence flow from capture to certificate",
    todo: [
      "Open Certificates and choose a case that is anchored and handed over.",
      "Generate the Section 63 certificate and export the PDF.",
    ],
    see: "Part A filled from the records, with the SHA-256 hash. Part B left blank for the expert.",
    next: "Part B is signed by a person, on paper. The system never invents that signature.",
    link: { href: "/certificate", label: "Open Certificates" },
  },
  {
    id: "tte",
    title: "TTE Demo",
    image: "railwayLight",
    alt: "A railway platform in soft light",
    todo: [
      "Open TTE Screening. Everything there is a demonstration — there is no TTE device.",
      "Select a seat in the coach to see its synthetic screening state.",
      "If a cue warrants it, choose the cue and the access, then flag it for RPF.",
    ],
    see: "A DEMO MODE badge on every screen, and “SCREENING CUE — NOT A DETECTION”.",
    next: "A flag becomes a signed record in a demo case, referred to RPF. It is not a detection, and “screened” only means someone looked.",
    link: { href: "/tte", label: "Open TTE Screening" },
  },
  {
    id: "diagnostics",
    title: "Diagnostics",
    image: "pramaanDevice",
    alt: "The PRAMAAN evidence unit",
    todo: [
      "Open Device Status and switch to Diagnostics.",
      "Developer diagnostics lists every line the device sent, and whether it was understood.",
      "Use Copy lines if you need to send them to someone.",
    ],
    see: "Green lines were understood; amber ones were not. Rejections say why.",
    next: "If nothing arrives, the console tells you whether the port is silent or the firmware is different.",
    link: { href: "/settings/device", label: "Open Diagnostics" },
  },
  {
    id: "device-status",
    title: "Device Status",
    image: "pramaanDevice",
    alt: "The PRAMAAN evidence unit with its status display and indicator lights",
    todo: [
      "Look at the Device Status card on the Dashboard.",
      "Green: ready. Amber: taking a reading or waiting for you. Red: a fault.",
    ],
    see: "Connected, Connecting, Offline or Demo — in words, not only colours.",
    next: "If a sensor needs attention, the card names it.",
    link: { href: "/settings/device", label: "Open Device Status" },
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    image: "railwayLight",
    alt: "A railway platform in soft light",
    todo: [
      "Device offline? Check the power bank, keep the device close, press Try again.",
      "Still offline? Use the USB cable, or carry on without the device.",
      "Records not syncing? Check you are online, then press Sync Now.",
      "Verification says No? Do not re-capture — open the record and report it.",
    ],
    see: "Plain messages that say what to do next, never raw error codes.",
    next: "Nothing you capture is lost while you troubleshoot.",
  },
  {
    id: "statuses",
    title: "What Each Status Means",
    image: "extraIcons",
    alt: "Evidence Chain icons: capture, test, secure, save, sync, handoff, document, device, rail",
    todo: [
      "Saved: signed and held on this device. Waiting to sync: not on the server yet.",
      "Synced: the server received and checked it. Trusted time: inside a timestamped window.",
      "Verified: the chain still matches what was signed. Chain broken: something changed after signing.",
    ],
    see: "Every status has a word as well as a colour, so it reads the same to everyone.",
    next: "Presumptive positive, presumptive negative and inconclusive stay distinct. An inconclusive test is never recorded as a negative.",
  },
  {
    id: "security",
    title: "Security & Evidence Integrity",
    image: "helpVerify",
    alt: "Laptop showing Evidence Verified with four checks passed",
    todo: [
      "Each record is fingerprinted, signed by the device, and linked to the previous record of the same case.",
      "Records cannot be edited, reordered or deleted through the application.",
      "A case counts from 1 and links only within itself, so cases cannot be mixed.",
    ],
    see: "“Immutable record” on any record you open, and the case position in its technical details.",
    next: "If someone edits the database directly, verification names the record and the exact position that broke.",
    link: { href: "/verification", label: "Open Verification" },
  },
  {
    id: "technical",
    title: "Technical Details",
    image: "extraIcons",
    alt: "Evidence Chain icons: capture, test, secure, save, sync, handoff, document, device, rail",
    todo: [
      "Look for “View Technical Details” on a card.",
      "It opens a side panel with hashes, signatures, Merkle proofs and anchors.",
    ],
    see: "Everything an examiner needs to re-check the evidence independently.",
    next: "You never need these for day-to-day work. They are there for scrutiny.",
  },
];

export default function HelpPage() {
  const replay = useReplayGuide();

  return (
    <>
      <PageHeader
        eyebrow="Help"
        title="How to Use"
        subtitle="Every step, with a picture: what to do, what you should see, and what happens next."
        actions={
          <Button variant="primary" icon={<PlayCircle size={17} />} onClick={replay}>
            Replay Guide
          </Button>
        }
      />

      {/* The three things every officer does, as pictures first. */}
      <section aria-label="The guide at a glance" className="mb-6 grid gap-3 md:grid-cols-3">
        {(
          [
            { href: "#capture", image: "helpCapture", title: "Capture evidence", body: "Select the case, press ACQUIRE, review, confirm." },
            { href: "#sync", image: "helpSync", title: "Offline to online", body: "Records wait safely on the device and sync later." },
            { href: "#verify", image: "helpVerify", title: "Verify evidence", body: "One check tells you whether the chain is intact." },
          ] as { href: string; image: AssetKey; title: string; body: string }[]
        ).map((c) => (
          <a
            key={c.href}
            href={c.href}
            className="hover-lift flex items-center gap-4 rounded-[20px] border border-line bg-white p-3 shadow-chip hover:shadow-lift"
          >
            <span className="w-[120px] shrink-0 overflow-hidden rounded-xl bg-ink-750">
              <AssetImage name={c.image} alt="" rounded={false} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[17px] font-bold text-brand-deep">{c.title}</span>
              <span className="mt-0.5 block text-[13.5px] leading-snug text-fg-muted">{c.body}</span>
            </span>
          </a>
        ))}
      </section>

      <nav aria-label="Help sections" className="mb-6">
        <ol className="flex flex-wrap gap-2">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-line bg-white px-3 text-[13.5px] font-medium text-fg-muted transition-colors duration-150 hover:border-brand/30 hover:text-brand-deep"
              >
                <span className="text-[12px] font-bold text-brand">{i + 1}</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-5">
        {SECTIONS.map((s, i) => (
          <Panel key={s.id} as="article" className="scroll-mt-6 overflow-hidden">
            <div id={s.id} className="scroll-mt-6" />
            <div
              className={cx(
                "grid gap-6 p-5 lg:p-7",
                "items-start md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]",
              )}
            >
              <div className="mx-auto w-full max-w-[340px]">
                <AssetImage
                  name={s.image}
                  alt={s.alt}
                  priority={i === 0}
                  sizes="340px"
                  className={s.image === "pramaanDevice" ? "border border-line" : undefined}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-[16px] font-bold text-white">
                    {i + 1}
                  </span>
                  <h2 className="font-display text-[23px] font-bold tracking-tight text-brand-deep">{s.title}</h2>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  <div>
                    <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-brand">
                      <ListChecks size={16} /> What to do
                    </div>
                    <ol className="mt-2 space-y-1.5">
                      {s.todo.map((t, k) => (
                        <li key={k} className="flex gap-2 text-[15px] leading-relaxed text-fg">
                          <span className="font-semibold text-fg-dim">{k + 1}.</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-ok">
                      <Eye size={16} /> What you should see
                    </div>
                    <p className="mt-2 text-[15px] leading-relaxed text-fg">{s.see}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-sim">
                      <Route size={16} /> What happens next
                    </div>
                    <p className="mt-2 text-[15px] leading-relaxed text-fg">{s.next}</p>
                  </div>
                </div>

                {s.link ? (
                  <Link
                    href={s.link.href}
                    className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 text-[14.5px] font-semibold text-brand hover:underline"
                  >
                    {s.link.label} <ArrowRight size={16} />
                  </Link>
                ) : null}
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
