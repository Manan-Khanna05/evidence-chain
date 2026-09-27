"use client";

import * as React from "react";
import {
  Boxes,
  Database,
  FileCode2,
  Network,
} from "lucide-react";
import {
  Cpu,
  KeyRound,
  ShieldCheck,
  Wrench,
} from "@/components/ui/icons";
import { PageHeader } from "@/components/layout/app-shell";
import { Panel, PanelHead, Pill } from "@/components/ui/primitives";
import { useApp } from "@/components/providers/app-provider";

/**
 * Maintainer documentation, written against the code as it actually is.
 *
 * Where a value can be read from the running system it is read, not typed, so
 * this page cannot drift away from the build it ships with.
 */

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mono overflow-x-auto whitespace-pre rounded-xl border border-line bg-ink-750/60 px-4 py-3 text-[12.5px] leading-relaxed text-fg">
      {children}
    </pre>
  );
}

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Panel as="article" className="min-w-0 scroll-mt-6">
      <div id={id} className="scroll-mt-6" />
      <PanelHead title={title} icon={icon} />
      <div className="space-y-4 px-5 py-5 text-[14.5px] leading-relaxed text-fg-muted">{children}</div>
    </Panel>
  );
}

export default function SystemGuidePage() {
  const { store, storage } = useApp();

  return (
    <>
      <PageHeader
        eyebrow="Evidence Chain V2 · for maintainers"
        title="System & Architecture Guide"
        subtitle="How Evidence Chain V2 is put together, written against the code in this build."
        status={<Pill tone="neutral">Schema 2 · PRAMAAN-1</Pill>}
      />

      <nav aria-label="Guide sections" className="mb-5 flex flex-wrap gap-2">
        {[
          ["architecture", "Architecture"],
          ["data", "Data model"],
          ["case", "Case model"],
          ["record", "Record model"],
          ["crypto", "Cryptography"],
          ["pramaan", "PRAMAAN protocol"],
          ["tte", "TTE architecture"],
          ["storage", "Offline sync"],
          ["verification", "Verification"],
          ["merkle", "Merkle"],
          ["anchoring", "Timestamp anchoring"],
          ["handoff", "Handoff & certificates"],
          ["security", "Security"],
          ["deploy", "Deployment"],
          ["ops", "Troubleshooting"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex min-h-[38px] items-center rounded-[10px] border border-line-strong bg-white px-3 text-[13.5px] font-medium text-brand hover:bg-brand-soft"
          >
            {label}
          </a>
        ))}
      </nav>

      <div className="space-y-5">
        <Section id="architecture" title="Architecture" icon={<Boxes size={17} />}>
          <p>
            Next.js App Router. The browser holds no evidence logic beyond display: every record is
            built, signed and validated on the server, behind a single action endpoint.
          </p>
          <Code>{`Device adapters        lib/hardware/pramaan/*   (USB serial, PRAMAAN-1)
                       lib/hardware/client.ts   (Wi-Fi + demo device)
Domain                 lib/domain/records.ts    (build, hash, case + device chains)
                       lib/domain/verify.ts     (all checks)
                       lib/domain/certificate.ts
Server operations      lib/server/actions.ts    (capture, case, handoff, anchor, screening)
Storage                lib/store/store.ts       (append-only door, Postgres or file)
                       lib/store/db.ts          (shared Postgres + evidence_ledger)
API                    app/api/action|state|verify|proof|sensor`}</Code>
        </Section>

        <Section id="data" title="Data model" icon={<Database size={17} />}>
          <p>Every record carries both chain positions. The case chain is the one operators see.</p>
          <Code>{`record_id      REC-2026-00001
case_ref       CASE-2026-00421
type           trigger | field_test | screening_flag | handoff_transfer | handoff_receipt
device_id      EC-RPF-042
officer_id     RPF-104
claimed_time   device clock — untrusted
seq            position on the DEVICE chain
prev_hash      hash of previous record on that device
case_seq       position in the CASE chain, from 1
case_prev_hash hash of previous record in that case
payload        type-specific, canonicalised before hashing
payload_hash   SHA-256 over the canonical payload
signature      ECDSA P-256 (see Cryptography)
status         captured | queued | pushed | anchored
received_at    server ingest time
anchor_id      set once covered by an anchor`}</Code>
          <p>
            Records written before V2 have no case position. They keep their original hashes and
            signatures and are verified the way they were signed; the verifier counts them as
            predating per-case chaining rather than failing them.
          </p>
        </Section>

        <Section id="case" title="Case model" icon={<FileCode2 size={17} />}>
          <Code>{`createCase()                 opens an empty case, no records
capture*(case_ref)           appends at case_seq = highest + 1
                             refuses an unknown case_ref
appendRecord()               refuses duplicate ids, reused positions,
                             reused device sequences, unknown cases
verifyChain(case_ref)        walks only that case`}</Code>
          <p>
            There is no update or delete path for a committed record anywhere in the application. The
            single exception is the tamper demonstration, which edits stored data deliberately so the
            verifier can catch it, and is labelled DEMO / TRAINING wherever it appears.
          </p>
        </Section>

        <Section id="record" title="Record model" icon={<FileCode2 size={17} />}>
          <Code>{`telemetry          streamed, displayed, never stored as evidence
review             officer sees the reading and its source
confirm            officer confirms — only now is a record built
captured/queued    signed on the device, appended to case + device chains
pushed             server received it and re-checked signature and links
anchored           covered by a tree head both simulated TSAs signed
verified           any time: recomputed from stored data, never cached`}</Code>
          <p>
            Field-test results stay one of presumptive positive, presumptive negative or inconclusive.
            An inconclusive or not-tested outcome is never converted into a negative.
          </p>
        </Section>

        <Section id="crypto" title="Cryptography" icon={<KeyRound size={17} />}>
          <Code>{`payload_hash = SHA-256(canonical JSON of payload)
record_hash  = SHA-256(canonical record identity incl. case position)

signature v1 = ECDSA-P256( "v1|payload_hash|prev_hash|seq" )
signature v2 = ECDSA-P256( "v2|payload_hash|prev_hash|seq|case_ref|case_seq|case_prev_hash" )

Merkle       = RFC6962-style tree over server-log records
Anchor       = tree head signed by two SIMULATED time authorities`}</Code>
          <p>
            Keys are software keys held by the server and labelled &ldquo;Demo signatures&rdquo;
            throughout the interface. They are real ECDSA keys performing real signatures; they are
            not hardware-backed, and nothing in the build claims attestation.
          </p>
        </Section>

        <Section id="pramaan" title="PRAMAAN protocol" icon={<Cpu size={17} />}>
          <Code>{`Transport   USB serial, 115200 8N1, newline-delimited JSON
Protocol    PRAMAAN-1
Device      PRAMAAN-ESP32-001

device→host  device_hello | capabilities | telemetry | acquire | reset | error | pong
host→device  acquire | reset | identify | tare | ping

A value is shown only when the device reports that input as connected.
Missing inputs stay null. The potentiometer is reported as a simulated
temperature input; thermal_sensor is false on this hardware.`}</Code>
          <p>
            The link is only called connected after a valid identity message and telemetry. A port
            that opens but never speaks the protocol is reported as exactly that, with the raw lines
            available in Developer diagnostics.
          </p>
        </Section>

        <Section id="tte" title="TTE demo architecture" icon={<Network size={17} />}>
          <Code>{`TTE console (demo)  →  screening cue  →  operator review
                    →  screening_flag record  →  same case chain  →  RPF`}</Code>
          <p>
            No TTE hardware exists. The console generates seats and cues deterministically in the
            browser. A flag produces a genuine signed record whose payload carries{" "}
            <span className="mono">demo: true</span> and a note saying so, in a case opened for demo
            screening work. It shares the evidence core with every other record — there is no second
            store.
          </p>
        </Section>

        <Section id="storage" title="Offline sync and storage" icon={<Database size={17} />}>
          <p>
            Backend in this session:{" "}
            <span className="mono">{storage?.backend ?? "unknown"}</span> — {storage?.detail ?? "—"}.
          </p>
          <Code>{`DATABASE_URL set   shared Postgres, optimistic concurrency,
                   plus evidence_ledger with an insert-only trigger
not set, local     .data/evidence-store.json
not set, serverless  in memory per instance (labelled as such)

Clients poll /api/state?since=<revision> and download only on change.`}</Code>
        </Section>

        <Section id="verification" title="Verification" icon={<ShieldCheck size={17} />}>
          <Code>{`payload_hash        recomputed over the canonical payload
signature           v1 or v2 per record, against the device key
chain_linkage       per device
case_chain          per case: continuity, linkage, duplicates, gaps
merkle_inclusion    proof against the anchored tree head
merkle_consistency  anchored prefixes still reproduce
tsa_anchor          both simulated authorities
handoff             transfer and receipt agree`}</Code>
          <p>
            Scope is a case or the whole log. A failure names the record and, for case linkage, the
            position with expected and actual values.
          </p>
        </Section>

        <Section id="merkle" title="Merkle log" icon={<Boxes size={17} />}>
          <Code>{`leaf        SHA-256("00:" + record_hash)           domain-separated,
node        SHA-256("01:" + left + ":" + right)     RFC 6962 style
order       log_index — the order the server ACCEPTED records,
            never a device or server clock
inclusion   audit path from a record to the anchored root
consistency an earlier anchored root is a prefix of today's tree`}</Code>
          <p>
            Ordering by acceptance matters: if the log were sorted by time, a record with an odd
            timestamp could slide in front of history that was already anchored, and every later
            proof would fail. Records written before <span className="mono">log_index</span> existed
            keep their original ingest order and come first.
          </p>
        </Section>

        <Section id="anchoring" title="Timestamp anchoring" icon={<ShieldCheck size={17} />}>
          <Code>{`anchor      tree head (size, root) signed by TSA-01 and TSA-02
window      a record existed after its ingest time and before the
            anchor covering it — a bounded window, not an exact time
dual        both authorities confirmed → trusted-time window
single      one authority down → still verifies, marked degraded`}</Code>
          <p>
            Both time authorities are <strong>simulated</strong> in this build and are labelled so on
            every screen. Device time is shown as device time and is never treated as trusted.
          </p>
        </Section>

        <Section id="handoff" title="Handoff and certificates" icon={<FileCode2 size={17} />}>
          <Code>{`handoff_transfer   signed by the RPF officer on the RPF device
handoff_receipt    signed by the GRP officer on a DIFFERENT device,
                   refused unless its transfer exists
mismatch           counts or seals disagree — recorded, never hidden

certificate        Section 63 (BSA 2023) Part A from verified records,
                   SHA-256; Part B left blank for the expert`}</Code>
        </Section>

        <Section id="security" title="Security" icon={<ShieldCheck size={17} />}>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Private keys never leave the server; the browser receives the store with keys stripped.</li>
            <li>Every write goes through one append-only door that refuses duplicates and unknown cases.</li>
            <li>Serial input from PRAMAAN is parsed field by field; nothing received is executed.</li>
            <li>The PRAMAAN link is only called connected after the device identifies itself.</li>
            <li>
              TTE screening flags and readings from the in-browser demo device are marked demo inside
              their signed payloads. Records created by the Demo Mode scenarios are ordinary records in
              a prototype store: the whole dataset is synthetic, and the honesty strip says so.
            </li>
            <li>
              Not provided in this build: hardware-backed keys, device attestation, real RFC 3161
              authorities, or real identity checks at sign-in.
            </li>
          </ul>
        </Section>

        <Section id="deploy" title="Deployment" icon={<Boxes size={17} />}>
          <Code>{`npx vercel --prod          deploy (project: evidence-chain)
DATABASE_URL               set in Vercel to share one store across instances;
                           without it each instance keeps its own in-memory copy`}</Code>
          <p>
            Web Serial for PRAMAAN works from Chrome or Edge on a laptop, over https or on localhost.
          </p>
        </Section>

        <Section id="ops" title="Troubleshooting" icon={<Wrench size={17} />}>
          <Code>{`npm run dev        development server
npm run build      production build
npm run typecheck  TypeScript
npm run sim:esp32  Wi-Fi device simulator (legacy protocol)

Environment
DATABASE_URL / POSTGRES_URL   shared Postgres; unset uses local file`}</Code>
          <p>
            PRAMAAN needs Chrome or Edge on a laptop for Web Serial, and the port must not be held by
            another program such as the Arduino Serial Monitor. Firmware and wiring:{" "}
            <span className="mono">docs/PRAMAAN.md</span>.
          </p>
          <p>
            Current store: {store ? `${store.records.length} records across ${store.cases.length} cases` : "loading"}.
          </p>
        </Section>
      </div>
    </>
  );
}
