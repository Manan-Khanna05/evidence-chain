# Evidence Chain — Phase 1 prototype

**Structured evidence capture for railway narcotics events.**
A court-facing evidence-chain console for the RPF → GRP custody seam, built to the
Phase-1 scope in [`docs/SIH2026_Implementation_Plan.pdf`](docs/) and
[`docs/SIH2026_Phase1_Evidence_Report.md`](docs/SIH2026_Phase1_Evidence_Report.md).

This is a **working interactive prototype**, not a mockup. Every hash, signature,
Merkle root and anchor token you see was computed by this build.

```bash
npm install
npm run dev          # http://localhost:3000
```

Sign in with any demo login on `/login` (RPF, GRP or Verifier). The evidence store
seeds itself on first run into `.data/evidence-store.json`.

---

## What it records

Three record types, and only three:

| Record | What it is |
|---|---|
| **s.43 trigger** | What caused the stop: place, device, sensor output, referral tier, officer action and — crucially — the outcome, including when nothing was recovered. |
| **Presumptive field test** | Reagent, manufacturer, lot, expiry, operator, ambient conditions, observed colour from a fixed vocabulary, the reference table matched against, and a machine-readable presumptive-only flag. |
| **RPF → GRP custody handoff** | A transfer record signed by the transferring officer and a receiving receipt signed by the receiving officer on a different device, with sample count and seal state carried across and compared. |

## The claim, and the limit

The claim: the record of what happened is structured, signed, chained,
time-bounded and independently verifiable.

The limit, stated on every relevant screen: **integrity verification does not
establish chemical identification.** A colour test screens; it does not identify.
Nothing in this product prints "confirmed", "identified" or "drug detected",
because a presumptive test cannot support those words.

---

## What is real in this build

- **SHA-256** over deterministically canonicalised payloads (`lib/crypto/hash.ts`).
  Key order is irrelevant: the same payload always produces the same hash.
- **Real ECDSA P-256 signatures** over `payload_hash + prev_hash + seq`, via Web
  Crypto (`lib/crypto/keys.ts`).
- **A per-device hash chain.** Each record carries the hash of the previous record
  on the same device; sequence numbers are monotonic per device.
- **A Merkle history tree** with RFC 6962-style domain separation, real inclusion
  proofs and real consistency checks (`lib/crypto/merkle.ts`).
- **A verifier** that re-walks the chain from stored data and names the first
  broken record (`lib/domain/verify.ts`). It runs against the live store.
- **Bounded trusted time.** Records are dated to the interval
  `[previous anchor, this anchor]`, never to an instant.
- **A Section 63 Schedule certificate**, exported as a real PDF with Part A
  auto-filled and Part B left blank.

## What is simulated, and labelled as simulated

Every one of these is disclosed in the interface, permanently, in the strip under
the top bar and again wherever it matters.

| Component | Reality in this build | Production target |
|---|---|---|
| **Sensor** | `MockSensorAdapter` returning scripted readings from `lib/sensor/mock_readings.ts`. There is no ion-mobility spectrometer and none is claimed. | `SerialSensorAdapter` behind the same interface — one config line. |
| **Signing key** | Software ECDSA P-256 key held by the server process. Labelled **DEMO SIGNATURE** everywhere. | Android Keystore key, StrongBox where the handset has a secure element, with an attestation certificate chain read at ingest. |
| **Attestation** | None. The device page shows "Not attested in this build" against the production target rather than asserting a security level. | Key attestation with Verified Boot state; a self-reported level is a claim by the software whose integrity is in question. |
| **Timestamp authorities** | Two **SIMULATED TSAs** signing locally with demo keys. Nothing contacts a real RFC 3161 service. | Two independent RFC 3161 authorities in different trust domains. Only a hash ever leaves either way. |
| **Storage** | A JSON file at `.data/evidence-store.json`, behind a repository module. | PostgreSQL, append-only with an insert-only trigger. |
| **Identity** | No credential is checked. | Out of Phase-1 scope. |

---

## Deliberately not built

Each was tested against the evidence and cut. Removing them is a finding, not a gap.

- **Thermal imaging for concealment** — rail-specific work says thermal cannot
  detect concealed objects; that needs millimetre-wave sensing.
- **Behavioural anomaly CCTV** — four meta-analyses over 400+ studies put
  behavioural deception detection at roughly chance, and no video benchmark
  contains a concealed-contraband class.
- **Predictive patrol routing** — published trials ran at division scale on
  hundreds of thousands of incidents; one station cannot train it, and training on
  your own drug stops is a feedback loop.
- **A three-node Hyperledger Fabric network** — its default ordering service is
  crash-fault-tolerant, not Byzantine, so two of three defeats it. India's own
  eSakshya chose hash-plus-immutable-storage, not a ledger.
- **Maps, heatmaps, live alert feeds, probability scores.** A referral tier is not
  a probability. The sentence never to say is *73% anomaly at Coach S4*; the
  sentence to say is *tier-2 referral, confirmatory step pending*.

