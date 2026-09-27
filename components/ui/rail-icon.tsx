"use client";

/**
 * The V2 icon set, generated from public/assets/icons/*.svg.
 *
 * The shapes are the supplied artwork exactly; only the <svg> wrapper is
 * rendered here so every icon inherits currentColor, size and stroke from the
 * UI — the same way the rest of the interface colours its icons. The markup
 * is static, bundled at build time from files in this repository.
 *
 * Regenerate after changing an SVG: see scripts/gen-rail-icons.py.
 */

import * as React from "react";

const ICONS = {
  "anchor": "<circle cx=\"12\" cy=\"5\" r=\"2\"/><path d=\"M12 7v11M8 10h8M5 13a7 7 0 0 0 14 0M7 19h10\"/>",
  "calendar": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M7 3v4M17 3v4M3 9h18\"/>",
  "capture": "<path d=\"M4 7h3l1.3-2h3.4L13 7h3a4 4 0 0 1 4 4v6H4v-6a4 4 0 0 1 4-4Z\"/><circle cx=\"12\" cy=\"13\" r=\"2.8\"/>",
  "cases": "<path d=\"M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5Z\"/>",
  "certificates": "<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"2\"/><path d=\"M8 7h8M8 11h8M8 15h5\"/><path d=\"m14 17 1.2 2.1L17 18.3l1.8.8L20 17\"/>",
  "check": "<path d=\"m5 12 4 4L19 6\"/>",
  "chevron-down": "<path d=\"m6 9 6 6 6-6\"/>",
  "chevron-right": "<path d=\"m9 5 7 7-7 7\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><path d=\"M12 7v5l3 2\"/>",
  "close": "<path d=\"M6 6l12 12M18 6 6 18\"/>",
  "cloud": "<path d=\"M7 18h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6-1.5A3.8 3.8 0 0 0 7 18Z\"/>",
  "dashboard": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/>",
  "demo-mode": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m10 9 5 3-5 3z\"/>",
  "device-status": "<rect x=\"7\" y=\"3\" width=\"10\" height=\"18\" rx=\"2\"/><path d=\"M10 6h4\"/><path d=\"M11 18h2\"/>",
  "field-test": "<path d=\"M9 3h6\"/><path d=\"M10 3v5.2l-4.2 7.2A3.1 3.1 0 0 0 8.5 20h7a3.1 3.1 0 0 0 2.7-4.6L14 8.2V3\"/><path d=\"M8.5 15h7\"/>",
  "filter": "<path d=\"M4 6h16M7 12h10M10 18h4\"/>",
  "guide": "<path d=\"M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21Z\"/><path d=\"M4 5.5V18.5A2.5 2.5 0 0 1 6.5 21\"/><path d=\"M8 7h8M8 11h8\"/>",
  "handoff": "<path d=\"M3 7h13\"/><path d=\"m13 4 3 3-3 3\"/><path d=\"M21 17H8\"/><path d=\"m11 14-3 3 3 3\"/>",
  "location": "<path d=\"M12 21s7-5 7-11a7 7 0 0 0-14 0c0 6 7 11 7 11Z\"/><circle cx=\"12\" cy=\"10\" r=\"2.3\"/>",
  "lock": "<rect x=\"5\" y=\"10\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3\"/><path d=\"M12 14v2\"/>",
  "menu": "<path d=\"M4 6h16M4 12h16M4 18h16\"/>",
  "notifications": "<path d=\"M6 17h12l-1.2-1.8V10a4.8 4.8 0 0 0-9.6 0v5.2Z\"/><path d=\"M10 20h4\"/>",
  "pending-sync": "<path d=\"M7 18h9a4 4 0 0 0 .3-8A5.5 5.5 0 0 0 5.7 8.5 3.8 3.8 0 0 0 7 18Z\"/><path d=\"m12 12 0 6\"/><path d=\"m9.5 15 2.5 3 2.5-3\"/>",
  "plus": "<path d=\"M12 5v14M5 12h14\"/>",
  "pramaan": "<rect x=\"4\" y=\"5\" width=\"16\" height=\"14\" rx=\"2\"/><path d=\"M8 2v3M16 2v3M8 19v3M16 19v3\"/><path d=\"M9 9h6v5H9z\"/><path d=\"M6.5 12H4M20 12h-2.5\"/>",
  "qr": "<path d=\"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z\"/><path d=\"M15 15h2v2h-2zM18 18h2M14 19h2M18 14h2\"/>",
  "replay": "<path d=\"M4 12a8 8 0 1 0 2.4-5.7\"/><path d=\"M4 5v5h5\"/><path d=\"m11 9 4 3-4 3z\"/>",
  "search": "<circle cx=\"10.8\" cy=\"10.8\" r=\"6.3\"/><path d=\"m16 16 4.5 4.5\"/>",
  "settings": "<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.9 1.9 0 0 0 .4 2.1l.1.1-1.6 1.6-.1-.1a1.9 1.9 0 0 0-2.1-.4 1.9 1.9 0 0 0-1.2 1.8v.2h-2.2v-.2a1.9 1.9 0 0 0-1.2-1.8 1.9 1.9 0 0 0-2.1.4l-.1.1-1.6-1.6.1-.1A1.9 1.9 0 0 0 8.2 15a1.9 1.9 0 0 0-1.8-1.2h-.2v-2.2h.2A1.9 1.9 0 0 0 8.2 10a1.9 1.9 0 0 0-.4-2.1l-.1-.1 1.6-1.6.1.1a1.9 1.9 0 0 0 2.1.4A1.9 1.9 0 0 0 12.7 5v-.2h2.2V5a1.9 1.9 0 0 0 1.2 1.8 1.9 1.9 0 0 0 2.1-.4l.1-.1 1.6 1.6-.1.1a1.9 1.9 0 0 0-.4 2.1 1.9 1.9 0 0 0 1.8 1.2h.2v2.2h-.2A1.9 1.9 0 0 0 19.4 15Z\"/>",
  "shield": "<path d=\"m12 3 7 3v5c0 4.4-3 8.2-7 10-4-1.8-7-5.6-7-10V6Z\"/>",
  "system-guide": "<path d=\"M4 6h16v12H4z\"/><path d=\"M8 9h8M8 12h6M8 15h4\"/>",
  "train": "<rect x=\"5\" y=\"3\" width=\"14\" height=\"15\" rx=\"3\"/><path d=\"M8 6h8M7 11h10M8 18v2M16 18v2M8 15h.01M16 15h.01\"/>",
  "tte": "<rect x=\"5\" y=\"3\" width=\"14\" height=\"18\" rx=\"2\"/><path d=\"M8 7h8M8 11h8M8 15h5\"/><circle cx=\"17\" cy=\"17\" r=\"3\"/><path d=\"M17 15.5v3M15.5 17h3\"/>",
  "user": "<circle cx=\"12\" cy=\"8\" r=\"3\"/><path d=\"M5 20a7 7 0 0 1 14 0\"/>",
  "verification": "<path d=\"m12 3 7 3v5c0 4.4-3 8.2-7 10-4-1.8-7-5.6-7-10V6Z\"/><path d=\"m8.5 12 2.2 2.2L15.7 9\"/>",
  "warning": "<path d=\"m12 3 9 16H3Z\"/><path d=\"M12 9v4M12 16h.01\"/>",
  "whats-new": "<path d=\"m12 3 1.4 4.1L17 9l-3.6 1.9L12 15l-1.4-4.1L7 9l3.6-1.9Z\"/><path d=\"m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8Z\"/>",
} as const;

export type RailIconName = keyof typeof ICONS;

export const RAIL_ICON_NAMES = Object.keys(ICONS) as RailIconName[];

export function RailIcon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className,
  style,
  title,
}: {
  name: RailIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Accessible name. Omit for decorative icons next to a text label. */
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}
