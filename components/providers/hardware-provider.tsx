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
  isSimulatedDeviceId,
} from "@/lib/hardware/protocol";

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

  const value: HardwareContextValue = {
    state,
    transport,
    detail,
    isReal:
      (transport === "wifi" || transport === "usb") &&
      Boolean(deviceId) &&
      !isSimulatedDeviceId(deviceId as string),
    deviceId,
    firmware,
    health,
    status,
    sample,
    thermalFrame,
    lastFault,
    lastAckAt,
    packets,
    pending,
    clearPending: () => setPending(null),
    connect,
    connectUsb,
    useDemoHardware,
    disconnect,
    acquire,
    reset,
    tare,
    calibrate,
    requestFrame,
    host,
    setHost,
    serialAvailable: serialSupported(),
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
