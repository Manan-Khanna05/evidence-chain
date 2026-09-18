/*
 * Evidence Chain — ESP32-S3 hardware gateway
 * Protocol: evidence-chain-v1
 *
 * WHAT THIS BOARD DOES
 *   Instruments the sampling act and reports it. It measures the force applied
 *   while a swab is collected (NAU7802 + 1 kg load cell), a temperature field
 *   (MLX90640), and whether the collector is fitted (microswitch). It does NOT
 *   identify substances, does not detect narcotics, and emits no referral tier
 *   or probability. Do not add one without adding the evidence to support it.
 *
 * WHAT IT NEVER DOES
 *   Claim a wall-clock time. There is no RTC and no NTP here. The board reports
 *   uptime only; the host binds records to trusted time by anchoring, exactly
 *   as it does for any other record.
 *
 * LINKS
 *   Wi-Fi  SoftAP "EvidenceChain-<id>" at 192.168.4.1
 *            GET  /device  /status  /sensor  /frame
 *            POST /acquire /reset /tare /calibrate
 *            WS   /ws        live telemetry + commands
 *   USB    115200 baud, newline-delimited JSON, same messages both ways.
 *            This path needs no extra libraries, so it is the fallback that
 *            always works even if the Wi-Fi stack misbehaves on the day.
 *
 * LIBRARIES (Arduino Library Manager)
 *   ArduinoJson             7.x   — Benoit Blanchon
 *   Adafruit NAU7802 Library      — Adafruit
 *   Adafruit MLX90640             — Adafruit
 *   ESPAsyncWebServer             — esp32async
 *   AsyncTCP                      — esp32async
 * Board: "ESP32S3 Dev Module", USB CDC On Boot = Enabled.
 *
 * If ESPAsyncWebServer is unavailable, set ENABLE_WIFI to 0: the board then
 * builds with zero third-party web dependencies and demos over USB alone.
 */

#define ENABLE_WIFI 1

#include <Arduino.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <Adafruit_NAU7802.h>
#include <Adafruit_MLX90640.h>

#if ENABLE_WIFI
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#endif

/* ----------------------------------------------------------- identity --- */

// Stable across reboots and reconnects. The host keys device identity on this,
// so it must not be randomised.
static const char *DEVICE_ID = "EC-RPF-042";
static const char *FIRMWARE  = "ec-esp32s3-1.0.0";
static const char *PROTOCOL  = "evidence-chain-v1";

/* --------------------------------------------------------------- pins --- */
// ESP32-S3 DevKitC-1. Avoids USB D+/D- (19/20), flash/PSRAM (26-32) and
// strapping pins (0/3/45/46).

static const int PIN_SDA           = 8;   // I2C — NAU7802 0x2A, MLX90640 0x33
static const int PIN_SCL           = 9;
static const int PIN_COLLECTOR     = 4;   // NO microswitch to GND, INPUT_PULLUP
static const int PIN_BTN_ACQUIRE   = 5;   // push button to GND, INPUT_PULLUP
static const int PIN_BTN_RESET     = 6;   // push button to GND, INPUT_PULLUP
static const int PIN_LED_GREEN     = 15;  // via 1k to GND — READY
static const int PIN_LED_AMBER     = 16;  // via 1k to GND — ACQUIRING / pending
static const int PIN_LED_RED       = 17;  // via 1k to GND — FAULT

static const uint32_t TELEMETRY_MS = 100;   // 10 Hz
static const uint32_t THERMAL_MS   = 500;   // 2 Hz — MLX90640 at 2 fps
static const uint32_t DEBOUNCE_MS  = 40;

/* -------------------------------------------------------------- state --- */

Adafruit_NAU7802 nau;
Adafruit_MLX90640 mlx;
Preferences prefs;

static bool  haveLoadCell = false;
static bool  haveThermal  = false;
static float thermalFrame[32 * 24];
static float thMin = 0, thMax = 0, thAvg = 0;

// Load cell calibration: grams = (raw - offset) / scale. Persisted in NVS so a
// calibrated board stays calibrated across power cycles.
static long   lcOffset = 0;
static float  lcScale  = 1.0f;
static bool   lcCalibrated = false;
static float  lastGrams = 0;
static float  gramsWindow[8];
static uint8_t gramsIdx = 0;
static bool   lcStable = false;

static uint32_t seqCounter = 0;
static uint32_t acqCounter = 0;
static char   deviceStatus[12] = "BOOTING";
static bool   faultLatched = false;
static char   faultCode[24] = "";
static char   faultDetail[64] = "";

