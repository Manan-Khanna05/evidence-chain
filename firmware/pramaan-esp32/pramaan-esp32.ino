/*
 * PRAMAAN — Evidence Integrity Hardware Device
 * Firmware 1.0.0 · protocol PRAMAAN-1 · ESP32
 *
 * Speaks newline-delimited JSON over USB serial at 115200 baud to the
 * Evidence Chain console.
 *
 * WHAT THIS DEVICE ACTUALLY HAS
 *   Potentiometer  GPIO34  — SIMULATED temperature input. It is not a thermal
 *                            sensor, and every message says so through
 *                            "temperature_source": "potentiometer".
 *   Load cell      HX711-style amplifier (pins below) — real weight in grams.
 *   OLED           SSD1306 128x64, I2C 0x21/0x22, address 0x3C.
 *   Switch 1       GPIO13 — ACQUIRE (right button).
 *   Switch 2       GPIO2  — RESET / next sequence (left button).
 *   LEDs           green GPIO15, yellow GPIO16, red GPIO17.
 *
 * There is NO thermal imaging sensor. capabilities.thermal_sensor is false and
 * no thermal values are ever sent. A component that is absent or not
 * responding is reported as unavailable with a null value — never a made-up
 * number.
 *
 * STATE MACHINE
 *   READY      yellow blinks   → ACQUIRE  → ACQUIRED
 *   ACQUIRED   green blinks    → RESET    → RESETTING
 *   RESETTING  red blinks      → (600 ms) → READY, sequence + 1
 * Exactly one LED is ever active, and all blinking is millis()-based so the
 * loop never blocks.
 *
 * LIBRARIES (Arduino Library Manager)
 *   Adafruit SSD1306, Adafruit GFX      — OLED
 *   HX711 by Bogdan Necula (optional)   — load cell amplifier
 * Build without the load cell by leaving ENABLE_LOAD_CELL at 0: the device
 * then reports load_cell:false and weight_g:null, and the console shows the
 * weight as unavailable while everything else keeps working.
 */

#include <Arduino.h>
#include <Wire.h>

/* ----------------------------------------------------------- build flags */
#define ENABLE_OLED       1
#define ENABLE_LOAD_CELL  1   /* set to 0 if the amplifier is not wired yet */

/* ------------------------------------------------------------ identity */
static const char *DEVICE_ID = "PRAMAAN-ESP32-001";   /* stable, never random */
static const char *FIRMWARE  = "1.0.0";
static const char *PROTOCOL  = "PRAMAAN-1";

/* ---------------------------------------------------------------- pins */
static const int PIN_POT        = 34;   /* ADC1_CH6, input only */
static const int PIN_SW_ACQUIRE = 13;   /* Switch 1 — right button */
static const int PIN_SW_RESET   = 2;    /* Switch 2 — left button  */
static const int PIN_LED_GREEN  = 15;
static const int PIN_LED_YELLOW = 16;
static const int PIN_LED_RED    = 17;
static const int PIN_OLED_SDA   = 21;
static const int PIN_OLED_SCL   = 22;
static const uint8_t OLED_ADDR  = 0x3C;

/* Load-cell amplifier. CHANGE THESE TWO TO MATCH YOUR WIRING. */
static const int PIN_HX711_DT  = 32;
static const int PIN_HX711_SCK = 33;
/* Raw counts per gram, from calibration. See docs/PRAMAAN.md. */
static const float LOAD_CELL_SCALE = 420.0f;

/* -------------------------------------------------------------- timing */
static const unsigned long TELEMETRY_MS   = 250;  /* 4 Hz: live, not a flood */
static const unsigned long DEBOUNCE_MS    = 40;
static const unsigned long RESET_HOLD_MS  = 600;
static const unsigned long BLINK_MS       = 400;

/* -------------------------------------------------------- temperature */
/*
 * The potentiometer is mapped to a plausible ambient range purely so the demo
 * has a number to move. It measures a knob position, nothing else.
 */
static const float TEMP_MIN_C = 15.0f;
static const float TEMP_MAX_C = 60.0f;

/* --------------------------------------------------------------- OLED */
#if ENABLE_OLED
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
static Adafruit_SSD1306 display(128, 64, &Wire, -1);
#endif
static bool oledOk = false;

/* ----------------------------------------------------------- load cell */
#if ENABLE_LOAD_CELL
#include <HX711.h>
static HX711 scale;
#endif
static bool loadCellOk = false;

/* --------------------------------------------------------------- state */
enum DeviceState { STATE_READY, STATE_ACQUIRED, STATE_RESETTING };
static DeviceState state = STATE_READY;

static long  sequence = 1;                 /* the working sequence number   */
static unsigned long lastTelemetry = 0;
static unsigned long resetStartedAt = 0;
static unsigned long lastBlink = 0;
static bool blinkOn = false;

