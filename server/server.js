import { WebSocketServer } from "ws";
import * as readline from "readline";
import fs from "fs";
import path from "path";

const LOG_DIR = new URL("logs", import.meta.url).pathname;
const LOG_FILE = path.join(LOG_DIR, "server.log");
fs.mkdirSync(LOG_DIR, { recursive: true });
try { if (fs.statSync(LOG_FILE).size > 10 * 1024 * 1024) fs.renameSync(LOG_FILE, LOG_FILE + ".old"); } catch (e) {}
const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });

function ts() { return new Date().toLocaleString("sv", { timeZone: "Europe/Berlin" }); }
const _log = console.log.bind(console);
const _err = console.error.bind(console);
console.log = (...args) => { const line = `[${ts()}] ${args.join(" ")}`; _log(line); logStream.write(line + "\n"); };
console.error = (...args) => { const line = `[${ts()}] ERROR: ${args.join(" ")}`; _err(line); logStream.write(line + "\n"); };

const VIDEO_AMOUNT = 31; // update this when adding/removing videos
const TEST_MODE = process.argv.includes("--test");
const suffix = TEST_MODE ? "-test.mp4" : ".mp4";

const scenes = {};
for (let i = 1; i <= VIDEO_AMOUNT; i++) {
  const id = i.toString().padStart(2, "0");
  scenes[id] = { video: `${id}${suffix}` };
}

console.log(`${TEST_MODE ? "TEST MODE — " : ""}${VIDEO_AMOUNT} scenes loaded`);

const PARTY_DURATION = 5000;
const DRIFT_START = "RANDOM"; // scene number or "RANDOM"

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map();

let nowPlaying = null; // { deviceId, sceneId, startTime }
let driftMode = true;
let driftSceneId = null;
let driftTrace = false;
let partyInterval = null;

wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;
  const deviceId = ip.split(".").at(-1);
  clients.set(deviceId, ws);
  console.log(`✓ Device connected: ${deviceId} (${ip})`);
  console.log(`  Connected devices: ${[...clients.keys()].join(", ")}`);
  if (driftMode && !nowPlaying) driftStep();

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.action === "ended" && nowPlaying && nowPlaying.deviceId === deviceId) {
      console.log(`~> Video ended on device ${deviceId}`);
      nowPlaying = null;
      if (driftMode) driftStep(deviceId);
    }
  });

  ws.on("close", () => {
    const wasActive = nowPlaying && nowPlaying.deviceId === deviceId;
    clients.delete(deviceId);
    console.log(`Device disconnected: ${deviceId} — connected: ${[...clients.keys()].join(", ") || "none"}`);
    if (wasActive) {
      nowPlaying = null;
      if (driftMode) driftStep(deviceId);
    }
  });
});

function getElapsed() {
  return nowPlaying ? (Date.now() - nowPlaying.startTime) / 1000 : 0;
}

function startVideo(deviceId, sceneId) {
  const scene = scenes[sceneId];
  if (!scene) return console.log(`Unknown scene: ${sceneId}`);

  const client = clients.get(deviceId);
  if (!client) return console.log(`Device not connected: ${deviceId}`);

  if (nowPlaying) stopClient(nowPlaying.deviceId);

  nowPlaying = { deviceId, sceneId, startTime: Date.now() };
  client.send(JSON.stringify({ action: "play", file: scene.video, timestamp: 0 }), (err) => {
    if (err) {
      console.error(`Send error to device ${deviceId}:`, err.message);
      clients.delete(deviceId);
      nowPlaying = null;
      if (driftMode) driftStep(deviceId);
    }
  });
  console.log(`~> Scene ${sceneId} started on device ${deviceId}`);
}

function switchToClient(deviceId) {
  if (!nowPlaying) return console.log("Nothing is playing");

  const client = clients.get(deviceId);
  if (!client) return console.log(`Device not connected: ${deviceId}`);

  const { sceneId } = nowPlaying;
  const timestamp = getElapsed();
  stopClient(nowPlaying.deviceId);
  client.send(JSON.stringify({ action: "play", file: scenes[sceneId].video, timestamp }));
  nowPlaying.deviceId = deviceId;
  console.log(`~> Switched to device ${deviceId} at ${timestamp.toFixed(2)}s`);
}