---

## Routes

| Route | What it is |
|---|---|
| `/login` | Officer sign-in with RPF / GRP / Verifier demo logins. |
| `/dashboard` | Evidence-chain integrity across all cases, trusted-time summary, operational counts, what requires action. |
| `/cases` | Searchable, filterable case list. |
| `/cases/[caseRef]` | The evidence dossier: timeline, hash chain, handoff, verification, bounded time, certificate. |
| `/capture/trigger` | s.43 trigger capture with auto-populated mock sensor output. |
| `/capture/field-test` | Presumptive field-test capture with controlled vocabularies. |
| `/queue` | Offline queue and the captured → queued → pushed → anchored pipeline. |
| `/handoff` | RPF → GRP transfer and receipt, with a two-device toggle. |
| `/verification` | The verifier, the individual checks, and the tamper demonstration. |
| `/projector` | Large-format verdict for a projector. |
| `/certificate` · `/certificate/[caseRef]` | Section 63 Schedule certificate: view, hash check, PDF export. |
| `/settings/device` | Device identity, key and attestation reality vs. target, sensor adapter, storage. |
| `/operator` | Operator Mode — one screen, one decision, for the officer on the platform. |
| `/hardware` | ESP32-S3 gateway: link, sensor health, live force and thermal field, calibration. |
| `/demo` | The six-minute demonstration, in order, with every control that drives it. |

## Layout

```
app/                 routes (App Router) + /api route handlers
components/ui/       design primitives and the shared status vocabulary
components/layout/   the console shell (sidebar + railway hero band)
components/brand/    logo, banner artwork, India silhouette, integrity shield
components/providers/ client state, actions and toasts
features/            record drawer, timeline, chain view, handoff, certificate, verifier,
                     dashboard evidence-flow
lib/hardware/        evidence-chain-v1 protocol + Wi-Fi/USB/demo transports
firmware/            ESP32-S3 Arduino sketch
tools/esp32-simulator/  protocol-identical device for testing without a board
lib/crypto/          canonicalisation, SHA-256, ECDSA, Merkle tree
lib/domain/          record schema, status derivation, verification, certificate
lib/sensor/          SensorAdapter interface + MockSensorAdapter
lib/server/          server-side workflow operations
lib/store/           repository + seed data
docs/                the source research and plans this was built from
docs/design/         the visual reference and the banner source artwork
public/images/       banners.png — railway masthead + India pledge band
```

## Hardware

An ESP32-S3 gateway instruments the sampling act and feeds the field-test
record. Full pin map, protocol, build sheet and demo script:
[](docs/HARDWARE.md).

\
> evidence-chain@0.1.0 sim:esp32
> node tools/esp32-simulator/server.mjs
| Sensor | Measures | Feeds |
|---|---|---|
| NAU7802 + 1 kg load cell | Force applied while collecting the swab |  |
| MLX90640 | 32x24 temperature field |  (a required field-test field) |
| Microswitch | Collector fitted or not |  |

None of them identifies a substance and none produces a referral tier. The board
has no clock: it reports uptime, and records are bound to time by the existing
anchoring path. Telemetry synchronises automatically; **an evidence record never
does** — an officer reviews the acquisition and confirms it, and the record is
then written through the same  path as any other, so the
hash chain is untouched.

Every record carries  inside its signed payload:
 for a real board,  for the in-browser device or any
device id beginning  / .

## Hardware

**PRAMAAN** is the evidence integrity device: an ESP32 with a load cell (weight),
a potentiometer used as a simulated temperature input, an OLED, ACQUIRE/RESET
buttons and status LEDs. It connects over USB serial (115200 baud, newline-delimited
JSON, protocol `PRAMAAN-1`) and its readings populate the field-test record after the
officer reviews and confirms them. There is no thermal imaging sensor, and the console
shows thermal observation as unavailable rather than inventing values.
Wiring, protocol, flashing, calibration and tests: [`docs/PRAMAAN.md`](docs/PRAMAAN.md).

The earlier ESP32-S3 Wi-Fi gateway still works alongside it —
full pin map and protocol: [`docs/HARDWARE.md`](docs/HARDWARE.md).

```bash
npm run sim:esp32     # protocol-identical device, no board required
```

| Sensor | Measures | Feeds |
|---|---|---|
| NAU7802 + 1 kg load cell | Force applied while collecting the swab | `hardware.load_cell_g` |
| MLX90640 | 32×24 temperature field | `ambient_temperature_c` — already a required field-test field |
| Microswitch | Whether the collector is fitted | `hardware.collector_installed` |

None of them identifies a substance, and none produces a referral tier. The board
has no clock: it reports uptime only, and records are bound to time by the
existing anchoring path.

Telemetry synchronises automatically. **An evidence record never does** — an
officer reviews the acquisition and confirms it, and the record is then written
through the same `captureFieldTest` path as any other, so the hash chain,
signature and Merkle tree are untouched.

