"use client";

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  Cpu,
  Gauge,
  Link2,
  Plug,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Scale,
  Thermometer,
  Usb,
  Wifi,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { linkLabel, useHardware } from "@/components/providers/hardware-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Button,
  Callout,
  IconContainer,
  KeyValue,
  Panel,
  PanelHead,
  Pill,
  SimulatedNote,
  cx,
} from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/ui/form";
import {
  HardwareFlow,
  HealthRow,
  LedMirror,
  LoadGauge,
  ThermalMap,
  linkTone,
} from "@/features/hardware/widgets";
import { AcquisitionReview } from "@/features/hardware/acquisition-review";
import { DEFAULT_WIFI_HOSTS } from "@/lib/hardware/client";
import { PramaanSerialLink } from "@/lib/hardware/pramaan/serial";
import { LiveSensors } from "@/features/hardware/live-sensors";
import { PramaanDiagnostics } from "@/features/hardware/pramaan-diagnostics";
import { ConnectionStatus } from "@/features/hardware/connection-status";
import { DeviceStatusCard } from "@/features/hardware/device-status-card";
import { HardwareGuide } from "@/features/hardware/hardware-guide";

/**
 * A page served over https cannot open a plain ws:// socket or fetch http:// —
 * the browser blocks both as mixed content. That is exactly what a board on the
 * local network offers, so the hosted build can never reach real hardware. Say
 * so plainly instead of letting the connection fail with no explanation.
 */
function InsecureContextNote() {
  const [https, setHttps] = React.useState(false);
  React.useEffect(() => {
    setHttps(window.location.protocol === "https:");
  }, []);
  if (!https) return null;
  return (
    <Callout tone="sim" title="Hosted build — real hardware cannot be reached from here" icon={<AlertTriangle size={13} />}>
      This page is served over https, and browsers block plain <span className="mono">ws://</span>{" "}
      and <span className="mono">http://</span> connections from a secure page. A board on the local
      network is therefore unreachable from the hosted deployment. Use{" "}
      <strong>demo hardware</strong> here, and run the console locally over{" "}
      <span className="mono">http://</span> for the real ESP32-S3 demonstration.
    </Callout>
  );
}

