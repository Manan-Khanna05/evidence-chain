"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Eye, ListChecks, PlayCircle, Route } from "lucide-react";
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
    image: "railwayBranding",
    alt: "Evidence Chain — Railway Evidence Integrity Console: capture, secure, verify, handoff",
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
    id: "connect-device",
    title: "Connect Device",
    image: "deviceEvidence",
    alt: "The phone showing Connected next to the RPF evidence device",
    todo: [
      "Switch the evidence device on (connect the power bank).",
      "Keep it near the phone. It connects by itself.",
      "If asked, join the “EvidenceChain” Wi-Fi, or plug in the USB cable.",
    ],
    see: "“● Device Connected” at the top, and a green LED on the device.",
    next: "The device is ready. Press ACQUIRE when you are ready to take a reading.",
    link: { href: "/hardware", label: "Open Hardware" },
  },
  {
    id: "start-case",
    title: "Start a Case",
    image: "helpCapture",
    alt: "Capture evidence steps: select the case, press Acquire, wait, review, save",
    todo: [
      "Open Capture.",
      "Choose “New case” for a new stop, or pick an existing case to add to it.",
      "Enter where it happened — platform, train or location reference.",
    ],
    see: "The step guide at the top, with Select Case highlighted.",
    next: "Record what caused the stop in the same screen.",
    link: { href: "/capture/trigger", label: "Open Capture" },
  },
  {
    id: "capture-trigger",
    title: "Capture Trigger",
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
    id: "field-test",
    title: "Field Test",
    image: "deviceEvidence",
    alt: "Evidence device with a sample jar and swab",
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
    id: "offline",
    title: "Offline Mode",
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
    id: "verify",
    title: "Verify",
    image: "helpVerify",
    alt: "Laptop showing Evidence Verified with four checks passed",
    todo: ["Open Verification.", "Pick a case, or the whole log.", "Read the answer."],
    see: "“Is this evidence chain intact?” — Yes, with green checks; or No, naming the changed record.",
    next: "If it says No, open that record. Technical Details show exactly which check failed.",
    link: { href: "/verification", label: "Open Verification" },
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
    id: "device-status",
    title: "Device Status",
    image: "deviceEvidence",
    alt: "Phone and evidence device with status LEDs",
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
    alt: "Railway platform with an Indian Railways sign",
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
                s.image === "railwayBranding"
                  ? "grid-cols-1"
                  : "items-start md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]",
              )}
            >
              <div className={cx("mx-auto w-full", s.image === "railwayBranding" ? "max-w-[1100px]" : "max-w-[340px]")}>
                <AssetImage name={s.image} alt={s.alt} priority={i === 0} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-[16px] font-bold text-white">
                    {i + 1}
                  </span>
                  <h2 className="text-[22px] font-semibold tracking-tight text-brand-deep">{s.title}</h2>
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
