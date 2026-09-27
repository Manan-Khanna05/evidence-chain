"use client";

import * as React from "react";
import {
  Cpu,
  Database,
  Fingerprint,
  KeyRound,
  Radio,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { PageHeader } from "@/components/layout/app-shell";
import {
  Callout,
  HashChip,
  KeyValue,
  Panel,
  PanelHead,
  Pill,
  SimulatedNote,
  cx,
} from "@/components/ui/primitives";
import { ConnectivityPill } from "@/components/ui/status";
import { MOCK_READINGS, MOCK_SENSOR_ID, MOCK_SENSOR_TYPE } from "@/lib/sensor/mock_readings";
import { REFERRAL_TIERS } from "@/lib/domain/vocab";
import { DeviceStatusCard } from "@/features/hardware/device-status-card";

export default function DeviceStatusPage() {
  const { store, officer, storage } = useApp();
  const [selected, setSelected] = React.useState<string | null>(null);

  if (!store) return null;

  const activeId =
    selected ??
    store.devices.find((d) => d.assigned_officer_id === officer?.officer_id)?.device_id ??
    store.devices[0].device_id;
  const device = store.devices.find((d) => d.device_id === activeId)!;
  const assigned = store.officers.find((o) => o.officer_id === device.assigned_officer_id);
  const chain = store.records
    .filter((r) => r.device_id === device.device_id)
    .sort((a, b) => a.seq - b.seq);
  const queued = chain.filter((r) => r.status === "queued" || r.status === "captured").length;

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Device Status"
        subtitle="Is the evidence device ready, and what is each phone? Below the live card: what this prototype implements, set against the production specification."
        status={<ConnectivityPill online={store.connectivity.online} />}
      />

      <div className="mb-6">
        <DeviceStatusCard />
      </div>

      <h2 className="mb-3 text-[20px] font-semibold text-fg">Phones</h2>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {store.devices.map((d) => (
          <button
            key={d.device_id}
            onClick={() => setSelected(d.device_id)}
            aria-pressed={d.device_id === activeId}
            className={cx(
              "flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-[13.5px] transition-colors duration-150",
              d.device_id === activeId
                ? "border-brand/40 bg-brand/[0.09] text-brand-deep"
                : "border-line bg-white text-fg-muted hover:border-line-strong hover:text-fg",
            )}
          >
            <Smartphone size={14} />
            <span className="mono">{d.device_id}</span>
            <Pill tone={d.force === "RPF" ? "brand" : "ok"}>{d.force}</Pill>
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0 space-y-5">
          <Panel className="min-w-0">
            <PanelHead
              title="Device identity"
              subtitle="These fields populate Part A of the Section 63 Schedule certificate."
              icon={<Smartphone size={16} />}
            />
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-5">
              <KeyValue k="Device ID">
                <span className="mono text-[15px] font-semibold">{device.device_id}</span>
              </KeyValue>
              <KeyValue k="Assigned officer">
                {assigned ? `${assigned.name} · ${assigned.officer_id}` : "—"}
              </KeyValue>
              <KeyValue k="Device type">{device.device_type}</KeyValue>
              <KeyValue k="Make and model">{`${device.make} ${device.model}`}</KeyValue>
              <KeyValue k="Serial number">
                <span className="mono">{device.serial}</span>
              </KeyValue>
              <KeyValue k={device.hardware_identifier_kind}>
                <span className="mono">{device.hardware_identifier}</span>
              </KeyValue>
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead
              title="Key and attestation"
              subtitle="Implemented here vs. specified for production."
              icon={<KeyRound size={16} />}
            />
            <div className="p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-sim/35 bg-sim/[0.06] p-4">
                  <div className="label text-[#8A4B32]">Implemented in this build</div>
                  <dl className="mt-3 space-y-3">
                    <Line k="Key location" v="Software key in the server process" />
                    <Line k="Algorithm" v="ECDSA P-256 / SHA-256 (Web Crypto)" />
                    <Line k="Key security level" v={device.key_security_level} />
                    <Line k="Verified Boot" v={device.verified_boot_state} />
                    <Line k="Attestation" v="None — simulated" />
                  </dl>
                </div>
                <div className="rounded-xl border border-line bg-ink-850/70 p-4">
                  <div className="label">Production target</div>
                  <dl className="mt-3 space-y-3">
                    <Line k="Key location" v="Android Keystore, non-exportable" />
                    <Line k="Algorithm" v="Hardware-backed key with attestation challenge" />
                    <Line k="Key security level" v={device.target_key_security_level} />
                    <Line k="Verified Boot" v={device.target_verified_boot_state} />
                    <Line k="Attestation" v="Certificate chain read at ingest, verified offline" />
                  </dl>
                </div>
              </div>

              <SimulatedNote className="mt-4">
                {device.attestation_note}
              </SimulatedNote>

              <Callout tone="warn" title="What is deliberately not claimed" icon={<ShieldAlert size={13} />}>
                This build does not claim StrongBox, does not claim a Trusted Execution Environment,
                and does not claim hardware-rooted attestation. A browser prototype cannot provide
                any of them, and a self-reported security level is a claim made by the very software
                whose integrity is in question. Whether the target handset exposes a discrete secure
                element or only a TEE is a week-zero question answered with a real handset, not an
                assumption.
              </Callout>
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead
              title="Sensor adapter"
              subtitle="One interface, two implementations. This build ships the mock."
              icon={<Radio size={16} />}
            />
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <KeyValue k="Active adapter">MockSensorAdapter</KeyValue>
                <KeyValue k="Sensor type">{MOCK_SENSOR_TYPE}</KeyValue>
                <KeyValue k="Sensor ID">
                  <span className="mono">{MOCK_SENSOR_ID}</span>
                </KeyValue>
                <KeyValue k="Swap cost">One configuration line</KeyValue>
              </div>
              <div>
                <div className="label mb-2">Scripted readings</div>
                <ul className="space-y-1.5">
                  {MOCK_READINGS.map((r, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-ink-850/60 px-3 py-2 text-[12.5px]"
                    >
                      <span className="mono text-[11px] text-fg-dim">
                        {String(i).padStart(2, "0")}
                      </span>
                      <span className="text-fg-muted">{r.raw_value}</span>
                      <span className="ml-auto">
                        <Pill tone={r.tier === "no_referral" ? "neutral" : "brand"}>
                          {REFERRAL_TIERS[r.tier].label}
                        </Pill>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <SimulatedNote>
                There is no ion-mobility spectrometer, no Raman device and no trace detector behind
                this adapter, and none is claimed. Readings are loaded from a scripted file so the
                demo is deterministic; a serial adapter reading newline-delimited JSON replaces it
                without touching the application.
              </SimulatedNote>
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-5">
          <Panel className="min-w-0">
            <PanelHead
              title="Local chain"
              subtitle="Per-device sequence and linkage."
              icon={<Fingerprint size={16} />}
            />
            <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-5">
              <KeyValue k="Records on device">{chain.length}</KeyValue>
              <KeyValue k="Highest sequence">
                <span className="mono">#{chain.length ? chain[chain.length - 1].seq : 0}</span>
              </KeyValue>
              <KeyValue k="Queued">
                <Pill tone={queued ? "warn" : "ok"}>{queued}</Pill>
              </KeyValue>
              <KeyValue k="Anchored">
                {chain.filter((r) => r.status === "anchored").length}
              </KeyValue>
              <KeyValue k="Chain head payload hash" className="col-span-2">
                <HashChip
                  value={chain.length ? chain[chain.length - 1].payload_hash : null}
                  full
                  tone="info"
                />
              </KeyValue>
            </div>
            <div className="border-t border-line p-5">
              <p className="text-[12px] leading-relaxed text-fg-muted">
                In production the sequence comes from a secure-element monotonic counter, so a device
                cannot silently reorder or re-issue records even against a manipulated system clock.
                Here it is the store&apos;s per-device maximum plus one — the server-side
                discontinuity check on ingest is the same either way.
              </p>
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead
              title="Storage"
              subtitle="Where records actually live in this build."
              icon={<Database size={16} />}
            />
            <div className="space-y-4 p-5">
              {storage?.backend === "postgres" ? (
                <>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                    <KeyValue k="Implemented">Shared PostgreSQL (Neon)</KeyValue>
                    <KeyValue k="Sync">Every device, every few seconds</KeyValue>
                    <KeyValue k="Append-only">
                      <span className="mono text-[12px]">evidence_ledger</span> — insert-only trigger
                    </KeyValue>
                    <KeyValue k="Concurrency">Optimistic — a stale write is retried, never lost</KeyValue>
                  </div>
                  <Callout tone="ok" title="All devices share one store">
                    Records captured on any phone appear on every other device. Each record is also
                    copied, as first signed, into a ledger table the database refuses to update or
                    delete. The tamper demo edits the working store, never the ledger.
                  </Callout>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                    <KeyValue k="Implemented">
                      {storage?.backend === "memory" ? "In memory (this server instance)" : "JSON file on disk"}
                    </KeyValue>
                    <KeyValue k="Path">
                      <span className="mono text-[11.5px]">
                        {storage?.backend === "memory" ? "—" : ".data/evidence-store.json"}
                      </span>
                    </KeyValue>
                    <KeyValue k="Append-only">Enforced in the data-access layer</KeyValue>
                    <KeyValue k="Production target">PostgreSQL, insert-only trigger</KeyValue>
                  </div>
                  <SimulatedNote>
                    This is local prototype storage and is not shared between devices. Set
                    DATABASE_URL to switch to the shared PostgreSQL store with its insert-only ledger.
                  </SimulatedNote>
                </>
              )}
            </div>
          </Panel>

          <Panel className="min-w-0">
            <PanelHead
              title="Timestamp authorities"
              subtitle="Two authorities in different trust domains."
              icon={<Cpu size={16} />}
            />
            <div className="space-y-3 p-5">
              {store.tsa_authorities.map((t) => (
                <div
                  key={t.tsa_id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-ink-850/60 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-fg">{t.tsa_name}</div>
                    <div className="text-[11.5px] text-fg-dim">{t.trust_domain}</div>
                  </div>
                  <span className="ml-auto flex items-center gap-1.5">
                    <Pill tone="sim">Simulated</Pill>
                    <Pill tone={t.available ? "ok" : "warn"}>
                      {t.available ? "Available" : "Offline"}
                    </Pill>
                  </span>
                </div>
              ))}
              <SimulatedNote>
                Nothing in this build contacts a real RFC 3161 service. Tokens are signed locally
                with demo keys. The design point survives the simulation: a timestamp authority only
                ever receives a hash, so it cannot read a record, cannot alter one, and can lie about
                exactly one thing — the time — which a second authority in a different trust domain
                detects.
              </SimulatedNote>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[11.5px] uppercase tracking-[0.07em] text-fg-dim">{k}</dt>
      <dd className="text-right text-[12.5px] text-fg">{v}</dd>
    </div>
  );
}