export default function HardwarePage() {
  const { store } = useApp();
  const hw = useHardware();
  const [mass, setMass] = React.useState("100");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"operator" | "technical">("operator");

  if (!store) return null;

  const connected = hw.state === "connected";
  const s = hw.sample;
  const tone = linkTone(hw.state, hw.transport);

  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    await fn();
    setBusy(null);
  };

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Hardware"
        subtitle="PRAMAAN — the evidence integrity device — and its inputs. Live readings are not evidence: a record exists only once an officer reviews and confirms it."
        status={<ConnectionStatus />}
        actions={
          <>
            <Button
              variant="primary"
              icon={<Plug size={16} />}
              busy={busy === "pramaan"}
              disabled={!PramaanSerialLink.supported()}
              title={PramaanSerialLink.supported() ? undefined : "Web Serial needs Chrome or Edge on a laptop"}
              onClick={() => act("pramaan", async () => void (await hw.connectPramaan()))}
            >
              Connect PRAMAAN
            </Button>
            <Button
              busy={busy === "scan"}
              icon={<RefreshCw size={16} />}
              onClick={() => act("scan", () => hw.connect())}
            >
              Search Wi-Fi device
            </Button>
            {!connected ? (
              <Button icon={<Cpu size={16} />} onClick={hw.useDemoHardware}>
                Use demo device
              </Button>
            ) : (
              <Button
                icon={<Usb size={16} />}
                busy={busy === "dc"}
                onClick={() => act("dc", async () => (hw.isPramaan ? hw.disconnectPramaan() : hw.disconnect()))}
              >
                Disconnect
              </Button>
            )}
          </>
        }
      />

      {/* --------------------------------------------------------- banner */}
      <InsecureContextNote />

      <div
        role="tablist"
        aria-label="Hardware view"
        className="mb-5 mt-4 inline-flex rounded-xl border border-line bg-white p-1 shadow-chip"
      >
        {(
          [
            { key: "operator", label: "Operator View" },
            { key: "technical", label: "Technical View" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={view === t.key}
            onClick={() => setView(t.key)}
            className={cx(
              "min-h-[44px] rounded-lg px-4 text-[14px] font-semibold transition-colors duration-150",
              view === t.key ? "bg-brand text-white shadow-chip" : "text-fg-muted hover:bg-ink-750 hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === "operator" ? (
        <div className="space-y-5">
          <DeviceStatusCard />

          <Panel className="min-w-0">
            <PanelHead title="Device controls" subtitle="The same as the buttons on the device." icon={<ScanLine size={17} />} />
            <div className="grid gap-3 p-5 sm:grid-cols-[2fr_1fr_1fr]">
              <Button
                size="lg"
                variant="primary"
                className="h-14 text-[17px]"
                disabled={!connected}
                busy={busy === "acq"}
                icon={<ScanLine size={20} />}
                onClick={() => act("acq", hw.acquire)}
              >
                ACQUIRE
              </Button>
              <Button size="lg" className="h-14" disabled={!connected} busy={busy === "tare"} icon={<Scale size={18} />} onClick={() => act("tare", hw.tare)}>
                Tare
              </Button>
              <Button size="lg" className="h-14" disabled={!connected} busy={busy === "reset"} icon={<RotateCcw size={18} />} onClick={() => act("reset", hw.reset)}>
                RESET
              </Button>
            </div>
            <p className="border-t border-line px-5 py-3.5 text-[13.5px] leading-relaxed text-fg-muted">
              After ACQUIRE, a review screen opens. Nothing is saved until you check the reading and confirm it.
            </p>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead title="Connect the device" subtitle="Three steps. You only do this once per shift." icon={<Plug size={17} />} />
            <ol className="grid gap-3 p-5 md:grid-cols-3">
              {[
                ["Switch it on", "Connect the power bank. The green LED lights when the device is ready."],
                ["Keep it near the phone", "The phone finds the device on its own. If asked, join the “EvidenceChain” Wi-Fi."],
                ["Look for “Device Connected”", "It appears at the top of this page. Then press ACQUIRE to take a reading."],
              ].map(([t, b], i) => (
                <li key={t} className="rounded-2xl border border-line bg-white px-4 py-3.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">{i + 1}</span>
                  <span className="mt-2 block text-[15px] font-semibold text-fg">{t}</span>
                  <span className="mt-0.5 block text-[13.5px] leading-relaxed text-fg-muted">{b}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <LiveSensors />

          <HardwareGuide />
        </div>
      ) : (
      <>

      {!connected ? (
        <Callout tone="warn" title="No device connected" icon={<AlertTriangle size={13} />}>
          Plug PRAMAAN into this laptop with the USB cable and press <strong>Connect PRAMAAN</strong>,
          then pick its serial port. The console also looks for a Wi-Fi board on{" "}
          {DEFAULT_WIFI_HOSTS.join(", ")}. Without hardware you can still capture evidence and type
          values manually, or run the demo device — labelled as simulated on every record it produces.
        </Callout>
      ) : hw.transport === "demo" ? (
        <SimulatedNote>
          Demo hardware is active. No board is attached. Readings are generated in this browser and
          every record made from them carries <span className="mono">source: &quot;demo&quot;</span>{" "}
          inside its signed payload.
        </SimulatedNote>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="min-w-0 space-y-4">
          {/* ------------------------------------------------ live sensors */}
          <LiveSensors />

          <Panel className="min-w-0">
            <PanelHead
              title="Sensor detail"
              subtitle="Load gauge and, where a thermal imager is fitted, its field."
              icon={<Activity size={17} />}
              right={
                <LedMirror
                  green={connected && hw.status !== "FAULT"}
                  amber={hw.status === "ACQUIRING" || Boolean(hw.pending)}
                  red={hw.status === "FAULT"}
                />
              }
            />
            <div className="grid gap-5 px-5 py-5 sm:grid-cols-[auto_1fr]">
              <LoadGauge
                grams={s?.load_cell_g ?? null}
                stable={s?.load_cell_stable ?? false}
                available={connected && hw.health?.load_cell !== false}
              />

              <div className="min-w-0 space-y-3 self-center">
                {hw.health?.thermal ? (
                  <>
                    <div className="flex items-start gap-3">
                      <ThermalMap
                        frame={hw.thermalFrame}
                        min={s?.thermal?.min_c ?? null}
                        max={s?.thermal?.max_c ?? null}
                        className="w-[132px] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="label">Thermal observation</div>
                        <div className="mt-1 text-[22px] font-semibold leading-none tabular-nums text-brand-deep">
                          {s?.thermal ? `${s.thermal.avg_c.toFixed(1)} °C` : "—"}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Pill tone="neutral">min {s?.thermal ? s.thermal.min_c.toFixed(1) : "—"}</Pill>
                          <Pill tone="neutral">max {s?.thermal ? s.thermal.max_c.toFixed(1) : "—"}</Pill>
                        </div>
                        <button
                          onClick={hw.requestFrame}
                          className="mt-2 text-[13px] font-semibold text-brand hover:underline"
                        >
                          Refresh thermal field
                        </button>
                      </div>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-fg-dim">
                      A 32×24 temperature field. It provides contextual thermal observation of the
                      sampling area — it does not detect or identify any substance.
                    </p>
                  </>
                ) : (
                  <div className="rounded-2xl border border-line bg-white px-4 py-4">
                    <div className="label">Thermal observation</div>
                    <div className="mt-2 text-[28px] font-semibold leading-none text-fg-dim">—</div>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
                      Thermal sensor unavailable. No thermal imaging sensor is fitted to this device,
                      so no thermal field is shown or recorded.
                    </p>
                    {hw.temperature.source === "potentiometer" ? (
                      <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                        The temperature above comes from the potentiometer — a simulated temperature
                        input, not a measurement of the sample.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2.5 border-t border-line px-5 py-4 sm:grid-cols-3">
              <Button
                disabled={!connected}
                busy={busy === "acq"}
                variant="primary"
                icon={<ScanLine size={16} />}
                onClick={() => act("acq", hw.acquire)}
              >
                Acquire
              </Button>
              <Button
                disabled={!connected}
                busy={busy === "tare"}
                icon={<Scale size={16} />}
                onClick={() => act("tare", hw.tare)}
              >
                Tare
              </Button>
              <Button
                disabled={!connected}
                busy={busy === "reset"}
                icon={<RotateCcw size={16} />}
                onClick={() => act("reset", hw.reset)}
              >
                Reset session
              </Button>
            </div>
          </Panel>

          {/* ------------------------------------------------------- flow */}
          <Panel className="min-w-0">
            <PanelHead
              title="Hardware to evidence"
              subtitle="Where a reading goes after the officer confirms it."
              icon={<Link2 size={17} />}
            />
            <div className="px-5 py-5">
              <HardwareFlow
                active={
                  hw.pending
                    ? "app"
                    : connected
                      ? hw.status === "ACQUIRING"
                        ? "esp32"
                        : "sensor"
                      : null
                }
              />
              <p className="mt-4 text-[12px] leading-relaxed text-fg-muted">
                Telemetry synchronises by itself. An evidence record does not: the officer reviews
                the acquisition and confirms it, and only then is a record hashed, signed, chained
                and queued through the existing evidence path.
              </p>
            </div>
          </Panel>
        </div>

        {/* ----------------------------------------------------- right col */}
        <div className="min-w-0 space-y-4">
          <Panel className="min-w-0">
            <PanelHead title="Connection" icon={<Wifi size={17} />} />
            <div className="space-y-3.5 px-5 py-5">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                <KeyValue k="State">
                  <Pill tone={tone}>{linkLabel(hw.state, hw.transport)}</Pill>
                </KeyValue>
                <KeyValue k="Transport">
                  {hw.transport === "none" ? "—" : hw.transport.toUpperCase()}
                </KeyValue>
                <KeyValue k="Device ID">
                  <span className="mono">{hw.deviceId ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Firmware">
                  <span className="mono">{hw.firmware ?? "—"}</span>
                </KeyValue>
                <KeyValue k="Packets">
                  <span className="mono">{hw.packets}</span>
                </KeyValue>
                <KeyValue k="Source">
                  <Pill tone={hw.isReal ? "ok" : "sim"}>
                    {hw.isReal ? "Real hardware" : "Demo hardware"}
                  </Pill>
                </KeyValue>
              </div>

              <Field
                label="Board address"
                hint={`Tried automatically, then ${DEFAULT_WIFI_HOSTS.join(" and ")}.`}
              >
                <TextInput
                  value={hw.host}
                  onChange={(e) => hw.setHost(e.target.value)}
                  placeholder="192.168.4.1"
                  spellCheck={false}
                />
              </Field>
              <Button
                className="w-full"
                busy={busy === "conn"}
                icon={<Plug size={16} />}
                onClick={() => act("conn", () => hw.connect())}
              >
                Connect
              </Button>
              {!hw.serialAvailable ? (
                <p className="text-[11.5px] leading-relaxed text-fg-dim">
                  USB serial needs Chrome or Edge on desktop. On a phone, use the board&apos;s Wi-Fi
                  access point instead.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead title="Sensor health" icon={<Gauge size={17} />} />
            <div className="px-5 py-2">
              <HealthRow label="ESP32-S3 gateway" ok={connected} detail={connected ? hw.transport.toUpperCase() : "Not connected"} />
              <HealthRow label="Load cell (NAU7802)" ok={hw.health?.load_cell ?? null} />
              <HealthRow label="Thermal (MLX90640)" ok={hw.health?.thermal ?? null} />
              <HealthRow label="Collector switch" ok={hw.health?.collector_switch ?? null} detail={s ? (s.collector_installed ? "Fitted" : "Absent") : undefined} />
              <HealthRow label="Acquire button" ok={hw.health?.acquire_button ?? null} />
              <HealthRow label="Reset button" ok={hw.health?.reset_button ?? null} />
              <HealthRow
                label="Evidence chain sync"
                ok={store.connectivity.online}
                detail={store.connectivity.online ? "Online" : "Queued locally"}
              />
            </div>
            {hw.lastFault ? (
              <div className="px-5 pb-5">
                <Callout tone="danger" title={hw.lastFault.code} icon={<AlertTriangle size={13} />}>
                  {hw.lastFault.detail}
                </Callout>
              </div>
            ) : null}
          </Panel>

          <Panel className="min-w-0">
            <PanelHead
              title="Load-cell calibration"
              subtitle="Stored on the board. It survives a power cycle."
              icon={<Scale size={17} />}
            />
            <div className="space-y-3 px-5 py-5">
              <ol className="space-y-1.5 text-[12px] leading-relaxed text-fg-muted">
                <li>1. Remove all load, then press Tare.</li>
                <li>2. Place a known mass on the cell.</li>
                <li>3. Enter that mass and press Calibrate.</li>
              </ol>
              <Field label="Known mass (g)">
                <TextInput
                  type="number"
                  value={mass}
                  onChange={(e) => setMass(e.target.value)}
                  min={1}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2.5">
                <Button disabled={!connected} busy={busy === "t2"} onClick={() => act("t2", hw.tare)}>
                  Tare
                </Button>
                <Button
                  variant="primary"
                  disabled={!connected || !Number(mass)}
                  busy={busy === "cal"}
                  onClick={() => act("cal", () => hw.calibrate(Number(mass)))}
                >
                  Calibrate
                </Button>
              </div>
              {hw.lastAckAt ? (
                <p className="text-[11.5px] text-ok">
                  Device acknowledged at {new Date(hw.lastAckAt).toLocaleTimeString()}.
                </p>
              ) : null}
            </div>
          </Panel>

          <PramaanDiagnostics />

          <Callout tone="neutral" title="What these sensors are for">
            On PRAMAAN the load cell measures the force applied while collecting a swab, and the
            potentiometer provides a simulated temperature input. Together they instrument{" "}
            <em>how the sample was taken</em>. Neither identifies a substance, neither is a thermal
            imager, and nothing here produces a referral tier.
          </Callout>
        </div>
      </div>
      </>
      )}

      <AcquisitionReview />
    </>
  );
}
