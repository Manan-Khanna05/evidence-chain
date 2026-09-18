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
        subtitle="The ESP32-S3 gateway and its sensors. Live values here are telemetry — an evidence record only exists once an officer confirms an acquisition."
        status={
          <Pill tone={tone}>
            {linkLabel(hw.state, hw.transport)}
            {hw.deviceId ? ` · ${hw.deviceId}` : ""}
          </Pill>
        }
        actions={
          <>
            <Button
              busy={busy === "scan"}
              icon={<RefreshCw size={16} />}
              onClick={() => act("scan", () => hw.connect())}
            >
              Scan for device
            </Button>
            {hw.serialAvailable ? (
              <Button
                icon={<Usb size={16} />}
                busy={busy === "usb"}
                onClick={() => act("usb", async () => void (await hw.connectUsb()))}
              >
                Connect USB
              </Button>
            ) : null}
            {!connected ? (
              <Button variant="primary" icon={<Cpu size={16} />} onClick={hw.useDemoHardware}>
                Use demo hardware
              </Button>
            ) : null}
          </>
        }
      />

      {/* --------------------------------------------------------- banner */}
      <InsecureContextNote />

      {!connected ? (
        <Callout tone="warn" title="No hardware connected" icon={<AlertTriangle size={13} />}>
          The console looked for a board on {DEFAULT_WIFI_HOSTS.join(", ")} and on any serial port you
          have already permitted. Join the board&apos;s Wi-Fi access point, plug it in over USB, or
          run the demo device — which speaks the identical protocol and is labelled as simulated on
          every record it produces.
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
          <Panel className="min-w-0">
            <PanelHead
              title="Live sensor data"
              subtitle="Throttled to 5 updates per second for display; the board samples faster."
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
                      <Pill tone="neutral">
                        min {s?.thermal ? s.thermal.min_c.toFixed(1) : "—"}
                      </Pill>
                      <Pill tone="neutral">
                        max {s?.thermal ? s.thermal.max_c.toFixed(1) : "—"}
                      </Pill>
                    </div>
                    <button
                      onClick={hw.requestFrame}
                      className="mt-2 text-[11.5px] font-semibold text-brand hover:underline"
                    >
                      Refresh thermal field
                    </button>
                  </div>
                </div>
                <p className="text-[11.5px] leading-relaxed text-fg-dim">
                  A 32×24 temperature field. It provides contextual thermal observation of the
                  sampling area — it does not detect or identify any substance.
                </p>
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

          <Callout tone="neutral" title="What these sensors are for">
            The load cell measures the force applied while collecting a swab, the MLX90640 measures a
            temperature field, and the microswitch reports whether the collector is fitted. Together
            they instrument <em>how the sample was taken</em>. None of them identifies a substance,
            and nothing here produces a referral tier.
          </Callout>
        </div>
      </div>

      <AcquisitionReview />
    </>
  );
}
