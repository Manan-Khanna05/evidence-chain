/**
 * The single PRAMAAN integration layer.
 *
 * All serial state lives here — no React component opens a port or parses a
 * message. Components subscribe and read a snapshot.
 *
 * Two rules this file exists to enforce:
 *   1. A value is shown only when the device reports that input as connected.
 *      Missing inputs stay null; nothing is invented.
 *   2. Telemetry is not evidence. An acquisition is raised only by the
 *      physical ACQUIRE button or an explicit software Acquire, and even then
 *      it only becomes a record after the officer confirms it upstream.
 */

import { PramaanSerialLink } from "./serial";
import { parsePramaanLine } from "./protocol";
import type {
  PramaanAcquireEvent,
  PramaanCapabilities,
  PramaanCommand,
  PramaanLogEntry,
  PramaanMessage,
  PramaanState,
} from "./types";

/** No telemetry for this long and PRAMAAN is reported offline. */
export const HEARTBEAT_TIMEOUT_MS = 3000;
/** Checked on this cadence, so one missed packet never flips the badge. */
const HEARTBEAT_TICK_MS = 500;
const LOG_LIMIT = 60;

export interface PramaanAcquisition {
  event: PramaanAcquireEvent;
  /** Which button started it. Recorded in the evidence payload. */
  trigger: "device_button" | "app";
  receivedAt: number;
  capabilities: PramaanCapabilities | null;
  firmware: string | null;
}

const EMPTY: PramaanState = {
  connectionState: "disconnected",
  connected: false,
  portOpen: false,
  deviceId: null,
  firmware: null,
  protocol: null,
  lastSeen: null,
  state: null,
  seq: null,
  temperature: null,
  weightGrams: null,
  sources: { temperature: null, weight: null },
  capabilities: null,
  error: null,
  log: [],
  telemetryCount: 0,
  lastEvent: null,
};

type Listener = () => void;

class PramaanStore {
  private state: PramaanState = EMPTY;
  private listeners = new Set<Listener>();
  private link: PramaanSerialLink;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  /** Set while a software Acquire waits for the device to answer. */
  private awaitingAcquire: ((e: PramaanAcquireEvent | null) => void) | null = null;
  /** Guards against one capture producing two records. */
  private lastAcquireKey = "";
  private lastAcquireAt = 0;

  private acquisitionListeners = new Set<(a: PramaanAcquisition) => void>();

  constructor() {
    this.link = new PramaanSerialLink({
      onMessage: (m) => this.onMessage(m),
      onJunk: (line, reason) => this.log("warn", `Ignored serial line (${reason}): ${line}`),
      onOpen: () => {
        this.patch({ portOpen: true, connectionState: "connecting", error: null });
        this.log("info", "Serial port open, waiting for PRAMAAN telemetry");
        this.startHeartbeat();
      },
      onClose: (reason) => {
        this.log("info", reason);
        this.markDisconnected(reason);
      },
      onError: (message) => {
        this.patch({ error: message, connectionState: "error" });
        this.log("error", message);
      },
    });
  }

