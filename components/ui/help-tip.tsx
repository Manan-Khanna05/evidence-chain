"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { cx } from "@/components/ui/primitives";

/** Plain-language definitions for the terms an operator meets on screen. */
export const GLOSSARY = {
  "evidence-chain": {
    term: "Evidence Chain",
    body: "Each record carries the fingerprint of the one before it. If anyone changes, removes or reorders a record later, the chain no longer lines up and verification says so.",
  },
  anchor: {
    term: "Anchor",
    body: "A fingerprint of the whole log, timestamped by two independent time services. It proves records existed somewhere inside a time window — not at an exact second.",
  },
  presumptive: {
    term: "Presumptive Result",
    body: "What the field kit indicated on the spot. It is not a chemical identification; only a laboratory can identify a substance.",
  },
  "pending-sync": {
    term: "Pending Sync",
    body: "Records saved and signed on this device that have not reached the server yet. They are safe here and upload automatically when a connection is available.",
  },
  handoff: {
    term: "Handoff",
    body: "The custody transfer from RPF to GRP. The sender signs a transfer, the receiver signs a receipt against it — a receipt cannot exist without its transfer.",
  },
  "technical-details": {
    term: "Technical Details",
    body: "Hashes, signatures, Merkle proofs and anchor tokens. Hidden by default: you do not need them to use the system, but an examiner can open them to check everything.",
  },
  "device-time": {
    term: "Device time",
    body: "The phone's clock can be wrong or changed, so it is not trusted evidence of exact time. Trusted time comes from anchors.",
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;

/**
 * A small "?" that explains one term. Opens on hover, focus or tap; closes on
 * Escape or blur. Content is in the DOM for screen readers via aria-describedby.
 */
export function HelpTip({
  term,
  className,
  align = "center",
}: {
  term: GlossaryKey;
  className?: string;
  align?: "center" | "left" | "right";
}) {
  const g = GLOSSARY[term];
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  return (
    <span className={cx("relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={`What is ${g.term}?`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-fg-dim transition-colors duration-150 hover:bg-brand/10 hover:text-brand"
      >
        <HelpCircle size={15} />
      </button>
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={cx(
            "absolute top-full z-[80] mt-1.5 w-[260px] animate-fade-up rounded-xl border border-line-strong bg-white px-3.5 py-3 text-left shadow-lift",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "left" && "left-0",
            align === "right" && "right-0",
          )}
        >
          <span className="block text-[13px] font-semibold text-fg">{g.term}</span>
          <span className="mt-1 block text-[12.5px] font-normal normal-case leading-relaxed tracking-normal text-fg-muted">
            {g.body}
          </span>
        </span>
      ) : null}
    </span>
  );
}
