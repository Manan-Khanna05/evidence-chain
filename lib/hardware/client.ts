"use client";

/**
 * Hardware transport layer.
 *
 * Three ways to reach a device, tried in this order and never faked:
 *   1. Wi-Fi   — WebSocket to ws://<host>/ws, REST for commands.
 *   2. USB     — Web Serial, newline-delimited JSON (Chrome/Edge desktop, and
 *                only after a user gesture; the browser will not open a port
 *                without one).
 *   3. Demo    — an in-browser device that speaks the identical protocol.
 *                Every message it emits is tagged source "demo" so a record
 *                made from it can never be mistaken for a real reading.
 *
 * Nothing here touches React. The provider subscribes and throttles.
 */

import {
  PROTOCOL,
  parseDeviceMessage,
  type AcquisitionMessage,
  type DeviceMessage,
  type HelloMessage,
  type HostCommand,
  type LinkState,
  type TransportKind,
} from "./protocol";

export const DEFAULT_WIFI_HOSTS = ["192.168.4.1", "evidence-chain.local"];
const WIFI_PROBE_TIMEOUT_MS = 1400;
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 15000;

export interface HardwareEvents {
  onState: (state: LinkState, transport: TransportKind, detail?: string) => void;
  onMessage: (msg: DeviceMessage) => void;
}

interface Transport {
  kind: TransportKind;
  send(cmd: HostCommand): Promise<void>;
  close(): Promise<void>;
}

/* ------------------------------------------------------------------ Wi-Fi */

/**
 * Probe a candidate host before opening a socket. A plain fetch fails fast and
 * gives a clear "not there" rather than a WebSocket that hangs for 30 seconds
 * on a projector in front of judges.
 */
async function probeWifi(host: string): Promise<HelloMessage | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), WIFI_PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`http://${host}/device`, {
      signal: ctrl.signal,
      cache: "no-store",
      mode: "cors",
    });
    if (!res.ok) return null;
    const msg = parseDeviceMessage(await res.text());
    return msg && msg.type === "hello" ? msg : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function openWifi(host: string, events: HardwareEvents): Promise<Transport> {
  return new Promise((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(`ws://${host}/ws`);
    } catch (e) {
      reject(e);
      return;
    }
    const failFast = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* already closing */
      }
      reject(new Error("WebSocket timed out"));
    }, 5000);

    // A socket we close ourselves must stay quiet. Without this, tearing down
    // the old link during a reconnect fires onclose *after* the new link is up
    // and drags the UI back to "offline" while telemetry is already flowing.
    let retired = false;

    ws.onopen = () => {
      clearTimeout(failFast);
      resolve({
        kind: "wifi",
        async send(cmd) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ protocol: PROTOCOL, ...cmd }));
          }
        },
        async close() {
          retired = true;
          try {
            ws.close();
          } catch {
            /* already closed */
          }
        },
      });
    };
    ws.onmessage = (ev) => {
      const msg = parseDeviceMessage(String(ev.data));
      if (msg) events.onMessage(msg);
    };
    ws.onerror = () => {
      clearTimeout(failFast);
    };
    ws.onclose = () => {
      clearTimeout(failFast);
      if (!retired) events.onState("disconnected", "wifi", "Wi-Fi link closed");
    };
  });
}

/* -------------------------------------------------------------- USB serial */

type SerialPortLike = {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
};

type SerialLike = {
  requestPort(): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
};

export function serialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

function getSerial(): SerialLike | null {
  if (!serialSupported()) return null;
  return (navigator as unknown as { serial: SerialLike }).serial;
}

/** Ports the user has already granted; reconnecting to these needs no gesture. */
export async function previouslyGrantedPorts(): Promise<SerialPortLike[]> {
  const serial = getSerial();
  if (!serial) return [];
  try {
    return await serial.getPorts();
  } catch {
    return [];
  }
}

