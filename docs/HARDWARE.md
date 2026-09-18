# Hardware — ESP32-S3 evidence gateway

Build sheet, pin map, protocol and demo procedure for the Evidence Chain field
device.

---

## What the hardware is for — read this first

The board instruments **the sampling act**, not the substance.

| Sensor | What it measures | What it does **not** do |
|---|---|---|
| NAU7802 + 1 kg load cell | Force applied while collecting the swab | Identify anything |
| MLX90640 | A 32×24 temperature field around the sampling area | Detect narcotics, concealment or people |
| Microswitch | Whether the collector is fitted | — |

This matters legally, not just rhetorically. The Bombay High Court in *Sagar
Parshuram Joshi* found a field test indefensible because nothing recorded **how**
it was performed. `ambient_temperature_c` is already a required field on the
field-test record; this board fills it from a real instrument instead of a typed
guess, and adds the force and collector state alongside it.

The board emits **no referral tier, no probability and no detection**. If a
future board gains a trace detector, that is a new field and a new claim.

---

## Bill of materials

Everything below is already on hand. Nothing else is needed — no enclosure, no
fasteners, no custom PCB, no perfboard.

| Qty | Item |
|---|---|
| 1 | ESP32-S3 DevKitC-1 (or equivalent S3 board) |
| 1 | Data-capable USB-C cable |
| 1 | NAU7802 load-cell ADC breakout |
| 1 | 1 kg four-wire load cell |
| 1 | MLX90640 thermal array |
| 1 | Normally-open microswitch |
| 2 | Momentary push buttons (ACQUIRE, RESET) |
| 3 | LEDs — green, amber, red |
| 3 | 1 kΩ resistors |
| 1 | Sunboard base |
| 3–4 | Spare PCB boards for mounting/interconnect |
| 1 | Jumper wire set |
| 1 | USB power bank |
| 4–6 | Known calibration masses |
| 1 | Multimeter |

---

## Pin map

ESP32-S3 DevKitC-1. These pins avoid USB D+/D− (19/20), the flash and PSRAM
lines (26–32) and the strapping pins (0/3/45/46).

| Signal | GPIO | Wiring |
|---|---|---|
| I²C SDA | **8** | NAU7802 SDA **and** MLX90640 SDA (shared bus) |
| I²C SCL | **9** | NAU7802 SCL **and** MLX90640 SCL |
| Collector switch | **4** | NO microswitch → GND. `INPUT_PULLUP`; **LOW = fitted** |
| ACQUIRE button | **5** | Button → GND. `INPUT_PULLUP`, falling edge |
| RESET / ACK button | **6** | Button → GND. `INPUT_PULLUP`, falling edge |
| Green LED (Ready) | **15** | GPIO → 1 kΩ → LED anode, cathode → GND |
| Amber LED (Recording) | **16** | GPIO → 1 kΩ → LED anode, cathode → GND |
| Red LED (Fault) | **17** | GPIO → 1 kΩ → LED anode, cathode → GND |

**Power.** Both breakouts run from the board's **3V3** rail and share **GND**.
The two I²C devices have different addresses (NAU7802 `0x2A`, MLX90640 `0x33`)
so they coexist on one bus with no address conflict.

**Load cell → NAU7802** (four-wire):

| Load cell | NAU7802 |
|---|---|
| Red (E+) | VIN+ / E+ |
| Black (E−) | VIN− / E− |
| White (A−) | IN− |
| Green (A+) | IN+ |

If the reading runs backwards, swap **green** and **white** — do not "fix" it in
software.

**Check before powering on** with the multimeter: continuity GND↔GND, 3V3 present
and ~3.3 V, no short between 3V3 and GND, and each button reading open until
pressed.

---

## Physical build (Sunboard, ~45 minutes)

Layered, not enclosed. The goal is a purposeful prototype, not a product.

```
        ┌──────────────────────────────────┐
        │  MLX90640  (front edge, facing    │   ← thermal looks at the
        │             the sampling area)    │      sampling area
        ├──────────────────────────────────┤
        │  ESP32-S3  │  NAU7802             │   ← centre, on spare PCBs
        │            │                      │      double-sided taped down
        ├────────────┴─────────────────────┤
        │  [ACQUIRE]   [RESET]   ● ● ●     │   ← side rail, LEDs beside them
        ├──────────────────────────────────┤
        │  Load cell + collector + switch   │   ← sampling area
        ├──────────────────────────────────┤
        │  USB power bank                   │   ← bottom
        └──────────────────────────────────┘
             Phone sits in front, propped
```