function stopClient(deviceId) {
  const client = clients.get(deviceId);
  if (client) client.send(JSON.stringify({ action: "stop" }));
}

function stopAll() {
  driftMode = false;
  driftSceneId = null;
  driftTrace = false;
  if (partyInterval) { clearInterval(partyInterval); partyInterval = null; }
  clients.forEach((_, id) => stopClient(id));
  nowPlaying = null;
  console.log("~> Stopped all");
}

function driftStep(excludeDeviceId = null) {
  if (!driftMode) return;
  if (clients.size === 0) return console.log("Drift: no devices connected, waiting...");

  const previousSceneId = driftSceneId;

  if (driftSceneId === null) {
    const start = DRIFT_START === "RANDOM"
      ? Math.floor(Math.random() * VIDEO_AMOUNT) + 1
      : DRIFT_START;
    driftSceneId = start.toString().padStart(2, "0");
  } else {
    driftSceneId = ((parseInt(driftSceneId, 10) % VIDEO_AMOUNT) + 1).toString().padStart(2, "0");
  }

  const available = [...clients.keys()].filter(id => id !== excludeDeviceId);
  const deviceId = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : excludeDeviceId;

  startVideo(deviceId, driftSceneId);

  if (driftTrace && excludeDeviceId && previousSceneId) {
    const traceClient = clients.get(excludeDeviceId);
    if (traceClient) {
      const traceFile = `${previousSceneId}-trace.mp4`;
      traceClient.send(JSON.stringify({ action: "play", file: traceFile, timestamp: 0 }));
      console.log(`~> Trace: ${traceFile} on device ${excludeDeviceId}`);
    }
  }
}

// CLI
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log("Commands: play <id> on <device>  |  switch <device>  |  stop [device]  |  drift [--trace]  |  party  |  scatter  |  testpattern  |  restart  |  quit");

rl.on("line", (input) => {
  const parts = input.trim().split(" ");
  const cmd = parts[0];

  if (cmd === "play" && parts[2] === "on" && parts[3]) return startVideo(parts[3], parts[1]);
  if (cmd === "switch" && parts[1]) return switchToClient(parts[1]);
  if (cmd === "stop" && parts[1]) return stopClient(parts[1]);
  if (cmd === "stop") return stopAll();

  if (cmd === "testpattern") {
    stopAll();
    clients.forEach((ws, deviceId) => {
      ws.send(JSON.stringify({ action: "play", file: "test.png", timestamp: 0 }));
      console.log(`~> Test pattern on device ${deviceId}`);
    });
    return;
  }

  if (cmd === "scatter") {
    nowPlaying = null;
    clients.forEach((ws, deviceId) => {
      const sceneId = (Math.floor(Math.random() * VIDEO_AMOUNT) + 1).toString().padStart(2, "0");
      ws.send(JSON.stringify({ action: "play", file: scenes[sceneId].video, timestamp: 0 }));
      console.log(`~> Scatter: scene ${sceneId} on device ${deviceId}`);
    });
    return;
  }

  if (cmd === "drift") {
    driftMode = true;
    driftTrace = parts.includes("--trace");
    driftSceneId = null;
    console.log(`~> Drift mode${driftTrace ? " (trace)" : ""}`);
    driftStep();
    return;
  }

  if (cmd === "party") {
    if (partyInterval) clearInterval(partyInterval);
    partyInterval = setInterval(() => {
      const deviceIds = [...clients.keys()];
      if (deviceIds.length === 0) return;
      const deviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
      const sceneId = (Math.floor(Math.random() * VIDEO_AMOUNT) + 1).toString().padStart(2, "0");
      startVideo(deviceId, sceneId);
    }, PARTY_DURATION);
    return;
  }

  if (cmd === "restart") {
    console.log(`~> Restarting all clients (${clients.size} connected)`);
    clients.forEach((ws, id) => {
      stopClient(id);
      ws.send(JSON.stringify({ action: "restart" }));
    });
    nowPlaying = null;
    return;
  }

  if (cmd === "quit" || cmd === "exit") {
    console.log("Shutting down...");
    stopAll();
    wss.close(() => process.exit(0));
    return;
  }
});
