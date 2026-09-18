"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  CircleDashed,
  RotateCcw,
  ScanLine,
  Thermometer,
  Usb,
  Weight,
  Wifi,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { useHardware } from "@/components/providers/hardware-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Button,
  Callout,
  IconContainer,
  Panel,
  Pill,
  cx,
} from "@/components/ui/primitives";
import { HardwareChip, LedMirror, LoadGauge } from "@/features/hardware/widgets";
import { AcquisitionReview } from "@/features/hardware/acquisition-review";

/**
 * Operator Mode — one screen, one decision.
 *
 * No hashes, no Merkle proofs, no chain diagnostics. A frontline officer needs
 * to know: is the kit ready, what is it reading, and did the record save. The
 * cryptography still happens; it just is not this screen's job to explain it.
 */
export default function OperatorPage() {
  const { store, officer } = useApp();
  const hw = useHardware();
  const [justSaved, setJustSaved] = React.useState<string | null>(null);

  if (!store) return null;

  const queued = store.records.filter((r) => r.status === "queued" || r.status === "captured").length;
  const online = store.connectivity.online;
  const ready = hw.state === "connected" && hw.status !== "FAULT";
  const s = hw.sample;

  return (
    <>
      <PageHeader
        eyebrow="Field device"
        title="Operator"
        subtitle="The screen an officer uses on the platform. Everything technical lives elsewhere."
        status={<HardwareChip />}
      />

      <div className="mx-auto grid w-full max-w-[880px] gap-4">
        {/* ------------------------------------------------- device state */}
        <Panel className="overflow-hidden">
          <div
            className={cx(
              "px-5 py-5",
              ready ? "bg-ok/[0.05]" : hw.status === "FAULT" ? "bg-danger/[0.05]" : "bg-warn/[0.05]",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <IconContainer
                  tone={ready ? "ok" : hw.status === "FAULT" ? "danger" : "warn"}
                  size="lg"
                >
                  {hw.state === "connected" ? (
                    hw.transport === "usb" ? (
                      <Usb size={22} />
                    ) : (
                      <Wifi size={22} />
                    )
                  ) : (
                    <CircleDashed size={22} className="animate-spin" />
                  )}
                </IconContainer>
                <div>
                  <div
                    className={cx(
                      "text-[26px] font-semibold uppercase leading-none tracking-tight",
                      ready ? "text-ok" : hw.status === "FAULT" ? "text-danger" : "text-warn",
                    )}
                  >
                    {hw.status === "FAULT"
                      ? "Fault"
                      : hw.state === "connected"
                        ? hw.status === "ACQUIRING"
                          ? "Acquiring"
                          : "Ready"
                        : "No device"}
                  </div>
                  <div className="mono mt-1.5 text-[13px] text-fg-muted">
                    {hw.deviceId ?? "Searching for hardware…"}
                  </div>
                </div>
              </div>
              <LedMirror
                green={ready}
                amber={hw.status === "ACQUIRING" || Boolean(hw.pending)}
                red={hw.status === "FAULT"}
              />
            </div>

            {hw.lastFault ? (
              <Callout tone="danger" title={hw.lastFault.code} icon={<AlertTriangle size={13} />}>
                {hw.lastFault.detail}
              </Callout>
            ) : null}
          </div>

          {/* ------------------------------------------------ live readings */}
          <div className="grid gap-4 border-t border-line px-5 py-5 sm:grid-cols-[auto_1fr]">
            <LoadGauge
              grams={s?.load_cell_g ?? null}
              stable={s?.load_cell_stable ?? false}
              available={hw.health?.load_cell !== false && hw.state === "connected"}
            />

            <div className="grid grid-cols-2 gap-3 self-center">
              <Reading
                icon={<Thermometer size={18} />}
                tone="warn"
                label="Thermal"
                value={
                  s?.thermal ? `${s.thermal.avg_c.toFixed(1)} °C` : hw.health?.thermal === false ? "N/A" : "—"
                }
                sub={
                  hw.health?.thermal === false
                    ? "Sensor unavailable"
                    : s?.thermal
                      ? `${s.thermal.min_c.toFixed(1)}–${s.thermal.max_c.toFixed(1)} °C`
                      : "Waiting"
                }
              />
              <Reading
                icon={s?.collector_installed ? <Check size={18} /> : <AlertTriangle size={18} />}
                tone={s?.collector_installed ? "ok" : "danger"}
                label="Collector"
                value={s?.collector_installed ? "Fitted" : "Absent"}
                sub={s?.collector_installed ? "Ready to sample" : "Fit the collector"}
              />
            </div>
          </div>

          {/* ------------------------------------------------------ actions */}
          <div className="grid gap-2.5 border-t border-line px-5 py-5 sm:grid-cols-[2fr_1fr]">
            <Button
              variant="primary"
              size="lg"
              className="h-[64px] text-[16px]"
              disabled={hw.state !== "connected"}
              onClick={() => void hw.acquire()}
              icon={<ScanLine size={20} />}
            >
              Acquire
            </Button>
            <Button
              size="lg"
              className="h-[64px] text-[15px]"
              disabled={hw.state !== "connected"}
              onClick={() => void hw.reset()}
              icon={<RotateCcw size={18} />}
            >
              Reset
            </Button>
            <p className="col-span-full text-center text-[11.5px] leading-relaxed text-fg-dim">
              The physical ACQUIRE button on the device does the same thing. Reset clears the device
              session — it never deletes a record.
            </p>
          </div>
        </Panel>

        {/* ------------------------------------------------------- outcome */}
        {justSaved ? (
          <Panel className="border-ok/35 bg-ok/[0.06] px-5 py-4">
            <div className="flex items-center gap-3">
              <IconContainer tone="ok" size="md">
                <Check size={19} />
              </IconContainer>
              <div>
                <div className="text-[15px] font-semibold text-ok">Saved</div>
                <div className="mono mt-0.5 text-[12.5px] text-fg-muted">
                  {justSaved} · signed and chained{online ? " · pushed" : " · queued on device"}
                </div>
              </div>
            </div>
          </Panel>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Panel className="px-5 py-4">
            <div className="label">Connection</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone={online ? "ok" : "warn"}>{online ? "Online" : "Offline"}</Pill>
              {queued > 0 ? (
                <Pill tone="warn">
                  {queued} record{queued === 1 ? "" : "s"} queued
                </Pill>
              ) : (
                <Pill tone="ok">Nothing waiting</Pill>
              )}
            </div>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-fg-dim">
              Records save on the device first. They push by themselves when connectivity returns.
            </p>
          </Panel>

          <Panel className="px-5 py-4">
            <div className="label">Operator</div>
            <div className="mt-2 text-[14px] font-semibold text-fg">{officer?.name ?? "—"}</div>
            <div className="mono mt-0.5 text-[12px] text-fg-muted">
              {officer?.officer_id} · {officer?.force}
            </div>
          </Panel>
        </div>
      </div>

      <AcquisitionReview onDone={(r) => setJustSaved(r.record_id)} />
    </>
  );
}

function Reading({
  icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tone: "warn" | "ok" | "danger" | "brand";
  label: string;
  value: string;
  sub: string;
}) {
  const ground = {
    brand: "border-brand/20 bg-brand/[0.07]",
    warn: "border-warn/22 bg-warn/[0.08]",
    ok: "border-ok/20 bg-ok/[0.07]",
    danger: "border-danger/25 bg-danger/[0.08]",
  }[tone];
  return (
    <div className={cx("rounded-xl border px-3.5 py-3.5", ground)}>
      <IconContainer tone={tone} size="sm">
        {icon}
      </IconContainer>
      <div className="mt-2.5 text-[20px] font-semibold leading-none tabular-nums text-fg">
        {value}
      </div>
      <div className="label mt-1.5">{label}</div>
      <div className="mt-0.5 text-[11px] text-fg-dim">{sub}</div>
    </div>
  );
}
