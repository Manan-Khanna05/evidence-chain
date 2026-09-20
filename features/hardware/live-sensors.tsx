"use client";

import * as React from "react";
import { Activity, Check, Minus, Thermometer, Weight } from "lucide-react";
import { useHardware } from "@/components/providers/hardware-provider";
import { Panel, PanelHead, Pill, cx } from "@/components/ui/primitives";
import { LedMirror } from "@/features/hardware/widgets";

/**
 * Live sensor data, exactly as reported.
 *
 * Every card states the physical input behind the number. A component the
 * device does not have shows "unavailable" — never a plausible-looking value.
 */
export function LiveSensors() {
  const hw = useHardware();
  const connected = hw.state === "connected";
  const caps = hw.capabilities;
  const has = (key: string) => caps.find((c) => c.key === key)?.available ?? false;
  const thermalFitted = has("thermal") || has("thermal_sensor");

  const temperature = hw.temperature;
  const weight = hw.weight;

  return (
    <Panel className="min-w-0">
      <PanelHead
        title="Live Sensor Data"
        subtitle={
          connected
            ? `Straight from ${hw.isPramaan ? "PRAMAAN" : "the device"}, updated several times a second.`
            : "Connect the device to see live readings."
        }
        icon={<Activity size={17} />}
        right={
          <LedMirror
            green={connected && hw.status !== "FAULT"}
            amber={hw.status === "ACQUIRING" || Boolean(hw.pending)}
            red={hw.status === "FAULT"}
          />
        }
      />
      <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3">
        <Reading
          icon={<Weight size={18} />}
          label="Weight"
          value={weight.value === null ? null : `${weight.value.toFixed(1)} g`}
          available={connected && weight.value !== null}
          sourceLabel={weight.source === "load_cell" ? "Load Cell" : null}
          caption={connected && weight.value !== null ? "Live" : has("load_cell") ? "Waiting for a reading" : "Load cell unavailable"}
          tone="brand"
        />
        <Reading
          icon={<Thermometer size={18} />}
          label="Temperature"
          value={temperature.value === null ? null : `${temperature.value.toFixed(1)} °C`}
          available={connected && temperature.value !== null}
          sourceLabel={
            temperature.source === "potentiometer"
              ? "Potentiometer"
              : temperature.source === "thermal_camera"
                ? "Thermal camera"
                : null
          }
          caption={
            temperature.source === "potentiometer"
              ? "Simulated temperature input"
              : temperature.source === "thermal_camera"
                ? "Measured temperature"
                : has("potentiometer")
                  ? "Waiting for a reading"
                  : "Temperature input unavailable"
          }
          tone="warn"
        />
        <Reading
          icon={<Thermometer size={18} />}
          label="Thermal observation"
          value={null}
          available={false}
          sourceLabel={null}
          caption={
            thermalFitted
              ? "See the thermal field below"
              : "Thermal sensor unavailable — no imaging sensor is fitted"
          }
          tone="neutral"
        />
      </div>
    </Panel>
  );
}

function Reading({
  icon,
  label,
  value,
  available,
  sourceLabel,
  caption,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  available: boolean;
  sourceLabel: string | null;
  caption: string;
  tone: "brand" | "warn" | "neutral";
}) {
  const ground = {
    brand: "border-brand/20 bg-brand/[0.05]",
    warn: "border-warn/25 bg-warn/[0.06]",
    neutral: "border-line bg-white",
  }[tone];
  return (
    <div className={cx("rounded-2xl border px-4 py-4", ground)}>
      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-fg-dim">
        <span className={tone === "brand" ? "text-brand" : tone === "warn" ? "text-warn" : "text-fg-dim"}>
          {icon}
        </span>
        {label}
      </div>
      <div
        className={cx(
          "mt-3 font-semibold tabular-nums leading-none",
          available ? "text-[34px] text-fg" : "text-[30px] text-fg-dim",
        )}
      >
        {available && value ? value : "—"}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {sourceLabel ? (
          <Pill tone={available ? "ok" : "neutral"} icon={available ? <Check size={11} /> : <Minus size={11} />}>
            {sourceLabel}
          </Pill>
        ) : (
          <Pill tone="neutral" icon={<Minus size={11} />}>
            Unavailable
          </Pill>
        )}
      </div>
      <p className="mt-2 text-[13px] leading-snug text-fg-muted">{caption}</p>
    </div>
  );
}