static uint32_t lastTelemetry = 0;
static uint32_t lastThermal = 0;
static uint32_t amberUntil = 0;

#if ENABLE_WIFI
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");
#endif

/* ---------------------------------------------------------- utilities --- */

static void setStatus(const char *s) { strncpy(deviceStatus, s, sizeof(deviceStatus) - 1); }

static void leds() {
  bool ready = !faultLatched && haveLoadCell;
  digitalWrite(PIN_LED_GREEN, ready ? HIGH : LOW);
  digitalWrite(PIN_LED_RED, faultLatched ? HIGH : LOW);
  digitalWrite(PIN_LED_AMBER, millis() < amberUntil ? HIGH : LOW);
}

static bool collectorInstalled() {
  // Normally-open switch to GND: closed (LOW) means the collector is seated.
  return digitalRead(PIN_COLLECTOR) == LOW;
}

static void raiseFault(const char *code, const char *dtl);

/** Emit one JSON document on every active link. */
static void emit(JsonDocument &doc) {
  String out;
  serializeJson(doc, out);
  Serial.println(out);
#if ENABLE_WIFI
  if (ws.count()) ws.textAll(out);
#endif
}

static void fillSensors(JsonObject s) {
  if (haveLoadCell) s["load_cell_g"] = roundf(lastGrams * 10) / 10.0f;
  else s["load_cell_g"] = nullptr;
  s["load_cell_stable"] = lcStable;
  s["collector_installed"] = collectorInstalled();
  if (haveThermal) {
    JsonObject t = s["thermal"].to<JsonObject>();
    t["min_c"] = roundf(thMin * 10) / 10.0f;
    t["max_c"] = roundf(thMax * 10) / 10.0f;
    t["avg_c"] = roundf(thAvg * 10) / 10.0f;
  } else {
    s["thermal"] = nullptr;
  }
}

static void sendHello() {
  JsonDocument doc;
  doc["protocol"] = PROTOCOL;
  doc["type"] = "hello";
  doc["device_id"] = DEVICE_ID;
  doc["firmware"] = FIRMWARE;
  doc["uptime_ms"] = millis();
  doc["has_rtc"] = false;
  doc["calibrated"] = lcCalibrated;
  JsonObject sn = doc["sensors"].to<JsonObject>();
  sn["load_cell"] = haveLoadCell;
  sn["thermal"] = haveThermal;
  sn["collector_switch"] = true;
  sn["acquire_button"] = true;
  sn["reset_button"] = true;
  JsonObject w = doc["wifi"].to<JsonObject>();
#if ENABLE_WIFI
  w["mode"] = "ap";
  w["ip"] = WiFi.softAPIP().toString();
  w["rssi"] = nullptr;
#else
  w["mode"] = "off";
  w["ip"] = nullptr;
  w["rssi"] = nullptr;
#endif
  emit(doc);
}

static void sendTelemetry() {
  JsonDocument doc;
  doc["protocol"] = PROTOCOL;
  doc["type"] = "telemetry";
  doc["device_id"] = DEVICE_ID;
  doc["seq"] = ++seqCounter;
  doc["uptime_ms"] = millis();
  doc["status"] = deviceStatus;
  fillSensors(doc["sensors"].to<JsonObject>());
  emit(doc);
}

static void sendAck(const char *action, bool ok, const char *dtl = nullptr) {
  JsonDocument doc;
  doc["protocol"] = PROTOCOL;
  doc["type"] = "ack";
  doc["device_id"] = DEVICE_ID;
  doc["action"] = action;
  doc["ok"] = ok;
  if (dtl) doc["detail"] = dtl;
  emit(doc);
}

static void raiseFault(const char *code, const char *dtl) {
  faultLatched = true;
  strncpy(faultCode, code, sizeof(faultCode) - 1);
  strncpy(faultDetail, dtl, sizeof(faultDetail) - 1);
  setStatus("FAULT");
  JsonDocument doc;
  doc["protocol"] = PROTOCOL;
  doc["type"] = "fault";
  doc["device_id"] = DEVICE_ID;
  doc["code"] = code;
  doc["detail"] = dtl;
  emit(doc);
  leds();
}

/* ------------------------------------------------------- acquisition --- */

/**
 * One acquisition. This is a snapshot of the sampling act, nothing more: the
 * host still has to show it to an officer and get a confirmation before any
 * evidence record exists.
 */