  /* ------------------------------------------------------- subscription */

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): PramaanState => this.state;

  /** Server render: nothing is connected there. */
  getServerSnapshot = (): PramaanState => EMPTY;

  onAcquisition(listener: (a: PramaanAcquisition) => void): () => void {
    this.acquisitionListeners.add(listener);
    return () => this.acquisitionListeners.delete(listener);
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  private patch(next: Partial<PramaanState>) {
    this.state = { ...this.state, ...next };
    this.emit();
  }

  private log(level: PramaanLogEntry["level"], message: string) {
    const entry: PramaanLogEntry = { at: Date.now(), level, message };
    this.state = { ...this.state, log: [entry, ...this.state.log].slice(0, LOG_LIMIT) };
    this.emit();
  }

  /* ------------------------------------------------------------ link */

  async connect(options: { reuseGranted?: boolean } = {}): Promise<boolean> {
    this.patch({ connectionState: "connecting", error: null });
    const ok = await this.link.connect(options);
    if (!ok && this.state.connectionState !== "error") {
      this.patch({ connectionState: "disconnected" });
    }
    return ok;
  }

  async disconnect(): Promise<void> {
    await this.link.close("operator disconnected");
    this.markDisconnected("Disconnected.");
  }

  private markDisconnected(_reason: string) {
    this.stopHeartbeat();
    this.patch({
      connectionState: this.state.connectionState === "error" ? "error" : "disconnected",
      connected: false,
      portOpen: false,
      state: null,
      // Live values are cleared: a stale number must never look live.
      temperature: null,
      weightGrams: null,
      sources: { temperature: null, weight: null },
    });
  }

  private startHeartbeat() {
    if (this.heartbeat) return;
    this.heartbeat = setInterval(() => {
      const { lastSeen, connected } = this.state;
      if (!connected) return;
      if (lastSeen && Date.now() - lastSeen > HEARTBEAT_TIMEOUT_MS) {
        this.log("warn", "No telemetry for 3s — PRAMAAN reported offline");
        this.patch({
          connected: false,
          connectionState: this.link.isOpen ? "connecting" : "disconnected",
          temperature: null,
          weightGrams: null,
          sources: { temperature: null, weight: null },
        });
      }
    }, HEARTBEAT_TICK_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  /* -------------------------------------------------------- messages */

  private onMessage(msg: PramaanMessage) {
    // Once the device has identified itself, anything claiming to be a
    // different device on the same port is ignored rather than merged in.
    if (
      msg.type !== "device_hello" &&
      this.state.deviceId &&
      msg.device_id !== this.state.deviceId
    ) {
      this.log("warn", `Ignored ${msg.type} from unexpected device ${msg.device_id}`);
      return;
    }

    switch (msg.type) {
      case "device_hello":
        this.patch({
          deviceId: msg.device_id,
          firmware: msg.firmware,
          protocol: msg.protocol,
          capabilities: msg.capabilities,
          error: null,
        });
        this.log("info", `PRAMAAN ${msg.device_id} firmware ${msg.firmware}`);
        break;

      case "telemetry": {
        const caps: PramaanCapabilities = this.state.capabilities
          ? {
              ...this.state.capabilities,
              potentiometer: msg.connected.potentiometer,
              load_cell: msg.connected.load_cell,
              thermal_sensor: msg.connected.thermal_sensor,
            }
          : {
              potentiometer: msg.connected.potentiometer,
              load_cell: msg.connected.load_cell,
              thermal_sensor: msg.connected.thermal_sensor,
              oled: false,
              acquire_button: true,
              reset_button: true,
            };
        this.patch({
          connected: true,
          connectionState: "connected",
          portOpen: true,
          deviceId: this.state.deviceId ?? msg.device_id,
          lastSeen: Date.now(),
          seq: msg.seq,
          state: msg.state,
          temperature: msg.temperature,
          weightGrams: msg.weight_g,
          sources: {
            temperature: msg.temperature === null ? null : msg.temperature_source,
            weight: msg.weight_g === null ? null : msg.weight_source,
          },
          capabilities: caps,
          error: null,
          telemetryCount: this.state.telemetryCount + 1,
        });
        this.startHeartbeat();
        break;
      }

      case "acquire":
        this.patch({ lastSeen: Date.now(), seq: msg.seq, state: "ACQUIRED" });
        this.handleAcquire(msg, this.awaitingAcquire ? "app" : "device_button");
        break;

      case "reset":
        this.patch({ lastSeen: Date.now(), seq: msg.seq, state: "READY" });
        this.log("info", `Reset — next sequence ${msg.seq}`);
        this.patch({ lastEvent: { kind: "reset", seq: msg.seq, at: Date.now() } });
        break;

      case "error":
        this.patch({ error: `PRAMAAN reported a problem: ${msg.detail || msg.code}` });
        this.log("error", `${msg.code} ${msg.detail}`);
        break;
    }
  }

  /**
   * One capture must not become two records. The physical button and a
   * software Acquire can both be in flight; the first event wins and an
   * identical one arriving within two seconds is ignored.
   */
  private handleAcquire(event: PramaanAcquireEvent, trigger: PramaanAcquisition["trigger"]) {
    const key = `${event.device_id}:${event.seq}`;
    const now = Date.now();
    if (key === this.lastAcquireKey && now - this.lastAcquireAt < 2000) {
      this.log("warn", `Duplicate acquire for sequence ${event.seq} ignored`);
      return;
    }
    this.lastAcquireKey = key;
    this.lastAcquireAt = now;

    const waiter = this.awaitingAcquire;
    this.awaitingAcquire = null;
    waiter?.(event);

    this.patch({ lastEvent: { kind: "acquire", seq: event.seq, at: now } });
    this.log("info", `ACQUIRED sequence ${event.seq} (${trigger === "app" ? "app" : "device button"})`);

    const acquisition: PramaanAcquisition = {
      event,
      trigger,
      receivedAt: now,
      capabilities: this.state.capabilities,
      firmware: this.state.firmware,
    };
    for (const l of this.acquisitionListeners) l(acquisition);
  }

  /* -------------------------------------------------------- commands */

  async send(cmd: PramaanCommand): Promise<boolean> {
    return this.link.send(cmd);
  }

  /**
   * Software Acquire. Asks PRAMAAN to take the reading so the device and the
   * app capture the same instant. If the device does not answer in time, the
   * latest valid telemetry is used instead — and that is what gets recorded,
   * never an invented value.
   */
  async requestAcquire(timeoutMs = 1200): Promise<boolean> {
    if (!this.state.connected) return false;
    const answered = new Promise<PramaanAcquireEvent | null>((resolve) => {
      this.awaitingAcquire = resolve;
      setTimeout(() => {
        if (this.awaitingAcquire === resolve) {
          this.awaitingAcquire = null;
          resolve(null);
        }
      }, timeoutMs);
    });
    await this.send({ type: "acquire" });
    const event = await answered;
    if (event) return true;

    const s = this.state;
    if (s.temperature === null && s.weightGrams === null) {
      this.patch({
        error: "PRAMAAN did not return a reading. Press ACQUIRE on the device, or enter values manually.",
      });
      return false;
    }
    this.log("warn", "No acquire event from PRAMAAN — using the latest telemetry");
    this.handleAcquire(
      {
        type: "acquire",
        device_id: s.deviceId ?? "PRAMAAN",
        seq: s.seq ?? 0,
        temperature: s.temperature,
        weight_g: s.weightGrams,
        temperature_source: s.sources.temperature === "manual" ? null : s.sources.temperature,
        weight_source: s.sources.weight === "manual" ? null : s.sources.weight,
        event: "ACQUIRED",
      },
      "app",
    );
    return true;
  }

  async requestReset(): Promise<boolean> {
    return this.send({ type: "reset" });
  }

  clearError() {
    this.patch({ error: null });
  }

  /**
   * Development helper: feed a protocol line as if it arrived over serial.
   * Never reachable in a production build.
   */
  injectLine(line: string) {
    if (process.env.NODE_ENV === "production") return;
    const parsed = parsePramaanLine(line);
    if (parsed.ok) {
      if (!this.state.portOpen) this.patch({ portOpen: true });
      this.startHeartbeat();
      this.onMessage(parsed.message);
    } else {
      this.log("warn", `Injected line rejected: ${parsed.reason}`);
    }
  }
}

/** One store per browser tab. */
export const pramaanStore = new PramaanStore();

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as Record<string, unknown>).__pramaan = pramaanStore;
}
