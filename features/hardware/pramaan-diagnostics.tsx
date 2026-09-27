"use client";

import * as React from "react";
import { Bug, Check, Copy } from "lucide-react";
import { useHardware } from "@/components/providers/hardware-provider";
import { Button, KeyValue, Panel, PanelHead, cx } from "@/components/ui/primitives";

/**
 * Developer diagnostics.
 *
 * Deliberately tucked into the Technical View: an operator never needs it, and
 * an engineer needs all of it during a demo — last telemetry, sequence, the
 * last event, and every rejected serial line with the reason it was rejected.
 */
export function PramaanDiagnostics() {
  const { pramaan, isPramaan, packets } = useHardware();
  const [copied, setCopied] = React.useState(false);
  const [, tick] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const age = pramaan.lastSeen ? Math.round((Date.now() - pramaan.lastSeen) / 1000) : null;

  return (
    <Panel className="min-w-0">
      <PanelHead
        title="Developer diagnostics"
        subtitle="PRAMAAN serial link. Not shown to operators."
        icon={<Bug size={17} />}
      />
      <div className="space-y-4 px-5 py-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KeyValue k="Connection">
            <span className="mono">{pramaan.connectionState}</span>
          </KeyValue>
          <KeyValue k="Device">
            <span className="mono">{pramaan.deviceId ?? "—"}</span>
          </KeyValue>
          <KeyValue k="Protocol">
            <span className="mono">{pramaan.protocol ?? "—"}</span>
          </KeyValue>
          <KeyValue k="Firmware">
            <span className="mono">{pramaan.firmware ?? "—"}</span>
          </KeyValue>
          <KeyValue k="Device state">
            <span className="mono">{pramaan.state ?? "—"}</span>
          </KeyValue>
          <KeyValue k="Sequence">
            <span className="mono">{pramaan.seq ?? "—"}</span>
          </KeyValue>
          <KeyValue k="Telemetry">
            <span className="mono">
              {isPramaan ? pramaan.telemetryCount : packets} msg
              {age === null ? "" : ` · ${age}s ago`}
            </span>
          </KeyValue>
          <KeyValue k="Last event">
            <span className="mono">
              {pramaan.lastEvent ? `${pramaan.lastEvent.kind} #${pramaan.lastEvent.seq}` : "—"}
            </span>
          </KeyValue>
          <KeyValue k="Temperature" className="col-span-2">
            <span className="mono">
              {pramaan.temperature === null ? "—" : `${pramaan.temperature.toFixed(1)} °C`} ·{" "}
              {pramaan.sources.temperature ?? "no source"}
            </span>
          </KeyValue>
          <KeyValue k="Weight" className="col-span-2">
            <span className="mono">
              {pramaan.weightGrams === null ? "—" : `${pramaan.weightGrams.toFixed(1)} g`} ·{" "}
              {pramaan.sources.weight ?? "no source"}
            </span>
          </KeyValue>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="label">Raw serial output</div>
            <Button
              size="sm"
              variant="ghost"
              icon={copied ? <Check size={14} /> : <Copy size={14} />}
              disabled={pramaan.rawLines.length === 0}
              onClick={async () => {
                const text = [...pramaan.rawLines]
                  .reverse()
                  .map((l) => l.text)
                  .join("\n");
                try {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* clipboard unavailable — the lines are on screen anyway */
                }
              }}
            >
              {copied ? "Copied" : "Copy lines"}
            </Button>
          </div>
          {pramaan.rawLines.length === 0 ? (
            <p className="text-[13px] text-fg-muted">
              Nothing has arrived on the serial port yet. Every line the device sends appears here,
              whether or not the console understands it.
            </p>
          ) : (
            <ul className="space-y-1">
              {pramaan.rawLines.slice(0, 12).map((l, i) => (
                <li
                  key={`${l.at}-${i}`}
                  className={cx(
                    "mono flex gap-2 rounded-lg border px-2.5 py-1.5 text-[12px]",
                    l.accepted
                      ? "border-ok/25 bg-ok/[0.05] text-fg-muted"
                      : "border-warn/25 bg-warn/[0.05] text-[#8A5A12]",
                  )}
                  title={l.accepted ? "Understood" : "Not a PRAMAAN message"}
                >
                  <span className="shrink-0 text-fg-dim">
                    {new Date(l.at).toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className="break-all">{l.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="label mb-2">Serial log</div>
          {pramaan.log.length === 0 ? (
            <p className="text-[13px] text-fg-muted">Nothing logged yet.</p>
          ) : (
            <ul className="space-y-1">
              {pramaan.log.slice(0, 12).map((l, i) => (
                <li
                  key={`${l.at}-${i}`}
                  className={cx(
                    "mono flex gap-2 rounded-lg border px-2.5 py-1.5 text-[12px]",
                    l.level === "error"
                      ? "border-danger/25 bg-danger/[0.05] text-[#8F352C]"
                      : l.level === "warn"
                        ? "border-warn/25 bg-warn/[0.05] text-[#8A5A12]"
                        : "border-line bg-white text-fg-muted",
                  )}
                >
                  <span className="shrink-0 text-fg-dim">
                    {new Date(l.at).toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className="break-all">{l.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