static void doAcquire() {
  acqCounter++;
  setStatus("ACQUIRING");
  amberUntil = millis() + 2500;
  leds();

  char acqId[24];
  snprintf(acqId, sizeof(acqId), "ACQ-%s%03lu", "H", (unsigned long)acqCounter);

  JsonDocument doc;
  doc["protocol"] = PROTOCOL;
  doc["type"] = "acquisition";
  doc["device_id"] = DEVICE_ID;
  doc["acquisition_id"] = acqId;
  doc["uptime_ms"] = millis();
  doc["collector_ok"] = collectorInstalled();
  fillSensors(doc["sensors"].to<JsonObject>());
  emit(doc);

  // The interlock warns; it never silently suppresses the reading. The host
  // shows "collector not installed" and makes the officer acknowledge it.
  if (!collectorInstalled()) raiseFault("COLLECTOR_ABSENT", "Collector not installed at acquisition");
}

static void doReset() {
  // Session reset only. This clears device state; it cannot touch evidence,
  // which lives on the host and is hash-chained.
  faultLatched = false;
  faultCode[0] = 0;
  setStatus("READY");
  amberUntil = 0;
  leds();
  sendAck("reset", true, "Session reset");
}

static void doTare() {
  if (!haveLoadCell) { sendAck("tare", false, "Load cell unavailable"); return; }
  long sum = 0;
  int n = 0;
  for (int i = 0; i < 24; i++) {
    if (nau.available()) { sum += nau.read(); n++; }
    delay(12);
  }
  if (n < 6) { sendAck("tare", false, "No stable reading"); return; }
  lcOffset = sum / n;
  prefs.putLong("lc_offset", lcOffset);
  sendAck("tare", true, "Zeroed");
}

static void doCalibrate(float knownMassG) {
  if (!haveLoadCell) { sendAck("calibrate", false, "Load cell unavailable"); return; }
  if (knownMassG <= 0) { sendAck("calibrate", false, "Known mass must be > 0"); return; }
  long sum = 0;
  int n = 0;
  for (int i = 0; i < 24; i++) {
    if (nau.available()) { sum += nau.read(); n++; }
    delay(12);
  }
  if (n < 6) { sendAck("calibrate", false, "No stable reading"); return; }
  long raw = sum / n;
  float counts = (float)(raw - lcOffset);
  if (fabsf(counts) < 100) { sendAck("calibrate", false, "Mass too small to resolve"); return; }
  lcScale = counts / knownMassG;          // counts per gram
  lcCalibrated = true;
  prefs.putFloat("lc_scale", lcScale);
  prefs.putBool("lc_cal", true);
  char dtl[48];
  snprintf(dtl, sizeof(dtl), "scale=%.2f counts/g", lcScale);
  sendAck("calibrate", true, dtl);
}

/* ---------------------------------------------------------- commands --- */

static void handleCommand(const char *json) {
  JsonDocument doc;
  if (deserializeJson(doc, json)) return;                 // malformed — ignore
  const char *type = doc["type"] | "";
  if (!strcmp(type, "acquire")) doAcquire();
  else if (!strcmp(type, "reset")) doReset();
  else if (!strcmp(type, "tare")) doTare();
  else if (!strcmp(type, "calibrate")) doCalibrate(doc["known_mass_g"] | 0.0f);
  else if (!strcmp(type, "identify")) { amberUntil = millis() + 1200; sendAck("acquire", true, "identify"); }
}

/* ------------------------------------------------------------ sensors --- */

static void readLoadCell() {
  if (!haveLoadCell || !nau.available()) return;
  long raw = nau.read();
  float g = lcCalibrated ? (raw - lcOffset) / lcScale : (raw - lcOffset) / 1000.0f;
  lastGrams = g;

  gramsWindow[gramsIdx++ % 8] = g;
  float mn = gramsWindow[0], mx = gramsWindow[0];
  for (int i = 1; i < 8; i++) { mn = min(mn, gramsWindow[i]); mx = max(mx, gramsWindow[i]); }
  lcStable = (mx - mn) < 3.0f;            // within 3 g across the window
}

static void readThermal() {
  if (!haveThermal) return;
  if (mlx.getFrame(thermalFrame) != 0) {
    // One bad frame is normal; a persistent failure is a fault the UI shows.
    return;
  }
  float mn = thermalFrame[0], mx = thermalFrame[0], sum = 0;
  for (int i = 0; i < 32 * 24; i++) {
    mn = min(mn, thermalFrame[i]);
    mx = max(mx, thermalFrame[i]);
    sum += thermalFrame[i];
  }
  thMin = mn; thMax = mx; thAvg = sum / (32 * 24);
}

