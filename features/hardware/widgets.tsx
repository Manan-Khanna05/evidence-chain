"use client";

import * as React from "react";
import {
  Activity,
  CircleDashed,
  Radio,
  Thermometer,
  Usb,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Check,
  Clock,
  Cpu,
  X,
} from "@/components/ui/icons";
import { Pill, cx, type Tone } from "@/components/ui/primitives";
import { linkLabel, useHardware } from "@/components/providers/hardware-provider";
import type { LinkState, TransportKind } from "@/lib/hardware/protocol";

/* ------------------------------------------------------------ link chip */

export function linkTone(state: LinkState, transport: TransportKind): Tone {
  if (state !== "connected") {
    return state === "syncing" || state === "connecting" || state === "searching"
      ? "warn"
      : state === "error"
        ? "danger"
        : "neutral";
  }
  return transport === "demo" ? "sim" : "ok";
}

/**
 * The one place the link is described. Every surface renders this, so the
 * console cannot show "connected" in one corner and "offline" in another —
 * and demo hardware is always visually distinct from a real board.
 */
export function HardwareChip({ compact = false }: { compact?: boolean }) {
  const { state, transport, deviceId } = useHardware();
  const tone = linkTone(state, transport);
  const icon =
    state !== "connected" ? (
      state === "disconnected" ? (
        <WifiOff size={12} />
      ) : (
        <CircleDashed size={12} className="animate-spin" />
      )
    ) : transport === "wifi" ? (
      <Wifi size={12} />
    ) : transport === "usb" ? (
      <Usb size={12} />
    ) : (
      <CircleDashed size={12} />
    );

  return (
    <Pill tone={tone} icon={icon} title={`${linkLabel(state, transport)}${deviceId ? ` · ${deviceId}` : ""}`}>
      {compact ? (transport === "demo" ? "Demo" : state === "connected" ? "Connected" : "Offline") : linkLabel(state, transport)}
    </Pill>
  );
}

/* ---------------------------------------------------------- load gauge */

/**
 * Sampling force. A radial arc rather than an industrial bar — it reads as
 * part of the console, not as SCADA.
 */
export function LoadGauge({
  grams,
  stable,
  available,
  max = 400,
}: {
  grams: number | null;
  stable: boolean;
  available: boolean;
  max?: number;
}) {
  const v = grams ?? 0;
  const pct = Math.max(0, Math.min(1, v / max));
  const R = 62;
  const C = Math.PI * R; // semicircle
  const dash = C * pct;

  return (
    <div className="flex flex-col items-center">
      <svg width="170" height="98" viewBox="0 0 170 98" aria-hidden="true">
        <defs>
          <linearGradient id="lg-arc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5B8AD6" />
            <stop offset="100%" stopColor="#23427C" />
          </linearGradient>
        </defs>
        <path
          d="M23 88 A62 62 0 0 1 147 88"
          fill="none"
          stroke="#E3EAF3"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M23 88 A62 62 0 0 1 147 88"
          fill="none"
          stroke={available ? "url(#lg-arc)" : "#CBD6E4"}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          style={{ transition: "stroke-dasharray .3s ease-out" }}
        />
      </svg>
      <div className="-mt-9 text-center">
        <div className="text-[30px] font-semibold leading-none tabular-nums text-brand-deep">
          {available && grams !== null ? grams.toFixed(1) : "—"}
          <span className="ml-1 text-[15px] font-medium text-fg-muted">g</span>
        </div>
        <div className="mt-2">
          {!available ? (
            <Pill tone="danger">Load sensor unavailable</Pill>
          ) : stable ? (
            <Pill tone="ok" icon={<Check size={11} />}>
              Stable
            </Pill>
          ) : (
            <Pill tone="warn">Settling</Pill>
          )}
        </div>
      </div>
      <div className="label mt-2.5">Sampling force</div>
    </div>
  );
}

/* -------------------------------------------------------- thermal map */

const THERMAL_STOPS = [
  [8, 62, 140],
  [40, 124, 200],
  [120, 190, 180],
  [240, 200, 110],
  [232, 137, 30],
  [208, 62, 62],
] as const;