1. Cut one Sunboard base roughly 200 × 150 mm.
2. Tape the spare PCBs down as mounting platforms; mount the ESP32 and NAU7802
   on them so nothing sits directly on the Sunboard.
3. Cantilever the load cell: bolt-free is fine — sandwich one end between two
   Sunboard offcuts taped down, leave the other end free to deflect.
4. Mount the microswitch so fitting the collector presses it closed.
5. Route wires along the edges with tape or zip ties; keep I²C runs short.
6. Label every block with printed labels: `ESP32-S3`, `MLX90640`, `LOAD CELL`,
   `NAU7802`, `ACQUIRE`, `RESET`, `STATUS`, `USB`, `POWER`.
7. Cream Sunboard, navy labels, one blue accent strip, small Evidence Chain
   logo. It should read as deliberate.

---

## Firmware

`firmware/evidence-chain-esp32/evidence-chain-esp32.ino`

**Arduino IDE setup**

- Board: **ESP32S3 Dev Module**
- **USB CDC On Boot: Enabled** (required for serial over the native USB port)
- Upload speed 921600

**Libraries** (Library Manager):

| Library | Author |
|---|---|
| ArduinoJson 7.x | Benoit Blanchon |
| Adafruit NAU7802 Library | Adafruit |
| Adafruit MLX90640 | Adafruit |
| ESPAsyncWebServer | esp32async |
| AsyncTCP | esp32async |

If the async web libraries will not install in time, set `#define ENABLE_WIFI 0`
at the top of the sketch. The board then builds with **zero third-party web
dependencies** and demos entirely over USB serial. That is the fallback that
always works.

**On boot** the board runs a lamp test (all three LEDs for 400 ms), brings up
I²C, probes both sensors, restores the saved calibration from NVS, starts the
access point and emits a `hello`.

---

## Links

### Wi-Fi (primary)

The board is its own access point — no router and no internet needed.

- SSID `EvidenceChain-EC-RPF-042`, password `evidence2026`
- Address `192.168.4.1`

| Method | Path | Purpose |
|---|---|---|
| GET | `/device`, `/status` | Identity, firmware, sensor health |
| GET | `/sensor` | One telemetry frame |
| GET | `/frame` | Full 32×24 thermal field |
| POST | `/acquire` | Trigger an acquisition |
| POST | `/reset` | Reset the device session |
| POST | `/tare` | Zero the load cell |
| POST | `/calibrate` | `known_mass_g` form field |
| WS | `/ws` | Live telemetry + commands |

All responses carry `Access-Control-Allow-Origin: *` so the browser can reach
them. **Serve the console over `http://`, not `https://`** — a secure page
cannot open a plain `ws://` socket to the board.

### USB serial (fallback)

115200 baud, one JSON object per line, in both directions. Uses **Web Serial**,
which needs Chrome or Edge on desktop and a click to pick the port. No libraries
required on the board side.

### Priority

The console tries, in order: **remembered address → 192.168.4.1 →
evidence-chain.local → an already-permitted serial port → offline**. Demo
hardware is never entered silently; it is a button.

---

## Protocol — `evidence-chain-v1`

Telemetry, 10 Hz:

```json
{ "protocol":"evidence-chain-v1", "type":"telemetry",
  "device_id":"EC-RPF-042", "seq":102, "uptime_ms":184320, "status":"READY",
  "sensors":{ "load_cell_g":142.0, "load_cell_stable":true,
              "thermal":{"min_c":29.8,"max_c":34.2,"avg_c":31.6},
              "collector_installed":true } }
```

Acquisition, on button press:

```json
{ "protocol":"evidence-chain-v1", "type":"acquisition",
  "device_id":"EC-RPF-042", "acquisition_id":"ACQ-H001", "uptime_ms":184500,
  "collector_ok":true,
  "sensors":{ "load_cell_g":142.0, "load_cell_stable":true,
              "thermal":{"min_c":29.8,"max_c":34.2,"avg_c":31.6},
              "collector_installed":true } }
```

Also: `hello`, `ack`, `fault`. Commands host → device: `acquire`, `reset`,
`tare`, `calibrate`, `identify`.

**No wall-clock time.** The board has no RTC and no NTP. It reports `uptime_ms`
and `has_rtc: false`; records are bound to trusted time by the existing
anchoring path, exactly like every other record.

Anything malformed, or from another protocol version, is dropped by
`lib/hardware/protocol.ts` rather than becoming half a reading on screen.

---

## LEDs

| LED | Meaning | Mirrored in software |
|---|---|---|
| 🟢 Green | Electronics ready | Operator + Hardware screens |
| 🟡 Amber | Acquiring / pending confirmation | same |
| 🔴 Red | Fault latched | same |