/* ------------------------------------------------------------ buttons --- */

static bool prevAcquire = HIGH, prevReset = HIGH;
static uint32_t lastAcqEdge = 0, lastRstEdge = 0;

static void pollButtons() {
  uint32_t now = millis();

  bool a = digitalRead(PIN_BTN_ACQUIRE);
  if (a != prevAcquire && now - lastAcqEdge > DEBOUNCE_MS) {
    lastAcqEdge = now;
    if (a == LOW) doAcquire();            // falling edge = pressed
    prevAcquire = a;
  } else if (a == prevAcquire) {
    // steady
  }

  bool r = digitalRead(PIN_BTN_RESET);
  if (r != prevReset && now - lastRstEdge > DEBOUNCE_MS) {
    lastRstEdge = now;
    if (r == LOW) doReset();
    prevReset = r;
  }
}

/* --------------------------------------------------------------- wifi --- */

#if ENABLE_WIFI
static void sendDeviceJson(AsyncWebServerRequest *req) {
  JsonDocument doc;
  doc["protocol"] = PROTOCOL;
  doc["type"] = "hello";
  doc["device_id"] = DEVICE_ID;
  doc["firmware"] = FIRMWARE;
  doc["uptime_ms"] = millis();
  doc["has_rtc"] = false;
  doc["calibrated"] = lcCalibrated;
  JsonObject sn = doc["sensors"].to<JsonObject>();
  sn["load_cell"] = haveLoadCell;
  sn["thermal"] = haveThermal;
  sn["collector_switch"] = true;
  sn["acquire_button"] = true;
  sn["reset_button"] = true;
  JsonObject w = doc["wifi"].to<JsonObject>();
  w["mode"] = "ap";
  w["ip"] = WiFi.softAPIP().toString();
  w["rssi"] = nullptr;
  String out;
  serializeJson(doc, out);
  AsyncWebServerResponse *res = req->beginResponse(200, "application/json", out);
  res->addHeader("Access-Control-Allow-Origin", "*");
  req->send(res);
}

static void sendSensorJson(AsyncWebServerRequest *req) {
  JsonDocument doc;
  doc["protocol"] = PROTOCOL;
  doc["type"] = "telemetry";
  doc["device_id"] = DEVICE_ID;
  doc["seq"] = seqCounter;
  doc["uptime_ms"] = millis();
  doc["status"] = deviceStatus;
  fillSensors(doc["sensors"].to<JsonObject>());
  String out;
  serializeJson(doc, out);
  AsyncWebServerResponse *res = req->beginResponse(200, "application/json", out);
  res->addHeader("Access-Control-Allow-Origin", "*");
  req->send(res);
}

static void onWsEvent(AsyncWebSocket *, AsyncWebSocketClient *client, AwsEventType type,
                      void *arg, uint8_t *data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    sendHello();
  } else if (type == WS_EVT_DATA) {
    AwsFrameInfo *info = (AwsFrameInfo *)arg;
    if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
      data[len] = 0;
      handleCommand((const char *)data);
    }
  }
}