/* Debounce, per button. Buttons are wired to ground with INPUT_PULLUP. */
struct Button {
  int pin;
  bool stable;          /* debounced level: true = released                 */
  bool lastRead;
  unsigned long changedAt;
};
static Button btnAcquire = { PIN_SW_ACQUIRE, true, true, 0 };
static Button btnReset   = { PIN_SW_RESET,   true, true, 0 };

/* Incoming command line from the host. */
static String rxLine;

/* ------------------------------------------------------------- helpers */

static bool buttonPressed(Button &b) {
  const bool level = digitalRead(b.pin) == HIGH;   /* HIGH = released */
  const unsigned long now = millis();
  if (level != b.lastRead) {
    b.lastRead = level;
    b.changedAt = now;
  } else if (now - b.changedAt > DEBOUNCE_MS && level != b.stable) {
    b.stable = level;
    if (!level) return true;                       /* falling edge = press  */
  }
  return false;
}

static void ledsOff() {
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_RED, LOW);
}

/* One LED per state, blinked without blocking. */
static void serviceLeds() {
  const unsigned long now = millis();
  if (now - lastBlink >= BLINK_MS) {
    lastBlink = now;
    blinkOn = !blinkOn;
  }
  ledsOff();
  const int pin = state == STATE_READY     ? PIN_LED_YELLOW
                : state == STATE_ACQUIRED  ? PIN_LED_GREEN
                                           : PIN_LED_RED;
  digitalWrite(pin, blinkOn ? HIGH : LOW);
}

static const char *stateName() {
  switch (state) {
    case STATE_READY:     return "READY";
    case STATE_ACQUIRED:  return "ACQUIRED";
    default:              return "RESETTING";
  }
}

/* ------------------------------------------------------------ readings */

/* Returns NAN when the input is unavailable. NAN is sent as JSON null. */
static float readTemperatureC() {
  const int raw = analogRead(PIN_POT);            /* 0..4095 on the ESP32 */
  if (raw < 0) return NAN;
  return TEMP_MIN_C + (TEMP_MAX_C - TEMP_MIN_C) * (raw / 4095.0f);
}

static float readWeightG() {
#if ENABLE_LOAD_CELL
  if (!loadCellOk || !scale.is_ready()) return NAN;
  return scale.get_units(3);
#else
  return NAN;
#endif
}

/* ------------------------------------------------------------ JSON out */

static void printNumberOrNull(float v, int decimals) {
  if (isnan(v)) Serial.print("null");
  else Serial.print(v, decimals);
}

static void sendHello() {
  Serial.print(F("{\"type\":\"device_hello\",\"protocol\":\""));
  Serial.print(PROTOCOL);
  Serial.print(F("\",\"device_id\":\""));
  Serial.print(DEVICE_ID);
  Serial.print(F("\",\"firmware\":\""));
  Serial.print(FIRMWARE);
  Serial.print(F("\",\"capabilities\":{\"potentiometer\":true,\"load_cell\":"));
  Serial.print(loadCellOk ? F("true") : F("false"));
  Serial.print(F(",\"thermal_sensor\":false,\"oled\":"));
  Serial.print(oledOk ? F("true") : F("false"));
  Serial.println(F(",\"acquire_button\":true,\"reset_button\":true}}"));
}

static void sendTelemetry(float tempC, float weightG) {
  Serial.print(F("{\"type\":\"telemetry\",\"device_id\":\""));
  Serial.print(DEVICE_ID);
  Serial.print(F("\",\"seq\":"));
  Serial.print(sequence);
  Serial.print(F(",\"temperature\":"));
  printNumberOrNull(tempC, 1);
  Serial.print(F(",\"weight_g\":"));
  printNumberOrNull(weightG, 1);
  Serial.print(F(",\"temperature_source\":\"potentiometer\",\"weight_source\":"));
  Serial.print(isnan(weightG) ? F("null") : F("\"load_cell\""));
  Serial.print(F(",\"connected\":{\"potentiometer\":true,\"load_cell\":"));
  Serial.print(loadCellOk ? F("true") : F("false"));
  Serial.print(F(",\"thermal_sensor\":false},\"state\":\""));
  Serial.print(stateName());
  Serial.println(F("\"}"));
}

static void sendAcquire(float tempC, float weightG) {
  Serial.print(F("{\"type\":\"acquire\",\"device_id\":\""));
  Serial.print(DEVICE_ID);
  Serial.print(F("\",\"seq\":"));
  Serial.print(sequence);
  Serial.print(F(",\"temperature\":"));
  printNumberOrNull(tempC, 1);
  Serial.print(F(",\"weight_g\":"));
  printNumberOrNull(weightG, 1);
  Serial.print(F(",\"temperature_source\":\"potentiometer\",\"weight_source\":"));
  Serial.print(isnan(weightG) ? F("null") : F("\"load_cell\""));
  Serial.println(F(",\"event\":\"ACQUIRED\"}"));
}

