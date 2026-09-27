"use client";

import * as React from "react";
import {
  Minus,
  Plug,
  RefreshCw,
  ScanLine,
  Usb,
} from "lucide-react";
import {
  Check,
  Cpu,
  MonitorPlay,
  TriangleAlert,
} from "@/components/ui/icons";
import { useHardware } from "@/components/providers/hardware-provider";
import { useApp } from "@/components/providers/app-provider";
import {
  Button,
  ButtonLink,
  ErrorState,
  Callout,
  KeyValue,
  Panel,
  PanelHead,
  Pill,
  cx,
} from "@/components/ui/primitives";
import { AssetImage } from "@/components/ui/asset-image";
import { TechnicalDetailsDrawer } from "@/components/ui/tech-drawer";
import { ConnectionStatus } from "@/features/hardware/connection-status";
import { PramaanSerialLink } from "@/lib/hardware/pramaan/serial";

function ago(ms: number | null) {
  if (!ms) return "Not yet";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 5) return "Just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return `${m} min ago`;
}

/**
 * What an operator needs to know about the attached device: is it connected,
 * is it ready, and which of its parts are actually present. Ports, firmware
 * and packet counts live in the technical drawer.
 *
 * A missing optional component never makes the whole device "faulty" — it is
 * listed as unavailable and everything else keeps working.
 */
