"use client";

import * as React from "react";
import { Check, Cpu, MonitorPlay, RefreshCw, ScanLine, TriangleAlert, Usb } from "lucide-react";
import { useHardware } from "@/components/providers/hardware-provider";
import { useApp } from "@/components/providers/app-provider";
import { Button, ButtonLink, KeyValue, Panel, PanelHead, Pill, cx } from "@/components/ui/primitives";
import { AssetImage } from "@/components/ui/asset-image";
import { TechnicalDetailsDrawer } from "@/components/ui/tech-drawer";
import { ConnectionStatus } from "@/features/hardware/connection-status";

const SENSOR_LABEL: Record<string, string> = {
  load_cell: "Weighing (load cell)",
  thermal: "Temperature camera",
  collector_switch: "Collector switch",
  acquire_button: "ACQUIRE button",
  reset_button: "RESET button",
};

function ago(ms: number | null) {
  if (!ms) return "Not yet";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 5) return "Just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return `${m} min ago`;
}

/**
 * What an operator needs to know about the evidence device, in words: is it
 * connected, is it ready, are the sensors working. Network details, firmware
 * and packet counts live in the technical drawer.
 */
export function DeviceStatusCard({ showImage = true }: { showImage?: boolean }) {
  const hw = useHardware();
  const { store, session } = useApp();
  const [, tick] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, []);

  // Packets are counted in batches; any increase means the device just spoke.
  const [lastSeen, setLastSeen] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (hw.packets > 0) setLastSeen(Date.now());
  }, [hw.packets]);

  const phone = store?.devices.find((d) => d.assigned_officer_id === session?.officer_id) ?? null;
  const connected = hw.state === "connected";
  const sensors = hw.health ? Object.entries(hw.health) : [];
  const failing = sensors.filter(([, ok]) => !ok);
  const ready = connected && hw.status === "READY" && failing.length === 0;

  return (
    <Panel className="min-w-0">
      <PanelHead
        title="Device Status"
        icon={<Cpu size={17} />}
        right={<ConnectionStatus size="sm" />}
      />
      <div className="grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-4">
          <div
            className={cx(
              "rounded-2xl border px-4 py-3.5",
              ready
                ? "border-ok/25 bg-ok/[0.07]"
                : connected
                  ? "border-warn/30 bg-warn/[0.08]"
                  : "border-line-strong bg-ink-750/60",
            )}
          >
            <div className="flex items-center gap-2 text-[16px] font-semibold text-fg">
              {ready ? (
                <Check size={18} className="text-ok" />
              ) : connected ? (
                <TriangleAlert size={17} className="text-warn" />
              ) : (
                <ScanLine size={17} className="text-fg-dim" />
              )}
              {ready
                ? "Ready to capture"
                : connected
                  ? hw.status === "ACQUIRING"
                    ? "Taking a reading…"
                    : failing.length
                      ? "A sensor needs attention"
                      : "Starting up…"
                  : "No evidence device connected"}
            </div>
            <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">
              {ready
                ? "Press ACQUIRE on the device, or use the Capture screen."
                : connected
                  ? failing.length
                    ? `Check: ${failing.map(([k]) => SENSOR_LABEL[k] ?? k).join(", ")}.`
                    : "The device is answering. It will be ready in a moment."
                  : "Switch the device on and keep it near this phone. You can still capture without it."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <KeyValue k="Device">
              <span className="mono text-[13.5px]">{hw.deviceId ?? "—"}</span>
            </KeyValue>
            <KeyValue k="Last seen">{hw.state === "connected" ? ago(lastSeen ?? hw.lastAckAt) : ago(lastSeen)}</KeyValue>
            <KeyValue k="Phone">
              <span className="mono text-[13.5px]">{phone?.device_id ?? "—"}</span>
            </KeyValue>
            <KeyValue k="Mode">
              {hw.transport === "demo" ? (
                <Pill tone="sim">Demo device</Pill>
              ) : hw.isReal ? (
                <Pill tone="ok">Real hardware</Pill>
              ) : (
                <span className="text-fg-muted">—</span>
              )}
            </KeyValue>
          </div>

          {sensors.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Sensor checks">
              {sensors.map(([k, ok]) => (
                <li key={k}>
                  <Pill tone={ok ? "ok" : "danger"} icon={ok ? <Check size={11} /> : <TriangleAlert size={11} />}>
                    {SENSOR_LABEL[k] ?? k}
                  </Pill>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {connected ? (
              <ButtonLink href="/operator" variant="primary" icon={<ScanLine size={16} />}>
                Open Operator Mode
              </ButtonLink>
            ) : (
              <>
                <Button variant="primary" icon={<RefreshCw size={16} />} onClick={() => void hw.connect()}>
                  Connect Device
                </Button>
                {hw.serialAvailable ? (
                  <Button icon={<Usb size={16} />} onClick={() => void hw.connectUsb()}>
                    Use USB cable
                  </Button>
                ) : null}
                <Button variant="ghost" icon={<MonitorPlay size={16} />} onClick={hw.useDemoHardware}>
                  Use demo device
                </Button>
              </>
            )}
            <TechnicalDetailsDrawer subtitle="Link, firmware and sensor telemetry reported by the device.">
              <div className="grid grid-cols-2 gap-4">
                <KeyValue k="Link state">
                  <span className="mono">{hw.state}</span>
                </KeyValue>
                <KeyValue k="Transport">
                  <span className="mono">{hw.transport}</span>
                </KeyValue>
                <KeyValue k="Device ID">
                  <span className="mono">{hw.deviceId ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Firmware">
                  <span className="mono">{hw.firmware ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Device status">
                  <span className="mono">{hw.status}</span>
                </KeyValue>
                <KeyValue k="Packets received">
                  <span className="mono">{hw.packets}</span>
                </KeyValue>
                <KeyValue k="Host">
                  <span className="mono">{hw.host || "auto"}</span>
                </KeyValue>
                <KeyValue k="Last fault">
                  <span className="mono">{hw.lastFault ? `${hw.lastFault.code}: ${hw.lastFault.detail}` : "none"}</span>
                </KeyValue>
                <KeyValue k="Detail" className="col-span-2">
                  <span className="mono break-all">{hw.detail ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Load cell (g)">
                  <span className="mono">{hw.sample?.load_cell_g != null ? hw.sample.load_cell_g.toFixed(1) : "—"}</span>
                </KeyValue>
                <KeyValue k="Phone key">
                  <span className="mono">{phone ? `${phone.key_security_level} (target: ${phone.target_key_security_level})` : "—"}</span>
                </KeyValue>
              </div>
              <p className="mt-5 text-[12.5px] leading-relaxed text-fg-muted">
                Telemetry is shown live but never becomes evidence on its own. A reading becomes a
                record only after the officer reviews it and confirms.
              </p>
            </TechnicalDetailsDrawer>
          </div>
        </div>

        {showImage ? (
          <div className="hidden sm:block">
            <AssetImage name="deviceEvidence" alt="Evidence Chain phone and RPF evidence device" maxWidth={240} />
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
