"use client";

import * as React from "react";
import {
  Check,
  CircleDot,
  Cpu,
  Gauge,
  Lightbulb,
  MonitorSmartphone,
  MousePointerClick,
  Smartphone,
  Thermometer,
  TriangleAlert,
  Weight,
} from "lucide-react";
import { useHardware } from "@/components/providers/hardware-provider";
import { Panel, PanelHead, Pill, cx } from "@/components/ui/primitives";
import { AssetImage } from "@/components/ui/asset-image";


type Part = {
  key: string;
  name: string;
  icon: React.ReactNode;
  role: string;
  does: string;
  doesNot: string;
  wiring: string;
  /** Capability key reported by the device, or "link" for the connection itself. */
  health?: string;
};

const PARTS: Part[] = [
  {
    key: "phone",
    name: "Phone or laptop",
    icon: <Smartphone size={18} />,
    role: "The officer's console",
    does: "Runs Evidence Chain. Shows PRAMAAN's readings, lets the officer review and confirm, then signs and saves the record.",
    doesNot: "Does not trust its own clock for exact time — trusted time comes from anchors.",
    wiring: "USB cable to PRAMAAN. Chrome or Edge on a laptop for the USB connection.",
    health: "link",
  },
  {
    key: "esp32",
    name: "ESP32 board",
    icon: <Cpu size={18} />,
    role: "The PRAMAAN controller",
    does: "Reads the potentiometer and load cell, drives the OLED and LEDs, and sends readings over USB when ACQUIRE is pressed.",
    doesNot: "Does not create evidence. It reports; the officer confirms.",
    wiring: "USB serial at 115200 baud, newline-delimited JSON (protocol PRAMAAN-1).",
    health: "link",
  },
  {
    key: "potentiometer",
    name: "Potentiometer",
    icon: <Gauge size={18} />,
    role: "Simulated temperature input",
    does: "Turning the knob changes the temperature value shown and recorded. It stands in for a temperature probe so the workflow can be demonstrated end to end.",
    doesNot: "It is not a thermal sensor and not a measurement of the sample. Every record says the value came from a potentiometer.",
    wiring: "Analogue input on GPIO34.",
    health: "potentiometer",
  },
  {
    key: "loadcell",
    name: "Load cell + amplifier",
    icon: <Weight size={18} />,
    role: "Weight / sampling force",
    does: "Measures the weight or the force applied while collecting the sample, so the record shows how the sample was taken.",
    doesNot: "Does not identify any substance.",
    wiring: "Load cell into the HX711-style amplifier, amplifier data and clock pins set in the firmware.",
    health: "load_cell",
  },
  {
    key: "oled",
    name: "OLED display",
    icon: <MonitorSmartphone size={18} />,
    role: "On-device readout",
    does: "Shows the device state, the current sequence and the live readings, so the operator can work without looking at the phone.",
    doesNot: "Does not store anything. It is a display only.",
    wiring: "I²C on SDA GPIO21, SCL GPIO22, address 0x3C.",
    health: "oled",
  },
  {
    key: "buttons",
    name: "ACQUIRE & RESET buttons",
    icon: <MousePointerClick size={18} />,
    role: "Physical controls",
    does: "The right button (GPIO13) captures a reading and sends it for review. The left button (GPIO2) resets and moves to the next sequence.",
    doesNot: "Pressing ACQUIRE never saves evidence by itself — the officer must confirm on screen.",
    wiring: "Switch 1 ACQUIRE on GPIO13, Switch 2 RESET on GPIO2, both to ground.",
    health: "acquire_button",
  },
  {
    key: "leds",
    name: "Status LEDs",
    icon: <Lightbulb size={18} />,
    role: "At-a-glance state",
    does: "Yellow blinks when READY, green blinks when a reading has been ACQUIRED, red blinks briefly during RESET.",
    doesNot: "Not a verification result — only the device's own state.",
    wiring: "Green GPIO15, yellow GPIO16, red GPIO17, each through a resistor.",
  },
  {
    key: "thermal",
    name: "Thermal sensor",
    icon: <Thermometer size={18} />,
    role: "Not fitted",
    does: "Nothing — there is no thermal imaging sensor on this device.",
    doesNot: "The console shows thermal observation as unavailable and records no thermal values. Temperature comes from the potentiometer instead.",
    wiring: "Not connected.",
    health: "thermal_sensor",
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
    const cap = hw.capabilities.find((c) => c.key === p.health);
    if (!cap) return null;
    // A part the device simply does not have is not a fault: report "unknown"
    // so it never shows as broken.
    if (!cap.available && cap.note) return null;
    return cap.available;
  };

  const h = healthOf(part);

  return (
    <Panel className="min-w-0">
      <PanelHead
        title="Interactive hardware guide"
        subtitle="PRAMAAN, part by part. Tap one to see what it does."
        icon={<CircleDot size={17} />}
      />
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="min-w-0">
          <AssetImage name="deviceEvidence" alt="The phone and the PRAMAAN device with status LEDs and ACQUIRE button" maxWidth={386} />
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
              <Pill tone="neutral">
                {part.health === "thermal_sensor" ? "Not fitted on this device" : "Connect PRAMAAN to see live status"}
              </Pill>
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