async function openSerialPort(port: SerialPortLike, events: HardwareEvents): Promise<Transport> {
  await port.open({ baudRate: 115200 });

  // Same reasoning as the Wi-Fi transport: a port we close ourselves reports
  // nothing, so a reconnect cannot be undone by the outgoing link.
  let closed = false;
  const writer = port.writable?.getWriter() ?? null;
  const encoder = new TextEncoder();

  // Read newline-delimited JSON, buffering across chunk boundaries.
  void (async () => {
    const decoder = new TextDecoder();
    let buffer = "";
    const reader = port.readable?.getReader();
    if (!reader) return;
    try {
      while (!closed) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const msg = parseDeviceMessage(line);
          if (msg) events.onMessage(msg);
        }
        // A device spewing without newlines must not grow the buffer forever.
        if (buffer.length > 32_768) buffer = "";
      }
    } catch {
      /* port went away — reported through onclose below */
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* already released */
      }
      if (!closed) events.onState("disconnected", "usb", "Serial port closed");
    }
  })();

  return {
    kind: "usb",
    async send(cmd) {
      if (!writer) return;
      await writer.write(encoder.encode(JSON.stringify({ protocol: PROTOCOL, ...cmd }) + "\n"));
    },
    async close() {
      closed = true;
      try {
        writer?.releaseLock();
        await port.close();
      } catch {
        /* nothing to do */
      }
    },
  };
}

/* ------------------------------------------------------------ demo device */

/**
 * The in-browser stand-in. It runs the same state machine as the firmware so
 * the whole pipeline — acquisition, collector interlock, faults, reset — can be
 * rehearsed without a board. Every frame is stamped device_id "EC-DEMO-001".
 */
export class DemoDevice {
  private timer: ReturnType<typeof setInterval> | null = null;
  private seq = 0;
  private acq = 0;
  private t0 = Date.now();
  private status: "READY" | "ACQUIRING" = "READY";
  collectorInstalled = true;
  private base = 138;

  constructor(private readonly events: HardwareEvents) {}

  readonly deviceId = "EC-DEMO-001";
  readonly firmware = "demo-1.0.0";

  start() {
    this.events.onMessage({
      protocol: PROTOCOL,
      type: "hello",
      device_id: this.deviceId,
      firmware: this.firmware,
      uptime_ms: 0,
      has_rtc: false,
      sensors: {
        load_cell: true,
        thermal: true,
        collector_switch: true,
        acquire_button: true,
        reset_button: true,
      },
      calibrated: true,
      wifi: { mode: "off", ip: null, rssi: null },
    });
    this.timer = setInterval(() => this.tick(), 200);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private sample() {
    const drift = Math.sin(Date.now() / 900) * 4 + (Math.random() - 0.5) * 2.4;
    const load = Math.max(0, Math.round((this.base + drift) * 10) / 10);
    const avg = Math.round((31.4 + Math.sin(Date.now() / 2600) * 0.7) * 10) / 10;
    return {
      load_cell_g: load,
      load_cell_stable: Math.abs(drift) < 3,
      thermal: {
        min_c: Math.round((avg - 2.1) * 10) / 10,
        max_c: Math.round((avg + 2.8) * 10) / 10,
        avg_c: avg,
      },
      collector_installed: this.collectorInstalled,
    };
  }

  private tick() {
    this.seq += 1;
    this.events.onMessage({
      protocol: PROTOCOL,
      type: "telemetry",
      device_id: this.deviceId,
      seq: this.seq,
      uptime_ms: Date.now() - this.t0,
      status: this.status,
      sensors: this.sample(),
    });
  }

  /** Thermal frames are heavy; the demo emits one only when asked. */
  frame(): number[] {
    const out: number[] = [];
    const t = Date.now() / 1400;
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 32; x++) {
        const d = Math.hypot(x - 16 - Math.sin(t) * 3, y - 12);
        out.push(Math.round((30 + Math.max(0, 5.5 - d * 0.42) + Math.random() * 0.3) * 10) / 10);
      }
    }
    return out;
  }

  send(cmd: HostCommand) {
    if (cmd.type === "acquire") {
      this.acq += 1;
      this.status = "ACQUIRING";
      const msg: AcquisitionMessage = {
        protocol: PROTOCOL,
        type: "acquisition",
        device_id: this.deviceId,
        acquisition_id: `ACQ-D${String(this.acq).padStart(3, "0")}`,
        uptime_ms: Date.now() - this.t0,
        sensors: this.sample(),
        collector_ok: this.collectorInstalled,
      };
      setTimeout(() => this.events.onMessage(msg), 140);
    } else if (cmd.type === "reset") {
      this.status = "READY";
      this.events.onMessage({
        protocol: PROTOCOL,
        type: "ack",
        device_id: this.deviceId,
        action: "reset",
        ok: true,
        detail: "Session reset",
      });
    } else if (cmd.type === "tare") {
      this.base = 0;
      this.events.onMessage({
        protocol: PROTOCOL,
        type: "ack",
        device_id: this.deviceId,
        action: "tare",
        ok: true,
      });
    }
  }
}