export function DeviceStatusCard({ showImage = true }: { showImage?: boolean }) {
  const hw = useHardware();
  const { store, session } = useApp();
  const [, tick] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const t = setInterval(tick, 5000);
    return () => clearInterval(t);
  }, []);

  const [canReconnect, setCanReconnect] = React.useState(false);
  React.useEffect(() => {
    void PramaanSerialLink.hasGrantedPort().then(setCanReconnect);
  }, [hw.isPramaan, hw.state]);

  const phone = store?.devices.find((d) => d.assigned_officer_id === session?.officer_id) ?? null;
  const connected = hw.state === "connected";
  const serialSupported = PramaanSerialLink.supported();

  // "Needs attention" means a part the device says it HAS is not working.
  const failing = hw.capabilities.filter((c) => !c.available && !c.note);
  const ready = connected && hw.status === "READY" && failing.length === 0;
  const name = hw.isPramaan ? "PRAMAAN" : "evidence device";

  return (
    <Panel className="min-w-0">
      <PanelHead title="Device Status" icon={<Cpu size={17} />} right={<ConnectionStatus size="sm" />} />
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
                    ? "Reading captured — review it"
                    : failing.length
                      ? "A component needs attention"
                      : "Starting up…"
                  : hw.isPramaan
                    ? "Waiting for PRAMAAN"
                    : "No evidence device connected"}
            </div>
            <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">
              {ready
                ? `Press ACQUIRE on ${hw.isPramaan ? "PRAMAAN" : "the device"}, or use the Capture screen.`
                : connected
                  ? failing.length
                    ? `Check: ${failing.map((c) => c.label).join(", ")}.`
                    : "The device is answering. It will be ready in a moment."
                  : `Connect ${name} over USB. You can still capture, and enter values manually, without it.`}
            </p>
          </div>

          {hw.pramaan.error ? (
            <ErrorState
              title={
                hw.pramaan.portOpen && !hw.pramaan.identified
                  ? "PRAMAAN is not responding"
                  : "PRAMAAN needs attention"
              }
              why={
                hw.pramaan.portOpen && !hw.pramaan.identified
                  ? `The USB connection opened, but the device did not complete the PRAMAAN handshake. ${hw.pramaan.error}`
                  : hw.pramaan.error
              }
              next="Reconnect. If it still does not answer, open Diagnostics to see every line the port sent."
              actions={
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<RefreshCw size={15} />}
                    onClick={() => {
                      hw.clearPramaanError();
                      void hw.connectPramaan({ reuseGranted: canReconnect });
                    }}
                  >
                    Reconnect
                  </Button>
                  <ButtonLink href="/settings/device" size="sm" variant="secondary">
                    Technical Details
                  </ButtonLink>
                </>
              }
            />
          ) : null}

          <div className="grid grid-cols-2 gap-4">
            <KeyValue k="Device">
              <span className="mono text-[13.5px]">{hw.deviceId ?? "—"}</span>
            </KeyValue>
            <KeyValue k="Last seen">{ago(hw.lastAckAt)}</KeyValue>
            <KeyValue k="Connection">
              {hw.isPramaan
                ? "USB Serial"
                : hw.transport === "wifi"
                  ? "Wi-Fi"
                  : hw.transport === "usb"
                    ? "USB Serial"
                    : hw.transport === "demo"
                      ? "In-browser demo"
                      : "—"}
            </KeyValue>
            <KeyValue k="Firmware">
              <span className="mono text-[13.5px]">{hw.firmware ?? "—"}</span>
            </KeyValue>
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

          {hw.capabilities.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Device capabilities">
              {hw.capabilities.map((c) => (
                <li key={c.key}>
                  <Pill
                    tone={c.available ? "ok" : c.note ? "neutral" : "danger"}
                    icon={
                      c.available ? (
                        <Check size={11} />
                      ) : c.note ? (
                        <Minus size={11} />
                      ) : (
                        <TriangleAlert size={11} />
                      )
                    }
                    title={c.note}
                  >
                    {c.label}
                    {!c.available && c.note ? " unavailable" : ""}
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
                <Button
                  variant="primary"
                  icon={<Plug size={16} />}
                  disabled={!serialSupported}
                  title={serialSupported ? undefined : "Use Chrome or Edge on a laptop"}
                  onClick={() => void hw.connectPramaan()}
                >
                  Connect PRAMAAN
                </Button>
                {canReconnect ? (
                  <Button icon={<Usb size={16} />} onClick={() => void hw.connectPramaan({ reuseGranted: true })}>
                    Reconnect last port
                  </Button>
                ) : null}
                <Button variant="ghost" icon={<RefreshCw size={16} />} onClick={() => void hw.connect()}>
                  Search Wi-Fi device
                </Button>
                <Button variant="ghost" icon={<MonitorPlay size={16} />} onClick={hw.useDemoHardware}>
                  Use demo device
                </Button>
              </>
            )}
            {connected && hw.isPramaan ? (
              <Button icon={<Usb size={16} />} onClick={() => void hw.disconnectPramaan()}>
                Disconnect
              </Button>
            ) : null}

            <TechnicalDetailsDrawer subtitle="Link, firmware and live telemetry reported by the device.">
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
                <KeyValue k="Protocol">
                  <span className="mono">{hw.isPramaan ? (hw.pramaan.protocol ?? "PRAMAAN-1") : "evidence-chain-v1"}</span>
                </KeyValue>
                <KeyValue k="Device state">
                  <span className="mono">{hw.isPramaan ? (hw.pramaan.state ?? "—") : hw.status}</span>
                </KeyValue>
                <KeyValue k="Device sequence">
                  <span className="mono">{hw.pramaan.seq ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Messages received">
                  <span className="mono">{hw.packets}</span>
                </KeyValue>
                <KeyValue k="Temperature">
                  <span className="mono">
                    {hw.temperature.value === null ? "—" : `${hw.temperature.value.toFixed(1)} °C`}
                    {hw.temperature.source ? ` (${hw.temperature.source})` : ""}
                  </span>
                </KeyValue>
                <KeyValue k="Weight">
                  <span className="mono">
                    {hw.weight.value === null ? "—" : `${hw.weight.value.toFixed(1)} g`}
                  </span>
                </KeyValue>
                <KeyValue k="Detail" className="col-span-2">
                  <span className="mono break-all">{hw.detail ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Phone key" className="col-span-2">
                  <span className="mono">
                    {phone ? `${phone.key_security_level} (target: ${phone.target_key_security_level})` : "—"}
                  </span>
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
          <div className="hidden w-[260px] sm:block">
            <div className="aspect-[3/2] overflow-hidden rounded-2xl border border-line bg-ink-750">
              <AssetImage
                name="pramaanDevice"
                alt="The PRAMAAN evidence unit with its load cell, status display and ACQUIRE buttons"
                rounded={false}
                fit="cover"
                sizes="260px"
              />
            </div>
            <p className="mt-2 text-[12px] leading-snug text-fg-dim">
              Temperature on this unit comes from a potentiometer — a simulated input, not a thermal sensor.
            </p>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