The on-screen lamps mirror the physical ones, so the demo reads at a glance from
either the board or the phone.

---

## Load-cell calibration

Hardware → *Load-cell calibration*. Stored in NVS; it survives a power cycle.

1. Remove all load → **Tare**.
2. Place a known mass.
3. Enter that mass in grams → **Calibrate**.
4. Verify with a *different* known mass.

`grams = (raw − offset) / scale`. Uncalibrated, the board reports a provisional
scale and the console shows it as such.

---

## The evidence rule

Telemetry synchronises automatically. **An evidence record never does.**

```
sensor reading → host receives → officer sees it
      → officer presses ACQUIRE (or the physical button)
      → acquisition snapshot
      → officer REVIEWS and CONFIRMS
      → field-test record: hashed, signed, chained, queued
      → pushed and anchored when connectivity returns
```

The confirmation step is not decoration. An officer supplies the three things no
sensor can — reagent kit, observed colour, result — and the record is written
through the same `captureFieldTest` path as any other, so the hash chain,
signature and Merkle tree are untouched.

If the collector was not fitted, the record is **not** suppressed: the fact is
recorded, shown in red, and the officer must tick an acknowledgement before
confirming.

### Real vs simulated

Every record carries `hardware.source` inside its **signed** payload:

- `"esp32"` — a real board
- `"demo"` — the in-browser demo device, **or** any device whose id begins
  `EC-SIM` / `EC-DEMO`

That last rule matters: over Wi-Fi a simulator is wire-identical to a board, so
identity decides. A simulator reading can never be recorded as a real one.

---

## Development simulator

Proves the whole pipeline without the board, and is the fallback if the hardware
misbehaves on the day.

```bash
npm run sim:esp32          # http://127.0.0.1:8080
```

Set the board address on the Hardware screen to `127.0.0.1:8080`. Keys while it
runs: `a` acquire · `c` toggle collector · `f` raise fault · `r` reset · `q` quit.

It reports `device_id: EC-SIM-001`, so anything it produces is recorded as
simulated.

---

## Pre-demo checklist

Electrical

- [ ] 3V3 and GND continuity; no 3V3↔GND short
- [ ] Lamp test runs on boot (all three LEDs, 400 ms)
- [ ] Green LED settles on
- [ ] ACQUIRE button fires an acquisition
- [ ] RESET button clears state
- [ ] Red LED lights on a forced fault
- [ ] Load cell tracks a known mass
- [ ] Collector switch toggles with the collector

Link

- [ ] Board AP visible, phone joined
- [ ] `http://192.168.4.1/device` returns JSON in a browser
- [ ] Console auto-connects with no page refresh
- [ ] Power-cycle the board mid-session → it reconnects by itself
- [ ] USB fallback opens from Chrome/Edge desktop

Evidence

- [ ] Acquire → review → confirm writes a record
- [ ] Record carries real `load_cell_g` and `thermal_avg_c`
- [ ] Offline acquire queues; reconnect pushes; anchor covers it
- [ ] Verification passes with the hardware record in the chain
- [ ] Tamper breaks it and names the record; restore returns it
- [ ] Certificate still generates and exports

---

## Demo, 90 seconds

1. **Power on.** Lamp test, then green. *"The electronics are ready."*
2. **Open the console** on the phone. It finds the board by itself:
   `Hardware connected · EC-RPF-042`. Nobody pressed sync.
3. **Show the live readings** — force, thermal field, collector state.
   *"None of this identifies a substance. It records how the sample was taken."*
4. **Fit the collector.** The microswitch flips to `Fitted`.
5. **Press the physical ACQUIRE button.** Amber lights; the phone reacts at once.
6. **Review** — the officer sees exactly what was measured.
7. **Confirm.** *Signed · chained · saved.*
8. **Switch the console offline.** Acquire again → `1 record queued`.
9. **Back online.** It pushes and anchors by itself.
10. **Verification** → `CHAIN VERIFIED`.
11. **Tamper** → `CHAIN BROKEN`, record named. **Restore** → verified.

Then say the limit out loud: *this does not make a field test correct. It makes
how the test was performed legible to a court.*

---

## If something breaks

| Symptom | Do this |
|---|---|
| Web libraries will not install | `#define ENABLE_WIFI 0`, demo over USB |
| Wi-Fi flaky in the hall | Connect USB — same protocol, no libraries |
| MLX90640 dead | Thermal shows "unavailable"; force and collector keep working |
| Load cell dead | Reported as unavailable; the console stays usable |
| No board at all | *Use demo hardware* — labelled simulated on every record |

Nothing here degrades into a fake reading. Each fallback is visible.
