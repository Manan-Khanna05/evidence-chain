"use client";

import * as React from "react";
import { cx } from "@/components/ui/primitives";

/**
 * The Evidence Chain logo, drawn inline. Photographic artwork comes from the
 * supplied files in /public/assets (see lib/assets.ts); nothing here reaches
 * an external URL.
 */

/* ------------------------------------------------------------------ logo */

export function EvidenceChainMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-[13px] shadow-[0_6px_16px_-8px_rgba(27,63,145,0.7)]"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(150deg, #3B82F6 0%, #2563EB 45%, #173B8F 100%)",
      }}
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        {/* shield */}
        <path
          d="M12 2.6 4.8 5.4v6.1c0 4.5 3 8.1 7.2 9.9 4.2-1.8 7.2-5.4 7.2-9.9V5.4L12 2.6Z"
          fill="rgba(255,255,255,0.16)"
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* chain-link check */}
        <path
          d="m8.4 12.1 2.5 2.5 4.7-4.9"
          stroke="white"
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
  subtitle = "SIH 2026 • Phase 1",
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