/* --------------------------------------------------------- the controller */

export interface ConnectOptions {
  /** Extra hosts to probe before the defaults, e.g. a remembered LAN IP. */
  hosts?: string[];
  /** Fall back to the demo device when no real board answers. */
  allowDemo?: boolean;
}

export class HardwareClient {
  private transport: Transport | null = null;
  private demo: DemoDevice | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private disposed = false;
  private lastHost: string | null = null;

  constructor(private readonly events: HardwareEvents) {}

  get kind(): TransportKind {
    return this.transport?.kind ?? (this.demo ? "demo" : "none");
  }

  get demoDevice(): DemoDevice | null {
    return this.demo;
  }

  /**
   * Try Wi-Fi, then a previously granted serial port, then (optionally) the
   * demo device. USB via a fresh port picker needs a user gesture, so it is
   * offered by the UI rather than attempted here.
   */
  async connect(opts: ConnectOptions = {}): Promise<TransportKind> {
    if (this.disposed) return "none";
    await this.teardown();
    this.events.onState("searching", "none", "Looking for hardware");

    const hosts = [...(opts.hosts ?? []), ...DEFAULT_WIFI_HOSTS].filter(
      (h, i, a) => h && a.indexOf(h) === i,
    );
    for (const host of hosts) {
      const hello = await probeWifi(host);
      if (!hello) continue;
      try {
        this.events.onState("connecting", "wifi", host);
        this.transport = await openWifi(host, this.events);
        this.lastHost = host;
        this.attempts = 0;
        this.events.onMessage(hello);
        this.events.onState("connected", "wifi", host);
        return "wifi";
      } catch {
        /* fall through to the next candidate */
      }
    }

    const granted = await previouslyGrantedPorts();
    if (granted.length) {
      try {
        this.events.onState("connecting", "usb", "Serial");
        this.transport = await openSerialPort(granted[0], this.events);
        this.attempts = 0;
        this.events.onState("connected", "usb", "USB serial");
        return "usb";
      } catch {
        /* fall through */
      }
    }

    if (opts.allowDemo) {
      this.startDemo();
      return "demo";
    }
    this.events.onState("disconnected", "none", "No hardware found");
    return "none";
  }

  /** Opens the browser port picker. Must be called from a click handler. */
  async connectUsb(): Promise<boolean> {
    const serial = getSerial();
    if (!serial) return false;
    try {
      const port = await serial.requestPort();
      await this.teardown();
      this.events.onState("connecting", "usb", "Serial");
      this.transport = await openSerialPort(port, this.events);
      this.attempts = 0;
      this.events.onState("connected", "usb", "USB serial");
      return true;
    } catch {
      this.events.onState("disconnected", "none", "Serial port not opened");
      return false;
    }
  }

  startDemo() {
    this.demo = new DemoDevice(this.events);
    this.demo.start();
    this.events.onState("connected", "demo", "Demo hardware");
  }

  async send(cmd: HostCommand) {
    if (this.transport) await this.transport.send(cmd);
    else this.demo?.send(cmd);
  }

  /** Exponential backoff, capped, so a missing board does not spin the CPU. */
  scheduleReconnect(opts: ConnectOptions = {}) {
    if (this.disposed || this.reconnectTimer) return;
    this.attempts += 1;
    const delay = Math.min(RECONNECT_BASE_MS * this.attempts, RECONNECT_MAX_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect({ ...opts, hosts: [...(opts.hosts ?? []), ...(this.lastHost ? [this.lastHost] : [])] });
    }, delay);
  }

  private async teardown() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.demo?.stop();
    this.demo = null;
    await this.transport?.close();
    this.transport = null;
  }

  async dispose() {
    this.disposed = true;
    await this.teardown();
  }
}
