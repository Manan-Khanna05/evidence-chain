/**
 * PRAMAAN USB serial link (Web Serial API).
 *
 * Owns exactly one port: opening, reading newline-delimited JSON, writing
 * commands, and closing cleanly so a reconnect always starts from a known
 * state. It knows nothing about React or about evidence — it hands parsed
 * messages to a listener and reports problems in plain words.
 */

import { PRAMAAN_BAUD_RATE, type PramaanCommand, type PramaanMessage } from "./types";
import { encodePramaanCommand, parsePramaanLine, pramaanErrorMessage } from "./protocol";

/* Minimal Web Serial typings: the DOM lib does not ship them everywhere. */
interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface SerialLike {
  requestPort(options?: { filters?: { usbVendorId: number }[] }): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

function getSerial(): SerialLike | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { serial?: SerialLike }).serial ?? null;
}

export interface PramaanSerialEvents {
  onMessage: (message: PramaanMessage) => void;
  /** A line that could not be understood. Diagnostics only. */
  onJunk?: (line: string, reason: string) => void;
  onOpen: () => void;
  onClose: (reason: string) => void;
  onError: (friendlyMessage: string) => void;
}

/** Stop the buffer growing without bound if a device never sends a newline. */
const MAX_BUFFER = 16_384;

export class PramaanSerialLink {
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private closing = false;
  private opening = false;

  constructor(private readonly events: PramaanSerialEvents) {}

  get isOpen(): boolean {
    return this.port !== null;
  }

  static supported(): boolean {
    return getSerial() !== null;
  }

  /**
   * Ask the browser for a port. Must be called from a user gesture.
   * `reuseGranted` reconnects silently to a port the user already picked.
   */
  async connect(options: { reuseGranted?: boolean } = {}): Promise<boolean> {
    const serial = getSerial();
    if (!serial) {
      this.events.onError(
        "This browser cannot talk to USB devices. Use Chrome or Edge on a laptop to connect PRAMAAN.",
      );
      return false;
    }
    if (this.opening) return false;
    this.opening = true;
    try {
      await this.close("switching port");
      let port: SerialPortLike | null = null;
      if (options.reuseGranted) {
        const granted = await serial.getPorts();
        port = granted[0] ?? null;
      }
      if (!port) port = await serial.requestPort();
      await port.open({ baudRate: PRAMAAN_BAUD_RATE });
      this.port = port;
      this.closing = false;
      this.writer = port.writable?.getWriter() ?? null;
      this.events.onOpen();
      void this.readLoop(port);
      return true;
    } catch (error) {
      this.events.onError(pramaanErrorMessage(error));
      await this.close("open failed");
      return false;
    } finally {
      this.opening = false;
    }
  }

  private async readLoop(port: SerialPortLike): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = "";
    const reader = port.readable?.getReader() ?? null;
    this.reader = reader;
    if (!reader) {
      this.events.onError("PRAMAAN opened but sent no data. Unplug the cable and try again.");
      await this.close("no readable stream");
      return;
    }
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          const parsed = parsePramaanLine(line);
          if (parsed.ok) this.events.onMessage(parsed.message);
          else if (line.trim()) this.events.onJunk?.(line.trim().slice(0, 200), parsed.reason);
        }
        if (buffer.length > MAX_BUFFER) buffer = "";
      }
    } catch (error) {
      // A cable pulled mid-read lands here; a close we asked for does not.
      if (!this.closing) this.events.onError(pramaanErrorMessage(error));
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* already released */
      }
      this.reader = null;
      if (!this.closing) {
        await this.close("device disconnected");
        this.events.onClose("PRAMAAN disconnected.");
      }
    }
  }

  async send(cmd: PramaanCommand): Promise<boolean> {
    if (!this.writer) return false;
    try {
      await this.writer.write(new TextEncoder().encode(encodePramaanCommand(cmd)));
      return true;
    } catch (error) {
      this.events.onError(pramaanErrorMessage(error));
      return false;
    }
  }

  /** Close everything we hold. Safe to call when nothing is open. */
  async close(reason = "closed"): Promise<void> {
    if (!this.port && !this.reader && !this.writer) return;
    this.closing = true;
    try {
      await this.reader?.cancel();
    } catch {
      /* already gone */
    }
    try {
      this.reader?.releaseLock();
    } catch {
      /* already released */
    }
    try {
      this.writer?.releaseLock();
    } catch {
      /* already released */
    }
    try {
      await this.port?.close();
    } catch {
      /* the port may already be gone with the cable */
    }
    this.reader = null;
    this.writer = null;
    this.port = null;
    this.closing = false;
    void reason;
  }

  /** True when the user has already granted a PRAMAAN port in this browser. */
  static async hasGrantedPort(): Promise<boolean> {
    const serial = getSerial();
    if (!serial) return false;
    try {
      return (await serial.getPorts()).length > 0;
    } catch {
      return false;
    }
  }

  /** Fires when a USB device is physically attached or removed. */
  static onPortChange(listener: () => void): () => void {
    const serial = getSerial();
    if (!serial?.addEventListener) return () => undefined;
    serial.addEventListener("connect", listener);
    serial.addEventListener("disconnect", listener);
    return () => {
      serial.removeEventListener?.("connect", listener);
      serial.removeEventListener?.("disconnect", listener);
    };
  }
}
