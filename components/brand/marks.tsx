"use client";

import * as React from "react";
import { cx } from "@/components/ui/primitives";

/**
 * Local brand assets. The logo, India outline and integrity shield are drawn
 * inline; the two banners come from one local PNG in /public. Nothing here
 * reaches an external URL, so none of it can break during a presentation.
 */

/* ------------------------------------------------------------------ logo */

export function EvidenceChainMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-[13px] shadow-[0_6px_16px_-8px_rgba(27,63,145,0.7)]"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(150deg, #3B7BF0 0%, #2E6BE6 45%, #1B3F91 100%)",
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

/* ------------------------------------------------------- banner artwork */

/**
 * Both banners live in one asset sheet, `public/images/banners.png`
 * (2172 × 724). The railway hero occupies y 0–360 and the India pledge band
 * y 369–719, so each is shown by scaling the sheet to the container width and
 * offsetting vertically — no cropping step, one HTTP request, and the two stay
 * in sync if the artwork is ever replaced.
 */
const SHEET = "/images/banners.png";

/** y-offset as a background-position percentage: top / (imageH − bandH). */
const HERO_BAND = { w: 2172, top: 0, height: 360 };
const INDIA_BAND = { w: 2172, top: 369, height: 350 };
const SHEET_H = 724;

/**
 * Show one band of the sheet, optionally cropped horizontally to `[x0, x1]`
 * (fractions of the sheet width) so a wide banner can sit in a narrow column
 * without its content shrinking away.
 */
function bandStyle(
  band: { w: number; top: number; height: number },
  crop?: { x0: number; x1: number },
): React.CSSProperties {
  const posY = band.top / (SHEET_H - band.height);
  const fw = crop ? crop.x1 - crop.x0 : 1;
  const posX = crop && fw < 1 ? crop.x0 / (1 - fw) : 0;
  return {
    aspectRatio: `${band.w * fw} / ${band.height}`,
    backgroundImage: `url(${SHEET})`,
    backgroundSize: `${(100 / fw).toFixed(3)}% auto`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: `${(posX * 100).toFixed(3)}% ${(posY * 100).toFixed(3)}%`,
  };
}

/**
 * The dashboard masthead. The title, subtitle and Sign/Chain/Anchor/Verify/
 * Secure row are part of the artwork, so they are not rendered again on top —
 * an accessible heading is provided separately by the caller.
 */
export function HeroBanner({ className }: { className?: string }) {
  return <div role="img" aria-label="Railway Evidence Integrity Console" className={cx("w-full", className)} style={bandStyle(HERO_BAND)} />;
}

/**
 * The same artwork cropped to the train and sunrise, for screens whose own
 * title is rendered live over it.
 */
export function HeroStrip({ className, height = 96 }: { className?: string; height?: number }) {
  return (
    <div
      aria-hidden="true"
      className={cx("w-full", className)}
      style={{
        height,
        backgroundImage: `url(${SHEET})`,
        /*
         * Zoomed past the artwork's own title and clear of its "For a Safer
         * Tomorrow" script, framing the locomotive and the sunrise between them.
         */
        backgroundSize: "auto 700%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "75% 16%",
      }}
    />
  );
}

/**
 * "Integrity today. A safer India tomorrow." — India map, tricolour rule and
 * the three pillars.
 *
 * `full` shows the whole band including the parliament silhouette, for a
 * full-width slot. The default crops to the map-through-pillars span so the
 * type stays legible in a sidebar-width column.
 */
export function IndiaPledgeBanner({
  className,
  full = false,
}: {
  className?: string;
  full?: boolean;
}) {
  return (
    <div
      role="img"
      aria-label="Integrity today. A safer India tomorrow. Secure Railways, Accountable Process, Stronger Justice."
      className={cx("w-full", className)}
      style={bandStyle(INDIA_BAND, full ? undefined : { x0: 0.1, x1: 0.72 })}
    />
  );
}

/* -------------------------------------------------------- india outline */

/**
 * A deliberately understated India silhouette. Used once, at low opacity,
 * behind a supporting card — never as a map or a data surface.
 */
export function IndiaSilhouette({
  className,
  opacity = 0.1,
}: {
  className?: string;
  opacity?: number;
}) {
  return (
    <svg
      className={cx("h-full w-full", className)}
      viewBox="0 0 200 220"
      fill="none"
      aria-hidden="true"
      style={{ opacity }}
    >
      <path
        d="M74 6c8-2 16 3 22 8 7 6 15 4 23 3 7-1 15-2 20 3 4 5 1 12-2 17-4 6-9 11-8 18 1 6 7 10 12 14 6 5 12 11 11 19-1 7-8 11-13 15-8 6-13 15-14 25-1 8-1 17-6 24-4 6-11 9-15 15-5 7-6 16-9 24-3 9-9 17-18 20-6 2-13 1-17-4-5-6-4-14-6-21-2-9-8-16-13-23-6-8-12-16-14-26-2-9 1-18 4-27 3-8 6-16 5-25-1-8-6-14-8-21-2-8-1-17 5-23 5-6 13-8 20-10 7-2 14-3 21-5Z"
        fill="currentColor"
      />
      <path d="M96 196c4 8 8 16 14 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* --------------------------------------------------------- integrity art */

/** The shield used on the integrity card — layered glass, not a flat icon. */
export function IntegrityShield({ size = 132, broken = false }: { size?: number; broken?: boolean }) {
  const a = broken ? "#F0A0A0" : "#7FD9C0";
  const b = broken ? "#E05252" : "#0F9D6E";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`sh-${broken}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EAF4FF" />
          <stop offset="45%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
        <linearGradient id={`shg-${broken}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d="M60 10 22 24v30c0 22 15 40 38 50 23-10 38-28 38-50V24L60 10Z"
        fill={`url(#sh-${broken})`}
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M60 10 22 24v30c0 12 4 22 12 30L60 10Z" fill={`url(#shg-${broken})`} />
      {broken ? (
        <path
          d="M46 46l28 28M74 46 46 74"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="m42 60 13 13 24-26"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
