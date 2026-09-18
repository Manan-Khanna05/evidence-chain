/**
 * ESP32-S3 simulator — speaks evidence-chain-v1 byte for byte.
 *
 * Purpose: prove the Wi-Fi path end to end before the board is wired, and give
 * the team a fallback if the hardware misbehaves on the day. It serves the same
 * REST endpoints and the same /ws stream as the firmware, so the browser cannot
 * tell the difference — which is exactly why it reports a device_id of
 * EC-SIM-001 rather than impersonating the real board.
 *
 *   node tools/esp32-simulator/server.mjs [--port 8080] [--device EC-SIM-001]
 *
 * Then set the board address in the Hardware screen to 127.0.0.1:8080.
 *
 * Keys while it runs:  a = acquire   c = toggle collector   f = fault   r = reset
 */

import http from "node:http";
import { WebSocketServer } from "ws";

const args = process.argv.slice(2);
const argOf = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const PORT = Number(argOf("--port", "8080"));
const DEVICE_ID = argOf("--device", "EC-SIM-001");
const FIRMWARE = "ec-sim-1.0.0";
const PROTOCOL = "evidence-chain-v1";

const boot = Date.now();
let seq = 0;
let acq = 0;
let status = "READY";
let collectorInstalled = true;
let fault = null;
let amberUntil = 0;

const uptime = () => Date.now() - boot;
const round1 = (n) => Math.round(n * 10) / 10;

function sensors() {
  const drift = Math.sin(Date.now() / 900) * 4 + (Math.random() - 0.5) * 2.2;
  const avg = 31.4 + Math.sin(Date.now() / 2600) * 0.7;
  return {
    load_cell_g: round1(Math.max(0, 138 + drift)),
    load_cell_stable: Math.abs(drift) < 3,
    thermal: { min_c: round1(avg - 2.1), max_c: round1(avg + 2.8), avg_c: round1(avg) },
    collector_installed: collectorInstalled,
  };
}

function thermalFrame() {
  const out = [];
  const t = Date.now() / 1400;
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 32; x++) {
      const d = Math.hypot(x - 16 - Math.sin(t) * 3, y - 12);
      out.push(round1(30 + Math.max(0, 5.5 - d * 0.42) + Math.random() * 0.3));
    }
  }
  return out;
}

const hello = () => ({
  protocol: PROTOCOL,
  type: "hello",
  device_id: DEVICE_ID,
  firmware: FIRMWARE,
  uptime_ms: uptime(),
  has_rtc: false,
  calibrated: true,
  sensors: {
    load_cell: true,
    thermal: true,
    collector_switch: true,
    acquire_button: true,
    reset_button: true,
  },
  wifi: { mode: "ap", ip: `127.0.0.1:${PORT}`, rssi: -48 },
});

const telemetry = () => ({
  protocol: PROTOCOL,
  type: "telemetry",
  device_id: DEVICE_ID,
  seq: ++seq,
  uptime_ms: uptime(),
  status,
  sensors: sensors(),
});

/* ------------------------------------------------------------- transport */

const clients = new Set();
const broadcast = (obj) => {
  const s = JSON.stringify(obj);
  for (const c of clients) {
    if (c.readyState === 1) c.send(s);
  }
};

function doAcquire() {
  acq += 1;
  status = "ACQUIRING";
  amberUntil = Date.now() + 2500;
  const s = sensors();
  broadcast({
    protocol: PROTOCOL,
    type: "acquisition",
    device_id: DEVICE_ID,
    acquisition_id: `ACQ-S${String(acq).padStart(3, "0")}`,
    uptime_ms: uptime(),
    sensors: s,
    collector_ok: s.collector_installed,
  });
  if (!s.collector_installed) {
    fault = { code: "COLLECTOR_ABSENT", detail: "Collector not installed at acquisition" };
    status = "FAULT";
    broadcast({ protocol: PROTOCOL, type: "fault", device_id: DEVICE_ID, ...fault });
  }
  console.log(`  → acquisition ACQ-S${String(acq).padStart(3, "0")}  ${s.load_cell_g} g  collector=${s.collector_installed}`);
}

function doReset() {
  fault = null;
  status = "READY";
  amberUntil = 0;
  broadcast({ protocol: PROTOCOL, type: "ack", device_id: DEVICE_ID, action: "reset", ok: true, detail: "Session reset" });
  console.log("  → session reset");
}

function handleCommand(raw) {
  let cmd;
  try {
    cmd = JSON.parse(raw);
  } catch {
    return;
  }
  if (cmd.type === "acquire") doAcquire();
  else if (cmd.type === "reset") doReset();
  else if (cmd.type === "tare")
    broadcast({ protocol: PROTOCOL, type: "ack", device_id: DEVICE_ID, action: "tare", ok: true, detail: "Zeroed" });
  else if (cmd.type === "calibrate")
    broadcast({
      protocol: PROTOCOL,
      type: "ack",
      device_id: DEVICE_ID,
      action: "calibrate",
      ok: true,
      detail: `scale set from ${cmd.known_mass_g} g`,
    });
}

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
const json = (res, obj) => {
  res.writeHead(200, { "content-type": "application/json", ...cors });
  res.end(JSON.stringify(obj));
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }
  const url = req.url?.split("?")[0] ?? "/";
  if (url === "/device" || url === "/status") return json(res, hello());
  if (url === "/sensor") return json(res, telemetry());
  if (url === "/frame") return json(res, { protocol: PROTOCOL, type: "frame", device_id: DEVICE_ID, frame: thermalFrame() });
  if (url === "/acquire" && req.method === "POST") {
    doAcquire();
    return json(res, { ok: true });
  }
  if (url === "/reset" && req.method === "POST") {
    doReset();
    return json(res, { ok: true });
  }
  res.writeHead(404, cors);
  res.end();
});

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (socket) => {
  clients.add(socket);
  console.log(`  ← client connected (${clients.size})`);
  socket.send(JSON.stringify(hello()));
  socket.on("message", (d) => handleCommand(String(d)));
  socket.on("close", () => {
    clients.delete(socket);
    console.log(`  ← client disconnected (${clients.size})`);
  });
});

// Telemetry at 10 Hz, one thermal frame per second so the map has data.
setInterval(() => {
  if (status === "ACQUIRING" && Date.now() > amberUntil) status = fault ? "FAULT" : "READY";
  broadcast(telemetry());
}, 100);

setInterval(() => {
  const t = telemetry();
  t.sensors.thermal.frame = thermalFrame();
  broadcast(t);
}, 1000);

server.listen(PORT, () => {
  console.log(`\n  Evidence Chain — ESP32 simulator`);
  console.log(`  device ${DEVICE_ID}   firmware ${FIRMWARE}`);
  console.log(`  http://127.0.0.1:${PORT}/device    ws://127.0.0.1:${PORT}/ws`);
  console.log(`  keys: a=acquire  c=collector  f=fault  r=reset  q=quit\n`);
});

/* Interactive keys, so the physical buttons can be rehearsed without a board. */
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on("data", (buf) => {
    const k = buf.toString();
    if (k === "a") doAcquire();
    else if (k === "c") {
      collectorInstalled = !collectorInstalled;
      console.log(`  → collector ${collectorInstalled ? "installed" : "removed"}`);
    } else if (k === "f") {
      fault = { code: "THERMAL_TIMEOUT", detail: "MLX90640 stopped responding" };
      status = "FAULT";
      broadcast({ protocol: PROTOCOL, type: "fault", device_id: DEVICE_ID, ...fault });
      console.log("  → fault raised");
    } else if (k === "r") doReset();
    else if (k === "q" || k === "") process.exit(0);
  });
}