function thermalColour(t: number, min: number, max: number) {
  const f = max > min ? (t - min) / (max - min) : 0.5;
  const x = Math.max(0, Math.min(0.999, f)) * (THERMAL_STOPS.length - 1);
  const i = Math.floor(x);
  const k = x - i;
  const a = THERMAL_STOPS[i];
  const b = THERMAL_STOPS[Math.min(i + 1, THERMAL_STOPS.length - 1)];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`;
}

/**
 * 32×24 thermal field, drawn to a canvas so a 2 Hz refresh costs one paint
 * rather than 768 React nodes.
 */
export function ThermalMap({
  frame,
  min,
  max,
  className,
}: {
  frame: number[] | null;
  min: number | null;
  max: number | null;
  className?: string;
}) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    if (!frame || frame.length !== 768 || min === null || max === null) {
      ctx.clearRect(0, 0, 32, 24);
      return;
    }
    const img = ctx.createImageData(32, 24);
    for (let i = 0; i < 768; i++) {
      const c = thermalColour(frame[i], min, max);
      const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(c);
      if (!m) continue;
      img.data[i * 4] = Number(m[1]);
      img.data[i * 4 + 1] = Number(m[2]);
      img.data[i * 4 + 2] = Number(m[3]);
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [frame, min, max]);

  return (
    <div className={cx("overflow-hidden rounded-xl border border-white/80 bg-ink-750", className)}>
      <canvas
        ref={ref}
        width={32}
        height={24}
        className="block h-full w-full"
        style={{ imageRendering: "pixelated", aspectRatio: "32 / 24" }}
      />
    </div>
  );
}

/* --------------------------------------------------- peripheral health */

export function HealthRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean | null;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/70 py-2.5 last:border-0">
      <span className="flex items-center gap-2.5 text-[13px] text-fg">
        <span
          className={cx(
            "flex h-5 w-5 items-center justify-center rounded-full",
            ok === null ? "bg-ink-700 text-fg-dim" : ok ? "bg-ok/15 text-ok" : "bg-danger/15 text-danger",
          )}
        >
          {ok === null ? <CircleDashed size={12} /> : ok ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
        </span>
        {label}
      </span>
      <span className="text-[12px] text-fg-muted">
        {detail ?? (ok === null ? "Unknown" : ok ? "Online" : "Unavailable")}
      </span>
    </div>
  );
}

/* --------------------------------------------------------- LED mirror */

/** The three panel lamps, mirrored in software so the demo reads at a glance. */
export function LedMirror({
  green,
  amber,
  red,
}: {
  green: boolean;
  amber: boolean;
  red: boolean;
}) {
  const lamp = (on: boolean, colour: string, label: string) => (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={cx(
          "h-6 w-6 rounded-full border transition-all duration-200",
          on ? "border-white/70" : "border-line-strong bg-ink-700",
        )}
        style={on ? { background: colour, boxShadow: `0 0 14px 2px ${colour}66` } : undefined}
      />
      <span className="text-[10.5px] font-medium text-fg-muted">{label}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-5">
      {lamp(green, "#2E7D32", "Ready")}
      {lamp(amber, "#F57C20", "Recording")}
      {lamp(red, "#C62828", "Fault")}
    </div>
  );
}

/* ------------------------------------------------------- flow diagram */

/** Physical world → signed record. The presentation's one-glance explanation. */
export function HardwareFlow({ active }: { active: string | null }) {
  const steps = [
    { key: "sensor", label: "Sensors", icon: <Thermometer size={15} /> },
    { key: "esp32", label: "ESP32-S3", icon: <Cpu size={15} /> },
    { key: "link", label: "Wi-Fi / USB", icon: <Radio size={15} /> },
    { key: "app", label: "Evidence Chain", icon: <Activity size={15} /> },
    { key: "signed", label: "Signed record", icon: <Check size={15} /> },
    { key: "queue", label: "Pending Sync", icon: <CircleDashed size={15} /> },
    { key: "anchor", label: "Trusted time", icon: <Clock size={15} /> },
  ];
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
      {steps.map((s) => (
        <li
          key={s.key}
          className={cx(
            "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center",
            active === s.key
              ? "border-brand/35 bg-brand/[0.09] text-brand"
              : "border-line bg-white text-fg-dim",
          )}
        >
          {s.icon}
          <span className="text-[12px] font-semibold leading-tight text-fg">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
