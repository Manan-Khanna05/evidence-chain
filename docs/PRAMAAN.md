# PRAMAAN — Evidence Integrity Hardware Device

PRAMAAN is the physical device that feeds live readings into the Evidence Chain
console over USB. This document covers the wiring, the serial protocol, how to
run it, and how to test each behaviour.

---

## 1. What the hardware actually has

| Component | Pin | What it provides |
|---|---|---|
| ESP32 | — | Runs the firmware, speaks USB serial at 115200 baud |
| Potentiometer | GPIO34 | **Simulated temperature input.** Turning the knob changes the temperature value |
| Load cell + amplifier | HX711 `DT` GPIO32, `SCK` GPIO33 (change in firmware to match your wiring) | Real weight in grams |
| OLED (SSD1306) | SDA GPIO21, SCL GPIO22, address `0x3C` | On-device readout |
| Switch 1 (right) | GPIO13 | **ACQUIRE** |
| Switch 2 (left) | GPIO2 | **RESET / next sequence** |
| Green LED | GPIO15 | Blinks when a reading has been ACQUIRED |
| Yellow LED | GPIO16 | Blinks when READY |
| Red LED | GPIO17 | Blinks briefly during RESET |

**There is no thermal imaging sensor.** The firmware reports
`thermal_sensor: false`, sends no thermal values, and the console displays
"Thermal sensor unavailable". The potentiometer is never described as a thermal
sensor anywhere in the UI or in a signed record.

### Device identity

- Device ID: `PRAMAAN-ESP32-001` — fixed, never randomly generated
- Firmware: `1.0.0`
- Protocol: `PRAMAAN-1`

---

## 2. State machine and LEDs

```
READY      (yellow blinking)
  │  right button = ACQUIRE
  ▼
ACQUIRED   (green blinking)
  │  left button = RESET
  ▼
RESETTING  (red blinking, 600 ms)
  │
  ▼
READY, sequence + 1
```

Exactly one LED is lit at a time. All blinking uses `millis()`; the loop never
blocks, and both buttons are debounced (40 ms) so one press is one event.

---

## 3. Serial protocol (PRAMAAN-1)

Newline-delimited JSON, one complete message per line, 115200 baud.

### Device → host

**On boot, and on `identify`:**
```json
{"type":"device_hello","protocol":"PRAMAAN-1","device_id":"PRAMAAN-ESP32-001","firmware":"1.0.0","capabilities":{"potentiometer":true,"load_cell":true,"thermal_sensor":false,"oled":true,"acquire_button":true,"reset_button":true}}
```

**Telemetry, every 250 ms:**
```json
{"type":"telemetry","device_id":"PRAMAAN-ESP32-001","seq":12,"temperature":42.7,"weight_g":183.4,"temperature_source":"potentiometer","weight_source":"load_cell","connected":{"potentiometer":true,"load_cell":true,"thermal_sensor":false},"state":"READY"}
```

**On ACQUIRE (physical button or host command):**
```json
{"type":"acquire","device_id":"PRAMAAN-ESP32-001","seq":12,"temperature":42.7,"weight_g":183.4,"temperature_source":"potentiometer","weight_source":"load_cell","event":"ACQUIRED"}
```

**After a reset completes:**
```json
{"type":"reset","device_id":"PRAMAAN-ESP32-001","seq":13,"event":"RESET"}
```

**On a device problem:**
```json
{"type":"error","device_id":"PRAMAAN-ESP32-001","code":"NO_LOAD_CELL","detail":"Load cell not available"}
```

An unavailable input is sent as `null`. A value is never invented.

### Host → device

```json
{"protocol":"PRAMAAN-1","type":"acquire"}
{"protocol":"PRAMAAN-1","type":"reset"}
{"protocol":"PRAMAAN-1","type":"identify"}
{"protocol":"PRAMAAN-1","type":"tare"}
```

### What the console does with a bad line

Every line is validated field by field. Non-JSON lines (ESP32 boot banners),
malformed JSON, unknown message types, out-of-range numbers and messages from a
different `device_id` are all rejected and written to the diagnostics log. None
of them can reach the UI or a record, and nothing received over serial is ever
executed.

---

## 4. Flashing the firmware

1. Open `firmware/pramaan-esp32/pramaan-esp32.ino` in the Arduino IDE.
2. Install libraries: **Adafruit SSD1306**, **Adafruit GFX**, and **HX711** (Bogdan Necula).
3. Set `PIN_HX711_DT` and `PIN_HX711_SCK` to match your amplifier wiring.
   If the load cell is not wired yet, set `ENABLE_LOAD_CELL` to `0`; the device
   then reports `load_cell: false` and the console shows weight as unavailable
   while everything else keeps working.
4. Board: your ESP32 board. Upload speed 115200.
5. Upload, then open the Serial Monitor at 115200 to confirm JSON lines appear.
   **Close the Serial Monitor before connecting from the browser** — only one
   program can hold the port.

### Calibrating the load cell

1. Remove all weight, upload, and let it tare on boot.
2. Place a known mass (say 100 g) and read `weight_g`.
3. `LOAD_CELL_SCALE_new = LOAD_CELL_SCALE_current × (reading ÷ known mass)`.
4. Update `LOAD_CELL_SCALE` and re-upload.

---

## 5. Connecting from the console