static void sendReset() {
  Serial.print(F("{\"type\":\"reset\",\"device_id\":\""));
  Serial.print(DEVICE_ID);
  Serial.print(F("\",\"seq\":"));
  Serial.print(sequence);
  Serial.println(F(",\"event\":\"RESET\"}"));
}

static void sendError(const char *code, const char *detail) {
  Serial.print(F("{\"type\":\"error\",\"device_id\":\""));
  Serial.print(DEVICE_ID);
  Serial.print(F("\",\"code\":\""));
  Serial.print(code);
  Serial.print(F("\",\"detail\":\""));
  Serial.print(detail);
  Serial.println(F("\"}"));
}

/* ---------------------------------------------------------------- OLED */

static void drawScreen(float tempC, float weightG) {
#if ENABLE_OLED
  if (!oledOk) return;
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(F("PRAMAAN  #"));
  display.print(sequence);

  display.setCursor(0, 12);
  display.print(stateName());

  display.setTextSize(2);
  display.setCursor(0, 26);
  if (isnan(weightG)) display.print(F("-- g"));
  else { display.print(weightG, 1); display.print(F(" g")); }

  display.setCursor(0, 46);
  if (isnan(tempC)) display.print(F("-- C"));
  else { display.print(tempC, 1); display.print(F(" C")); }

  display.display();
#else
  (void)tempC; (void)weightG;
#endif
}

/* ----------------------------------------------------- host → device */

static void handleCommand(const String &line) {
  /* Only these command types are ever acted on; anything else is ignored. */
  if (line.indexOf("\"acquire\"") >= 0) {
    const float t = readTemperatureC();
    const float w = readWeightG();
    state = STATE_ACQUIRED;
    sendAcquire(t, w);
    drawScreen(t, w);
  } else if (line.indexOf("\"reset\"") >= 0) {
    state = STATE_RESETTING;
    resetStartedAt = millis();
  } else if (line.indexOf("\"identify\"") >= 0) {
    sendHello();
  } else if (line.indexOf("\"tare\"") >= 0) {
#if ENABLE_LOAD_CELL
    if (loadCellOk) scale.tare();
    else sendError("NO_LOAD_CELL", "Load cell not available");
#else
    sendError("NO_LOAD_CELL", "Load cell not compiled in");
#endif
  }
}

static void readSerialCommands() {
  while (Serial.available() > 0) {
    const char c = (char)Serial.read();
    if (c == '\n') {
      handleCommand(rxLine);
      rxLine = "";
    } else if (rxLine.length() < 200) {
      rxLine += c;
    } else {
      rxLine = "";    /* overlong line: drop it rather than grow forever */
    }
  }
}

/* ---------------------------------------------------------------- init */

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(PIN_SW_ACQUIRE, INPUT_PULLUP);
  pinMode(PIN_SW_RESET, INPUT_PULLUP);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  ledsOff();

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_POT, ADC_11db);   /* full 0–3.3 V swing */

#if ENABLE_OLED
  Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
  oledOk = display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  if (oledOk) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(F("PRAMAAN"));
    display.println(F("Evidence Integrity"));
    display.display();
  }
#endif

#if ENABLE_LOAD_CELL
  scale.begin(PIN_HX711_DT, PIN_HX711_SCK);
  /* Give the amplifier a moment, then decide honestly whether it is there. */
  const unsigned long until = millis() + 1000;
  while (!scale.is_ready() && millis() < until) delay(10);
  loadCellOk = scale.is_ready();
  if (loadCellOk) {
    scale.set_scale(LOAD_CELL_SCALE);
    scale.tare();
  }
#endif

  state = STATE_READY;
  sendHello();
}

/* ---------------------------------------------------------------- loop */

void loop() {
  readSerialCommands();
  serviceLeds();

  /* Physical buttons */
  if (buttonPressed(btnAcquire) && state != STATE_RESETTING) {
    const float t = readTemperatureC();
    const float w = readWeightG();
    state = STATE_ACQUIRED;
    sendAcquire(t, w);
    drawScreen(t, w);
  }
  if (buttonPressed(btnReset) && state != STATE_RESETTING) {
    state = STATE_RESETTING;
    resetStartedAt = millis();
  }

  /* Reset period: red blinks, then the next sequence begins. */
  if (state == STATE_RESETTING && millis() - resetStartedAt >= RESET_HOLD_MS) {
    sequence += 1;
    state = STATE_READY;
    sendReset();
  }

  /* Telemetry */
  const unsigned long now = millis();
  if (now - lastTelemetry >= TELEMETRY_MS) {
    lastTelemetry = now;
    const float t = readTemperatureC();
    const float w = readWeightG();
#if ENABLE_LOAD_CELL
    /* A cable pulled mid-session must show as unavailable, not as a stale value. */
    if (loadCellOk && !scale.is_ready() && isnan(w)) loadCellOk = scale.is_ready();
#endif
    sendTelemetry(t, w);
    drawScreen(t, w);
  }
}