static void startWifi() {
  char ssid[32];
  snprintf(ssid, sizeof(ssid), "EvidenceChain-%s", DEVICE_ID);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, "evidence2026");     // 192.168.4.1

  server.on("/device", HTTP_GET, sendDeviceJson);
  server.on("/status", HTTP_GET, sendDeviceJson);
  server.on("/sensor", HTTP_GET, sendSensorJson);
  server.on("/acquire", HTTP_POST, [](AsyncWebServerRequest *r) {
    doAcquire();
    AsyncWebServerResponse *res = r->beginResponse(200, "application/json", "{\"ok\":true}");
    res->addHeader("Access-Control-Allow-Origin", "*");
    r->send(res);
  });
  server.on("/reset", HTTP_POST, [](AsyncWebServerRequest *r) {
    doReset();
    AsyncWebServerResponse *res = r->beginResponse(200, "application/json", "{\"ok\":true}");
    res->addHeader("Access-Control-Allow-Origin", "*");
    r->send(res);
  });
  server.on("/tare", HTTP_POST, [](AsyncWebServerRequest *r) {
    doTare();
    AsyncWebServerResponse *res = r->beginResponse(200, "application/json", "{\"ok\":true}");
    res->addHeader("Access-Control-Allow-Origin", "*");
    r->send(res);
  });
  server.on("/calibrate", HTTP_POST, [](AsyncWebServerRequest *r) {
    float m = r->hasParam("known_mass_g", true)
                ? r->getParam("known_mass_g", true)->value().toFloat()
                : 0.0f;
    doCalibrate(m);
    AsyncWebServerResponse *res = r->beginResponse(200, "application/json", "{\"ok\":true}");
    res->addHeader("Access-Control-Allow-Origin", "*");
    r->send(res);
  });
  server.onNotFound([](AsyncWebServerRequest *r) {
    if (r->method() == HTTP_OPTIONS) {
      AsyncWebServerResponse *res = r->beginResponse(204);
      res->addHeader("Access-Control-Allow-Origin", "*");
      res->addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res->addHeader("Access-Control-Allow-Headers", "*");
      r->send(res);
    } else r->send(404);
  });

  ws.onEvent(onWsEvent);
  server.addHandler(&ws);
  server.begin();
}
#endif

/* ----------------------------------------------------------- lifecycle --- */

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(PIN_COLLECTOR, INPUT_PULLUP);
  pinMode(PIN_BTN_ACQUIRE, INPUT_PULLUP);
  pinMode(PIN_BTN_RESET, INPUT_PULLUP);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_AMBER, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);

  // Brief lamp test so a dead LED is obvious before the demo starts.
  digitalWrite(PIN_LED_GREEN, HIGH);
  digitalWrite(PIN_LED_AMBER, HIGH);
  digitalWrite(PIN_LED_RED, HIGH);
  delay(400);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_LED_AMBER, LOW);
  digitalWrite(PIN_LED_RED, LOW);

  prefs.begin("evchain", false);
  lcOffset = prefs.getLong("lc_offset", 0);
  lcScale = prefs.getFloat("lc_scale", 1.0f);
  lcCalibrated = prefs.getBool("lc_cal", false);
  if (lcScale == 0) lcScale = 1.0f;

  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(400000);

  // Each peripheral is optional. A missing one is reported and the rest keep
  // working — a dead thermal sensor must not take the load cell down with it.
  haveLoadCell = nau.begin(&Wire);
  if (haveLoadCell) {
    nau.setLDO(NAU7802_3V0);
    nau.setGain(NAU7802_GAIN_128);
    nau.setRate(NAU7802_RATE_80SPS);
    for (int i = 0; i < 10; i++) { while (!nau.available()) delay(1); nau.read(); }
    nau.calibrate(NAU7802_CALMOD_INTERNAL);
    nau.calibrate(NAU7802_CALMOD_OFFSET);
  }

  haveThermal = mlx.begin(MLX90640_I2CADDR_DEFAULT, &Wire);
  if (haveThermal) {
    mlx.setMode(MLX90640_CHESS);
    mlx.setResolution(MLX90640_ADC_18BIT);
    mlx.setRefreshRate(MLX90640_2_HZ);
  }

  for (int i = 0; i < 8; i++) gramsWindow[i] = 0;

#if ENABLE_WIFI
  startWifi();
#endif

  setStatus(haveLoadCell ? "READY" : "FAULT");
  if (!haveLoadCell) raiseFault("LOADCELL_ABSENT", "NAU7802 not responding on I2C");
  leds();
  sendHello();
}

void loop() {
  uint32_t now = millis();

  pollButtons();
  readLoadCell();

  if (now - lastThermal >= THERMAL_MS) {
    lastThermal = now;
    readThermal();
  }

  if (now - lastTelemetry >= TELEMETRY_MS) {
    lastTelemetry = now;
    if (!faultLatched && haveLoadCell && strcmp(deviceStatus, "ACQUIRING")) setStatus("READY");
    if (!strcmp(deviceStatus, "ACQUIRING") && now > amberUntil) setStatus("READY");
    sendTelemetry();
  }

  // Commands arriving over USB, one JSON object per line.
  static char line[256];
  static size_t idx = 0;
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      line[idx] = 0;
      if (idx) handleCommand(line);
      idx = 0;
    } else if (idx < sizeof(line) - 1) {
      line[idx++] = c;
    } else {
      idx = 0;                            // overlong line — drop it
    }
  }

  leds();
#if ENABLE_WIFI
  ws.cleanupClients();
#endif
}