Web Serial needs **Chrome or Edge on a laptop** (it does not exist on iOS, and
a phone should use the Wi-Fi device instead).

1. Plug PRAMAAN in with the USB cable.
2. Open **Hardware**, or the **Device Status** card on the Dashboard.
3. Press **Connect PRAMAAN** and pick the PRAMAAN serial port
   (usually `CP210x`, `CH340` or `USB Serial`).
4. The badge turns **PRAMAAN ONLINE** once telemetry arrives.

**Reconnecting:** after the first time, **Reconnect last port** connects without
the port picker. Unplugging shows **PRAMAAN OFFLINE**; plugging back in and
pressing Connect resumes.

---

## 6. How each part works

### Live temperature
Turn the potentiometer. The Temperature card on **Hardware → Live Sensor Data**
updates several times a second and is labelled `Potentiometer / Simulated
temperature input`. The Thermal observation card stays "unavailable".

### Live weight
Press on the load cell. The Weight card updates and is labelled `Load Cell`.

### Acquire
Press the right button on PRAMAAN, or **ACQUIRE** in Operator Mode. Either way
the review sheet opens with the weight, the temperature and its source, and the
device sequence. Nothing is saved until the officer picks the case, colour, kit
and result, then confirms — the existing capture path, hashing and signing are
unchanged.

The software button asks PRAMAAN to take the reading so both sides capture the
same instant. If the device does not answer within 1.2 s, the latest telemetry
is used instead and the diagnostics log says so. One capture never produces two
records: an identical acquire within 2 s is ignored.

### Reset
Press the left button, or **RESET** in Operator Mode. The red LED blinks, the
sequence advances, and the device returns to READY.

### Manual fallback
Everything works with PRAMAAN unplugged. On the Field Test form, Ambient
temperature is labelled `MANUAL — typed by the operator`; when PRAMAAN is
connected, a **Use live reading** button copies the live value and the label
becomes `LIVE • PRAMAAN — source: potentiometer (simulated)`. Typing switches it
back to MANUAL. A live value never overwrites a typed one on its own.

### Offline detection
PRAMAAN is "online" while valid telemetry keeps arriving. After 3 seconds of
silence it is reported offline and the live values are cleared, so a stale
number can never look live. One missed packet does not flip the badge.

---

## 7. What gets recorded

A confirmed PRAMAAN capture writes this block inside the signed field-test
payload:

```json
{
  "source": "pramaan",
  "transport": "usb",
  "device_id": "PRAMAAN-ESP32-001",
  "firmware": "1.0.0",
  "acquisition_id": "PRAMAAN-14-1789876214112",
  "load_cell_g": 190.5,
  "load_cell_stable": true,
  "thermal_min_c": null,
  "thermal_max_c": null,
  "thermal_avg_c": null,
  "collector_installed": null,
  "temperature_c": 44.2,
  "temperature_source": "potentiometer",
  "weight_source": "load_cell",
  "capture_trigger": "device_button",
  "device_sequence": 14,
  "note": "PRAMAAN sampling instrumentation: load-cell weight and a potentiometer-simulated temperature input. No thermal imaging sensor is fitted. Not a chemical identification and not a detection."
}
```

The thermal fields stay null because no thermal sensor exists.
`collector_installed` is null because PRAMAAN has no collector microswitch —
null means "this device has no such part", which is not the same as "the
collector was missing". Everything above is hashed and signed with the rest of
the record, so a potentiometer reading can never later be presented as a
thermal measurement.

---

## 8. Developer diagnostics

**Hardware → Technical View → Developer diagnostics** shows the connection
state, device ID, protocol, firmware, device state, sequence, telemetry count
and age, the last event, the live values with their sources, and the serial log
including every rejected line with its reason.

During development you can also drive the whole integration without hardware
from the browser console (dev builds only):

```js
__pramaan.injectLine(JSON.stringify({type:"device_hello",protocol:"PRAMAAN-1",device_id:"PRAMAAN-ESP32-001",firmware:"1.0.0",capabilities:{potentiometer:true,load_cell:true,thermal_sensor:false,oled:true,acquire_button:true,reset_button:true}}))
__pramaan.injectLine(JSON.stringify({type:"telemetry",device_id:"PRAMAAN-ESP32-001",seq:1,temperature:42.7,weight_g:183.4,temperature_source:"potentiometer",weight_source:"load_cell",connected:{potentiometer:true,load_cell:true,thermal_sensor:false},state:"READY"}))
```

---

## 9. Troubleshooting

| What you see | What to do |
|---|---|
| Connect PRAMAAN is disabled | Use Chrome or Edge on a laptop; Web Serial is not available elsewhere |
| "The PRAMAAN port is already in use" | Close the Arduino Serial Monitor or another browser tab holding the port |
| "No device was selected" | Press Connect PRAMAAN again and choose the port |
| PRAMAAN OFFLINE while plugged in | Check the cable, then press the reset button on the ESP32; the boot banner is ignored automatically |
| Weight shows unavailable | The amplifier is not responding — check `DT`/`SCK` wiring, or set `ENABLE_LOAD_CELL 0` and use manual entry |
| Thermal sensor unavailable | Expected. No thermal sensor is fitted to this device |
| Values look wrong | Re-run the load-cell calibration in section 4 |