Every record carries `hardware.source` inside its **signed** payload: `"esp32"`
for a real board, `"demo"` for the in-browser device or any device id beginning
`EC-SIM` / `EC-DEMO`. Over Wi-Fi a simulator is wire-identical to a board, so
identity is what separates them.

Links are tried in order: remembered address → `192.168.4.1` →
`evidence-chain.local` → an already-permitted serial port → offline. Demo
hardware is never entered silently; it is a button.

## Design system

Premium light glass: warm ivory ground, white translucent cards, soft blue accents,
emerald verification, amber warning, coral failure, lavender for anything simulated.

Tokens live in `tailwind.config.ts` and `app/globals.css` and are referenced by
name everywhere, so the palette is changed in one place rather than per screen.

| Token | Role |
|---|---|
| `ink-900` · `ink-850` | page canvas (ivory) · raised cream (sidebar) |
| `ink-800` | card fill — used with `/75`–`/88` for glass |
| `ink-750` · `ink-700` | hover · pressed insets |
| `line` · `line-strong` | warm hairline · cooler control border |
| `fg` · `fg-muted` · `fg-dim` | deep navy text · secondary · metadata |
| `brand` · `brand-deep` · `brand-soft` | royal blue · navy headings · tinted fill |
| `ok` `warn` `danger` `info` `sim` | emerald · amber · coral · blue · lavender |
| `saffron` · `india` | the hairline tricolour accent only |

Shared components: `Panel`/`GlassCard`, `PanelHead`, `PageHeader`, `Button`,
`ButtonLink`, `Pill`, `StatusDot`, `IconContainer`, `Stat` (KPI card),
`QuickAction`, `ProgressRail`, `HashChip`, `KeyValue`, `Callout`,
`SimulatedNote`, `EmptyState`, `SectionLabel`, `EvidenceFlow`, `Field`,
`TextInput`, `Select`, `TextArea`, `OptionGroup`.

Icons are Lucide throughout, human-scaled — 16px metadata, 17–19px navigation and
actions, 21–23px card and workflow nodes — and always sit in a soft rounded
`IconContainer` rather than floating loose.

### Imagery

The railway masthead and the "Integrity today / A safer India tomorrow" pledge
band are one local asset sheet, `public/images/banners.png` (2172 × 724): the
hero occupies y 0–360 and the pledge band y 369–719. `components/brand/marks.tsx`
shows each by scaling the sheet to the container and offsetting it, so there is
one request, no cropping step, and replacing the artwork updates both.

The masthead artwork carries its own title, subtitle and Sign/Chain/Anchor/Verify/
Secure row, so at `lg` and above those are not drawn again — the live heading is
`sr-only` for screen readers. Below `lg` the same sheet is shown zoomed to the
locomotive and the live heading renders over a scrim, so nothing becomes
unreadable on a phone. The logo, India outline and integrity shield remain inline
SVG. Nothing reaches an external URL.

## The six-minute demo

Open `/demo` and follow it, or run it by hand:

1. **Go offline**, capture a trigger. The reading and tier come from the mock
   adapter; the officer never types them. The record signs and queues.
2. **Run the field test.** Reagent, lot, expiry, observed colour from the
   dropdown. The record prints *Presumptive — not a chemical identification*.
3. **Reconnect.** The queue drains in sequence and the tree head goes to two
   simulated authorities. The record now reads *created between 14:02 and 14:19*,
   not *created at 14:07*.
4. **Hand off.** RPF signs the transfer on Device A; GRP signs the receipt on
   Device B. Sample count and seal state are compared, not copied.
5. **Export the certificate.** Section 63 Schedule, Part A auto-filled, SHA-256
   ticked, Part B blank.
6. **Cheat.** Simulate tampering, re-run the verifier: it goes red and names the
   record. Restore, and it goes green.

Then say the limit out loud. Naming your own limit is what makes the rest of it
credible.

`Reset demo` on `/demo` rebuilds the seed from scratch — new keys, new signatures,
freshly computed hashes, roots and anchors — so the demo can be run repeatedly.

## Seeded cases

All synthetic. No real person, officer, device, station or seizure is represented.

| Case | State |
|---|---|
| `CASE-2026-00421` | Full chain, dual-anchored, two-party handoff verified, certificate generated. Interval 14:02–14:19. |
| `CASE-2026-00422` | Transfer signed, awaiting the GRP receipt. Expired reagent lot on the field test. |
| `CASE-2026-00423` | A row was altered in storage after ingest. The verifier catches it and the handoff shows a transfer mismatch. |
| `CASE-2026-00424` | Trigger only, nothing recovered — negatives are recorded. |
| `CASE-2026-00425` | Captured offline, still queued on the device, time unproven. |
| `CASE-2026-00426` | Anchored and handed off; certificate not yet generated. |

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # tsc --noEmit
```
