"use client";

import * as React from "react";
import { CircleDashed } from "lucide-react";
import { MonitorPlay, TriangleAlert } from "@/components/ui/icons";
import { connectionKind, useHardware, type ConnectionKind } from "@/components/providers/hardware-provider";
import { cx } from "@/components/ui/primitives";

const STYLE: Record<ConnectionKind, { wrap: string; dot: string }> = {
  connected: { wrap: "border-ok/25 bg-ok/[0.08] text-[#1F6A43]", dot: "bg-ok animate-pulse-ring" },
  connecting: { wrap: "border-brand/25 bg-brand/[0.07] text-[#0F4426]", dot: "" },
  offline: { wrap: "border-warn/30 bg-warn/[0.10] text-[#855A14]", dot: "" },
  demo: { wrap: "border-sim/28 bg-sim/[0.08] text-[#8E4331]", dot: "" },
};

/**
 * "● PRAMAAN ONLINE / ○ Connecting to PRAMAAN… / ⚠ PRAMAAN OFFLINE / Demo".
 * The device is named, and shape plus wording carry the state as well as colour.
 */
export function ConnectionStatus({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  const { state, transport, brand, isPramaan, pramaan } = useHardware();
  const kind = connectionKind(state, transport);
  const s = STYLE[kind];

  const label =
    kind === "demo"
      ? "Demo Device"
      : isPramaan
        ? kind === "connected"
          ? "PRAMAAN ONLINE"
          : kind === "connecting"
            ? pramaan.portOpen
              ? "Waiting for PRAMAAN…"
              : "Connecting to PRAMAAN…"
            : "PRAMAAN OFFLINE"
        : kind === "connected"
          ? "Device Connected"
          : kind === "connecting"
            ? "Connecting to device…"
            : `${brand === "PRAMAAN" ? "PRAMAAN" : "Device"} offline`;

  const icon =
    kind === "connected" ? (
      <span className={cx("inline-block h-2.5 w-2.5 rounded-full", s.dot)} aria-hidden="true" />
    ) : kind === "connecting" ? (
      <CircleDashed size={14} className="animate-spin" aria-hidden="true" />
    ) : kind === "demo" ? (
      <MonitorPlay size={14} aria-hidden="true" />
    ) : (
      <TriangleAlert size={14} aria-hidden="true" />
    );

  return (
    <span
      role="status"
      aria-live="polite"
      className={cx(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full border font-semibold",
        size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13.5px]",
        s.wrap,
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );
}
