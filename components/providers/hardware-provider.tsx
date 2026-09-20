"use client";

import * as React from "react";
import {
  HardwareClient,
  serialSupported,
  type ConnectOptions,
} from "@/lib/hardware/client";
import {
  toObservation,
  type AcquisitionMessage,
  type DeviceMessage,
  type DeviceStatus,
  type HardwareObservation,
  type LinkState,
  type SensorHealth,
  type SensorSample,
  type TransportKind,
  type DeviceBrand,
  isSimulatedDeviceId,
  PROTOCOL,
} from "@/lib/hardware/protocol";
import { usePramaan, pramaanStore } from "@/lib/hardware/pramaan/use-pramaan";
import { pramaanObservation } from "@/lib/hardware/pramaan/evidence";
import { PramaanSerialLink } from "@/lib/hardware/pramaan/serial";
import type { PramaanState } from "@/lib/hardware/pramaan/types";

/**
 * Hardware state for the UI.
 *
 * Telemetry arrives at roughly 10 Hz. React is told about it at 5 Hz: the
 * latest frame is held in a ref and flushed on an interval, so a live sensor
 * cannot re-render the whole console on every packet.
 */

const UI_FLUSH_MS = 200;
const HOST_KEY = "evidence-chain.hardware.host";

export interface PendingAcquisition {
  message: AcquisitionMessage;
  observation: HardwareObservation;
  receivedAt: string;
}

interface HardwareContextValue {
  /** Link + transport, never optimistic: "connected" means a device answered. */
  state: LinkState;
  transport: TransportKind;
  detail: string | null;
  /** True only for a real board. The demo device reports false. */
  isReal: boolean;

  deviceId: string | null;
  firmware: string | null;
  health: SensorHealth | null;
  status: DeviceStatus;
  sample: SensorSample | null;
  thermalFrame: number[] | null;
  lastFault: { code: string; detail: string } | null;
  lastAckAt: number | null;
  packets: number;

  /** Set when the device reports an acquisition and the officer has not yet acted. */
  pending: PendingAcquisition | null;
  clearPending: () => void;

  connect: (opts?: ConnectOptions) => Promise<void>;
  connectUsb: () => Promise<boolean>;
  useDemoHardware: () => void;
  disconnect: () => Promise<void>;
  acquire: () => Promise<void>;
  reset: () => Promise<void>;
  tare: () => Promise<void>;
  calibrate: (knownMassG: number) => Promise<void>;
  requestFrame: () => void;

  host: string;
  setHost: (h: string) => void;
  serialAvailable: boolean;

  /* ------------------------------------------------------------ PRAMAAN */
  /** Which device the console is talking to, for naming in the UI. */
  brand: DeviceBrand;
  /** True while PRAMAAN is the attached device. */
  isPramaan: boolean;
  /** Raw PRAMAAN state, for diagnostics and PRAMAAN-specific screens. */
  pramaan: PramaanState;
  /** What the attached device actually has. Empty when nothing is attached. */
  capabilities: DeviceCapability[];
  /** Live temperature with its real source. */
  temperature: { value: number | null; source: "potentiometer" | "thermal_camera" | null };
  /** Live weight with its real source. */
  weight: { value: number | null; source: "load_cell" | null };
  /** Open the PRAMAAN USB serial port. Must be called from a user gesture. */
  connectPramaan: (opts?: { reuseGranted?: boolean }) => Promise<boolean>;
  disconnectPramaan: () => Promise<void>;
  clearPramaanError: () => void;
}

/** Capabilities in the shape the UI lists them, whichever device is attached. */
export interface DeviceCapability {
  key: string;
  label: string;
  available: boolean;
  /** Why it is unavailable, when that is known. Never guessed. */
  note?: string;
}

const Ctx = React.createContext<HardwareContextValue | null>(null);

