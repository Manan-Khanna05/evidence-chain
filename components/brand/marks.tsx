"use client";

import * as React from "react";
import { cx } from "@/components/ui/primitives";

/**
 * The Evidence Chain logo, drawn inline. Photographic artwork comes from the
 * supplied files in /public/assets (see lib/assets.ts); nothing here reaches
 * an external URL.
 */

/* ------------------------------------------------------------------ logo */

export function EvidenceChainMark({
  size = 40,
  tone = "green",
}: {
  size?: number;
  /** "gold" is the shield on the dark-green brand block; "green" everywhere else. */
  tone?: "green" | "gold";
}) {
  const gold = tone === "gold";
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-[13px]"
      style={{
        width: size,
        height: size,
        background: gold
          ? "linear-gradient(150deg, #E2B45A 0%, #C58A27 55%, #9C6A18 100%)"
          : "linear-gradient(150deg, #2E6A45 0%, #14532D 45%, #0B3B27 100%)",
        boxShadow: gold
          ? "0 6px 16px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.35)"
          : "0 6px 16px -8px rgba(11,59,39,0.7)",
      }}
    >
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {/* shield */}
        <path
          d="M12 2.6 4.8 5.4v6.1c0 4.5 3 8.1 7.2 9.9 4.2-1.8 7.2-5.4 7.2-9.9V5.4L12 2.6Z"
          fill={gold ? "rgba(11,59,39,0.18)" : "rgba(255,255,255,0.16)"}
          stroke={gold ? "#0B3B27" : "white"}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* chain-link check */}
        <path
          d="m8.4 12.1 2.5 2.5 4.7-4.9"
          stroke={gold ? "#0B3B27" : "white"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function BrandLockup({
  size = 40,
  subtitle = "V2 • SIH 2026",
}: {
  size?: number;
  subtitle?: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <EvidenceChainMark size={size} />
      <span className="leading-tight">
        <span className="block text-[16px] font-semibold tracking-tight text-brand-deep">
          Evidence Chain
        </span>
        <span className="block text-[10.5px] font-medium tracking-[0.02em] text-fg-dim">
          {subtitle}
        </span>
      </span>
    </span>
  );
}
