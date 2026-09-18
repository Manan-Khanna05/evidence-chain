"use client";

import * as React from "react";
import {
  Check,
  CircleDot,
  Cpu,
  Lightbulb,
  MousePointerClick,
  Scale,
  Smartphone,
  Thermometer,
  ToggleRight,
  TriangleAlert,
  Weight,
} from "lucide-react";
import { useHardware } from "@/components/providers/hardware-provider";
import { Panel, PanelHead, Pill, cx } from "@/components/ui/primitives";
import { AssetImage } from "@/components/ui/asset-image";
import type { SensorHealth } from "@/lib/hardware/protocol";

type Part = {
  key: string;
  name: string;
  icon: React.ReactNode;
  role: string;
  does: string;
  doesNot: string;
  wiring: string;
  health?: keyof SensorHealth | "link";
};

const PARTS: Part[] = [
  {
    key: "phone",
    name: "Android phone",
    icon: <Smartphone size={18} />,
    role: "The officer's device",
    does: "Runs Evidence Chain. Shows readings, lets the officer review and confirm, then signs and saves the record.",
    doesNot: "Does not trust its own clock for exact time — trusted time comes from anchors.",
    wiring: "Joins the device's Wi-Fi, or connects by USB cable.",
    health: "link",
  },
  {
    key: "esp32",
    name: "ESP32-S3 board",
    icon: <Cpu size={18} />,
    role: "The gateway",
    does: "Reads every sensor, drives the LEDs, and sends readings to the phone when ACQUIRE is pressed.",
    doesNot: "Does not create evidence. It only reports; the officer confirms.",
    wiring: "I²C on SDA 8 / SCL 9. Buttons on 4, 5, 6. LEDs on 15, 16, 17.",
    health: "link",
  },
  {
    key: "nau7802",
    name: "NAU7802 amplifier",
    icon: <Scale size={18} />,
    role: "Weighing electronics",
    does: "Turns the tiny signal from the load cell into a weight reading.",
    doesNot: "Does not weigh the seized article — only the force used while sampling.",
    wiring: "I²C, shared bus with the thermal camera.",
    health: "load_cell",
  },
  {
    key: "loadcell",
    name: "Load cell (1 kg)",
    icon: <Weight size={18} />,
    role: "Sampling force",
    does: "Measures how firmly the swab was pressed, so the record shows how the sample was taken.",
    doesNot: "Does not identify any substance.",
    wiring: "Four wires to the NAU7802. Calibrate with a known mass.",
    health: "load_cell",
  },
  {
    key: "mlx",
    name: "MLX90640 thermal camera",
    icon: <Thermometer size={18} />,
    role: "Temperature of the sampling area",
    does: "Records a 32×24 temperature picture as context — for example, ambient temperature at the test.",
    doesNot: "Does not detect concealment and does not identify any substance.",
    wiring: "I²C on SDA 8 / SCL 9.",
    health: "thermal",
  },
  {
    key: "switch",
    name: "Microswitch",
    icon: <ToggleRight size={18} />,
    role: "Collector fitted?",
    does: "Reports whether the sample collector is in place before a reading.",
    doesNot: "Does not check what is in the collector.",
    wiring: "GPIO 4 to ground.",
    health: "collector_switch",
  },
  {
    key: "buttons",
    name: "ACQUIRE & RESET buttons",
    icon: <MousePointerClick size={18} />,
    role: "Physical controls",
    does: "ACQUIRE takes a reading and sends it to the phone for review. RESET clears the device session.",
    doesNot: "Pressing ACQUIRE alone never saves evidence — the officer must confirm on the phone.",
    wiring: "ACQUIRE on GPIO 5, RESET on GPIO 6.",
    health: "acquire_button",
  },
  {
    key: "leds",
    name: "Status LEDs",
    icon: <Lightbulb size={18} />,
    role: "At-a-glance state",
    does: "Green: ready. Amber: taking a reading or waiting for the officer. Red: a fault.",
    doesNot: "Not a verification result — only the device's own state.",
    wiring: "Green 15, amber 16, red 17, each through a 1 kΩ resistor.",
  },
];

/**
 * Click a component to learn what it does — and what it does not do. Live
 * health comes from the connected device when there is one.
 */
export function HardwareGuide() {
  const hw = useHardware();
  const [sel, setSel] = React.useState(PARTS[0].key);
  const part = PARTS.find((p) => p.key === sel) ?? PARTS[0];
  const connected = hw.state === "connected";

  const healthOf = (p: Part): boolean | null => {
    if (!p.health) return connected ? true : null;
    if (p.health === "link") return connected;
    return hw.health ? hw.health[p.health] : null;
  };

  const h = healthOf(part);

  return (
    <Panel className="min-w-0">
      <PanelHead
        title="Interactive hardware guide"
        subtitle="Tap a component to see what it does."
        icon={<CircleDot size={17} />}
      />
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="min-w-0">
          <AssetImage name="deviceEvidence" alt="The phone and the RPF evidence device with status LEDs and ACQUIRE button" maxWidth={386} />
          <div role="tablist" aria-label="Hardware components" className="mt-4 grid grid-cols-2 gap-2">
            {PARTS.map((p) => {
              const ok = healthOf(p);
              return (
                <button
                  key={p.key}
                  role="tab"
                  aria-selected={p.key === sel}
                  aria-controls="hw-guide-detail"
                  onClick={() => setSel(p.key)}
                  className={cx(
                    "flex min-h-[48px] items-center gap-2.5 rounded-xl border px-3 text-left text-[13.5px] font-medium transition-all duration-150",
                    p.key === sel
                      ? "border-brand/40 bg-brand/[0.08] text-brand-deep shadow-chip"
                      : "border-line bg-white text-fg-muted hover:border-brand/25 hover:text-fg",
                  )}
                >
                  <span className={p.key === sel ? "text-brand" : "text-fg-dim"}>{p.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {ok === true ? (
                    <Check size={14} className="shrink-0 text-ok" aria-label="working" />
                  ) : ok === false ? (
                    <TriangleAlert size={14} className="shrink-0 text-danger" aria-label="needs attention" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div id="hw-guide-detail" role="tabpanel" key={part.key} className="min-w-0 animate-fade-up">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/[0.09] text-brand">
              {part.icon}
            </span>
            <div>
              <h3 className="text-[20px] font-semibold text-fg">{part.name}</h3>
              <div className="text-[14px] text-fg-muted">{part.role}</div>
            </div>
          </div>
          <div className="mt-3">
            {h === true ? (
              <Pill tone="ok" icon={<Check size={11} />}>Working</Pill>
            ) : h === false ? (
              <Pill tone="danger" icon={<TriangleAlert size={11} />}>Needs attention</Pill>
            ) : (
              <Pill tone="neutral">Connect the device to see live status</Pill>
            )}
          </div>
          <dl className="mt-5 space-y-4">
            <div>
              <dt className="label">What it does</dt>
              <dd className="mt-1 text-[15px] leading-relaxed text-fg">{part.does}</dd>
            </div>
            <div>
              <dt className="label">What it does not do</dt>
              <dd className="mt-1 text-[15px] leading-relaxed text-fg">{part.doesNot}</dd>
            </div>
            <div>
              <dt className="label">How it connects</dt>
              <dd className="mt-1 text-[14px] leading-relaxed text-fg-muted">{part.wiring}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Panel>
  );
}