export function HardwareProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LinkState>("disconnected");
  const [transport, setTransport] = React.useState<TransportKind>("none");
  const [detail, setDetail] = React.useState<string | null>(null);
  const [deviceId, setDeviceId] = React.useState<string | null>(null);
  const [firmware, setFirmware] = React.useState<string | null>(null);
  const [health, setHealth] = React.useState<SensorHealth | null>(null);
  const [status, setStatus] = React.useState<DeviceStatus>("BOOTING");
  const [sample, setSample] = React.useState<SensorSample | null>(null);
  const [thermalFrame, setThermalFrame] = React.useState<number[] | null>(null);
  const [lastFault, setLastFault] = React.useState<{ code: string; detail: string } | null>(null);
  const [lastAckAt, setLastAckAt] = React.useState<number | null>(null);
  const [packets, setPackets] = React.useState(0);
  const [pending, setPending] = React.useState<PendingAcquisition | null>(null);
  const [host, setHostState] = React.useState("");

  const pramaan = usePramaan();

  const clientRef = React.useRef<HardwareClient | null>(null);
  const pendingSample = React.useRef<SensorSample | null>(null);
  const pendingStatus = React.useRef<DeviceStatus | null>(null);
  const packetCount = React.useRef(0);
  const firmwareRef = React.useRef<string>("unknown");
  const transportRef = React.useRef<TransportKind>("none");

  const setHost = React.useCallback((h: string) => {
    setHostState(h);
    try {
      window.localStorage.setItem(HOST_KEY, h);
    } catch {
      /* storage unavailable — the host just is not remembered */
    }
  }, []);

  /* ------------------------------------------------ message handling */

  const onMessage = React.useCallback((msg: DeviceMessage) => {
    packetCount.current += 1;
    switch (msg.type) {
      case "hello":
        setDeviceId(msg.device_id);
        setFirmware(msg.firmware);
        firmwareRef.current = msg.firmware;
        setHealth(msg.sensors);
        setLastFault(null);
        // Automatic synchronisation: identity and capability land here without
        // the officer pressing anything.
        setState("syncing");
        setTimeout(() => setState("connected"), 420);
        break;
      case "telemetry":
        setDeviceId((d) => d ?? msg.device_id);
        pendingSample.current = msg.sensors;
        pendingStatus.current = msg.status;
        if (msg.sensors.thermal?.frame) setThermalFrame(msg.sensors.thermal.frame);
        break;
      case "acquisition": {
        const observation = toObservation(msg, {
          source: transportRef.current === "demo" ? "demo" : "esp32",
          transport: transportRef.current,
          firmware: firmwareRef.current,
        });
        // A sensor event never becomes evidence on its own — it becomes a
        // pending acquisition that an officer must review and confirm.
        setPending({ message: msg, observation, receivedAt: new Date().toISOString() });
        setStatus("ACQUIRING");
        break;
      }
      case "ack":
        setLastAckAt(Date.now());
        if (msg.action === "reset" || msg.action === "fault_cleared") {
          setLastFault(null);
          setStatus("READY");
        }
        break;
      case "fault":
        setLastFault({ code: msg.code, detail: msg.detail });
        setStatus("FAULT");
        break;
    }
  }, []);

  /**
   * A PRAMAAN acquisition takes the same path as every other one: it becomes a
   * pending acquisition that an officer reviews and confirms. Telemetry on its
   * own never creates one.
   */
  React.useEffect(
    () =>
      pramaanStore.onAcquisition((acq) => {
        const observation = pramaanObservation(acq);
        setPending({
          message: {
            protocol: PROTOCOL,
            type: "acquisition",
            device_id: acq.event.device_id,
            acquisition_id: observation.acquisition_id,
            uptime_ms: 0,
            sensors: {
              load_cell_g: acq.event.weight_g,
              load_cell_stable: acq.event.weight_g !== null,
              thermal: null,
              // No collector microswitch on PRAMAAN: unknown, not "absent".
              collector_installed: null,
              temperature_c: acq.event.temperature,
              temperature_source: observation.temperature_source ?? null,
            },
            collector_ok: true,
          },
          observation,
          receivedAt: new Date(acq.receivedAt).toISOString(),
        });
      }),
    [],
  );

  const onState = React.useCallback(
    (s: LinkState, t: TransportKind, d?: string) => {
      transportRef.current = t;
      setTransport(t);
      setDetail(d ?? null);
      setState((prev) => (prev === "syncing" && s === "connected" ? prev : s));
      if (s === "disconnected") {
        setSample(null);
        setThermalFrame(null);
        setStatus("BOOTING");
        // Keep trying: a board that is power-cycled mid-demo comes back on its
        // own, with no page refresh.
        clientRef.current?.scheduleReconnect({ hosts: host ? [host] : [], allowDemo: false });
      }
    },
    [host],
  );

  /* -------------------------------------------------------- lifecycle */

  React.useEffect(() => {
    let remembered = "";
    try {
      remembered = window.localStorage.getItem(HOST_KEY) ?? "";
    } catch {
      /* first run */
    }
    if (remembered) setHostState(remembered);

    const client = new HardwareClient({ onState, onMessage });
    clientRef.current = client;
    void client.connect({ hosts: remembered ? [remembered] : [], allowDemo: false });

    const flush = setInterval(() => {
      if (pendingSample.current) {
        setSample(pendingSample.current);
        pendingSample.current = null;
      }
      // Read the refs before resetting them: state updaters run later, during
      // render, by which time the refs would already be cleared.
      const nextStatus = pendingStatus.current;
      if (nextStatus) {
        pendingStatus.current = null;
        setStatus((cur) => (cur === "ACQUIRING" ? cur : nextStatus));
      }
      const newPackets = packetCount.current;
      if (newPackets) {
        packetCount.current = 0;
        setPackets((p) => p + newPackets);
      }
    }, UI_FLUSH_MS);

    return () => {
      clearInterval(flush);
      void client.dispose();
      clientRef.current = null;
    };
    // Mount once; `host` changes are applied on the next explicit connect().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------- commands */

  const connect = React.useCallback(
    async (opts: ConnectOptions = {}) => {
      await clientRef.current?.connect({
        hosts: [...(opts.hosts ?? []), ...(host ? [host] : [])],
        allowDemo: opts.allowDemo ?? false,
      });
    },
    [host],
  );

  const connectUsb = React.useCallback(async () => {
    return (await clientRef.current?.connectUsb()) ?? false;
  }, []);

  const useDemoHardware = React.useCallback(() => {
    clientRef.current?.startDemo();
  }, []);

  const disconnect = React.useCallback(async () => {
    await clientRef.current?.dispose();
    const client = new HardwareClient({ onState, onMessage });
    clientRef.current = client;
    setState("disconnected");
    setTransport("none");
    setDeviceId(null);
    setSample(null);
  }, [onMessage, onState]);

  const acquire = React.useCallback(async () => {
    await clientRef.current?.send({ type: "acquire" });
  }, []);
  const reset = React.useCallback(async () => {
    await clientRef.current?.send({ type: "reset" });
    setPending(null);
    setStatus("READY");
  }, []);
  const tare = React.useCallback(async () => {
    await clientRef.current?.send({ type: "tare" });
  }, []);
  const calibrate = React.useCallback(async (knownMassG: number) => {
    await clientRef.current?.send({ type: "calibrate", known_mass_g: knownMassG });
  }, []);

  const requestFrame = React.useCallback(() => {
    const demo = clientRef.current?.demoDevice;
    if (demo) setThermalFrame(demo.frame());
  }, []);

  /* ---------------------------------------------------------- PRAMAAN */

  const connectPramaan = React.useCallback(
    async (opts: { reuseGranted?: boolean } = {}) => {
      // Only one device at a time holds the acquisition path.
      await clientRef.current?.dispose();
      clientRef.current = new HardwareClient({ onState, onMessage });
      setState("disconnected");
      setTransport("none");
      transportRef.current = "none";
      return pramaanStore.connect(opts);
    },
    [onMessage, onState],
  );

  const disconnectPramaan = React.useCallback(async () => {
    await pramaanStore.disconnect();
  }, []);

  /** PRAMAAN wins whenever its port is open: it is the device in the operator's hand. */
  const isPramaan = pramaan.portOpen || pramaan.connected;
  const brand: DeviceBrand = isPramaan ? "PRAMAAN" : "Evidence device";

  const mergedState: LinkState = isPramaan
    ? pramaan.connected
      ? "connected"
      : pramaan.connectionState === "error"
        ? "error"
        : "connecting"
    : state;
  const mergedTransport: TransportKind = isPramaan ? "usb" : transport;
  const mergedDeviceId = isPramaan ? pramaan.deviceId : deviceId;
  const mergedFirmware = isPramaan ? pramaan.firmware : firmware;
  const mergedStatus: DeviceStatus = isPramaan
    ? pramaan.state === "ACQUIRED"
      ? "ACQUIRING"
      : pramaan.connected
        ? "READY"
        : "BOOTING"
    : status;

  const mergedSample: SensorSample | null = isPramaan
    ? pramaan.connected
      ? {
          load_cell_g: pramaan.weightGrams,
          load_cell_stable: pramaan.weightGrams !== null,
          thermal: null,
          collector_installed: null,
          temperature_c: pramaan.temperature,
          temperature_source:
            pramaan.sources.temperature === "thermal_sensor"
              ? "thermal_camera"
              : pramaan.sources.temperature === "potentiometer"
                ? "potentiometer"
                : null,
        }
      : null
    : sample;

  const mergedHealth: SensorHealth | null = isPramaan
    ? pramaan.capabilities
      ? {
          load_cell: pramaan.capabilities.load_cell,
          thermal: pramaan.capabilities.thermal_sensor,
          // PRAMAAN has no collector switch; it is reported as a capability
          // the device does not have rather than as a failed sensor.
          collector_switch: false,
          acquire_button: pramaan.capabilities.acquire_button,
          reset_button: pramaan.capabilities.reset_button,
        }
      : null
    : health;

  const capabilities: DeviceCapability[] = isPramaan
    ? pramaan.capabilities
      ? [
          { key: "potentiometer", label: "Potentiometer", available: pramaan.capabilities.potentiometer, note: "Simulated temperature input" },
          { key: "load_cell", label: "Load Cell", available: pramaan.capabilities.load_cell },
          { key: "oled", label: "OLED", available: pramaan.capabilities.oled },
          { key: "acquire_button", label: "Acquire", available: pramaan.capabilities.acquire_button },
          { key: "reset_button", label: "Reset", available: pramaan.capabilities.reset_button },
          { key: "thermal_sensor", label: "Thermal Sensor", available: pramaan.capabilities.thermal_sensor, note: "Not fitted on this device" },
        ]
      : []
    : health
      ? [
          { key: "load_cell", label: "Load cell", available: health.load_cell },
          { key: "thermal", label: "Thermal camera", available: health.thermal },
          { key: "collector_switch", label: "Collector switch", available: health.collector_switch },
          { key: "acquire_button", label: "Acquire button", available: health.acquire_button },
          { key: "reset_button", label: "Reset button", available: health.reset_button },
        ]
      : [];

  const temperature = {
    value: mergedSample?.temperature_c ?? mergedSample?.thermal?.avg_c ?? null,
    source:
      (mergedSample?.temperature_source ??
        (mergedSample?.thermal ? ("thermal_camera" as const) : null)) ?? null,
  };
  const weight = {
    value: mergedSample?.load_cell_g ?? null,
    source: (mergedSample?.load_cell_g ?? null) === null ? null : ("load_cell" as const),
  };

  const mergedAcquire = React.useCallback(async () => {
    if (pramaanStore.getSnapshot().connected) {
      await pramaanStore.requestAcquire();
      return;
    }
    await acquire();
  }, [acquire]);

  const mergedReset = React.useCallback(async () => {
    if (pramaanStore.getSnapshot().connected) {
      await pramaanStore.requestReset();
      return;
    }
    await reset();
  }, [reset]);

  const value: HardwareContextValue = {
    state: mergedState,
    transport: mergedTransport,
    detail: isPramaan ? (pramaan.error ?? "USB serial") : detail,
    isReal: isPramaan
      ? pramaan.connected
      : (transport === "wifi" || transport === "usb") &&
        Boolean(deviceId) &&
        !isSimulatedDeviceId(deviceId as string),
    deviceId: mergedDeviceId,
    firmware: mergedFirmware,
    health: mergedHealth,
    status: mergedStatus,
    sample: mergedSample,
    thermalFrame: isPramaan ? null : thermalFrame,
    lastFault: isPramaan
      ? pramaan.error
        ? { code: "PRAMAAN", detail: pramaan.error }
        : null
      : lastFault,
    lastAckAt: isPramaan ? pramaan.lastSeen : lastAckAt,
    packets: isPramaan ? pramaan.telemetryCount : packets,
    pending,
    clearPending: () => setPending(null),
    connect,
    connectUsb,
    useDemoHardware,
    disconnect,
    acquire: mergedAcquire,
    reset: mergedReset,
    tare,
    calibrate,
    requestFrame,
    host,
    setHost,
    serialAvailable: serialSupported() || PramaanSerialLink.supported(),
    brand,
    isPramaan,
    pramaan,
    capabilities,
    temperature,
    weight,
    connectPramaan,
    disconnectPramaan,
    clearPramaanError: () => pramaanStore.clearError(),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHardware(): HardwareContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useHardware must be used inside <HardwareProvider>");
  return ctx;
}

/**
 * One label for the link, used by every surface so they cannot disagree.
 * Operator language, not network language: no IPs, sockets or baud rates.
 */
export function linkLabel(state: LinkState, transport: TransportKind): string {
  if (state === "connected") {
    if (transport === "wifi") return "Device Connected";
    if (transport === "usb") return "Device Connected · USB";
    if (transport === "demo") return "Demo Device";
  }
  if (state === "syncing") return "Syncing with device…";
  if (state === "connecting" || state === "searching") return "Connecting to device…";
  if (state === "error") return "Device needs attention";
  return "Device offline";
}

/** The four states an operator is told about. */
export type ConnectionKind = "connected" | "connecting" | "offline" | "demo";

export function connectionKind(state: LinkState, transport: TransportKind): ConnectionKind {
  if (state === "connected") return transport === "demo" ? "demo" : "connected";
  if (state === "connecting" || state === "searching" || state === "syncing") return "connecting";
  return "offline";
}
