import { WebSocketServer } from "ws";
import * as readline from "readline";
import { exec } from "child_process";

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map();
let audioPlayer = null;

const VIDEO_AMOUNT = 27;
const PARTY_DURATION = 5000;

let nowPlaying = null; // { deviceId, sceneId, startTime }

let driftMode = false;
let driftSceneId = null;
const DRIFT_START = 6; // number or "RANDOM"

let partyInterval = null;
let driftTrace = false;

const scenes = {};
for (let i = 1; i < VIDEO_AMOUNT + 1; i++) {
  const id = i.toString().padStart(2, "0");
  scenes[id] = { video: `${id}.mp4`, audio: `${id}.mp4` };
}

console.log("Scenes:", scenes);

wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;
  const deviceId = ip.split(".").at(-1);
  clients.set(deviceId, ws);
  console.log(`✓ Device connected: ${deviceId} (${ip})`);
  console.log(`  Connected devices: ${[...clients.keys()].join(", ")}`);

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
    console.log(`Device disconnected: ${deviceId}`);
    console.log(`  Connected devices: ${[...clients.keys()].join(", ")}`);
    if (wasActive) {
      nowPlaying = null;
      if (driftMode) {
        console.log(`~> Active device disconnected, advancing drift`);
        driftStep(deviceId);
      }
    }
  });
});

function stopAudio() {
  if (audioPlayer) {
    audioPlayer.kill();
    audioPlayer = null;
  }
}

function getElapsed() {
  if (!nowPlaying) return 0;
  return (Date.now() - nowPlaying.startTime) / 1000;
}

function startVideo(deviceId, sceneId) {
  const scene = scenes[sceneId];
  if (!scene) return console.log(`Unknown scene: ${sceneId}`);

  const client = clients.get(deviceId);
  if (!client) return console.log(`Device not connected: ${deviceId}`);

  if (nowPlaying) stopClient(nowPlaying.deviceId);
  stopAudio();

  nowPlaying = { deviceId, sceneId, startTime: Date.now() };

  // audioPlayer = exec(
  //   `afplay /Users/david/GIT/dauerwelle-screen-server/videos/${scene.audio}`,
  // );

  client.send(
    JSON.stringify({ action: "play", file: scene.video, timestamp: 0 }),
    (err) => {
      if (err) {
        console.error(`~> Send error to device ${deviceId}:`, err.message);
        clients.delete(deviceId);
        nowPlaying = null;
        if (driftMode) driftStep(deviceId);
      }
    },
  );
  console.log(`~> Scene ${sceneId} started on device ${deviceId}`);
}

function switchToClient(deviceId) {
  if (!nowPlaying) {
    return console.log(`Nothing is playing`);
  } else {
    console.log(nowPlaying);
    stopClient(nowPlaying.deviceId);
  }

  const client = clients.get(deviceId);
  if (!client) return console.log(`Device not connected: ${deviceId}`);

  const scene = scenes[nowPlaying.sceneId];
  const timestamp = getElapsed();
  client.send(JSON.stringify({ action: "play", file: scene.video, timestamp }));
  nowPlaying.deviceId = deviceId;
  console.log(`~> Switched to device ${deviceId} at ${timestamp.toFixed(2)}s`);
}

function stopClient(deviceId) {
  const client = clients.get(deviceId);
  if (!client) return;
  client.send(JSON.stringify({ action: "stop" }));
  console.log(`~> Stopped ${deviceId}`);
}

function stopAll() {
  driftMode = false;
  driftSceneId = null;
  driftTrace = false;
  if (partyInterval) { clearInterval(partyInterval); partyInterval = null; }
  clients.forEach((_, deviceId) => stopClient(deviceId));
  stopAudio();
  nowPlaying = null;
  console.log(`~> Stopped all`);
}

function driftStep(excludeDeviceId = null) {
  if (!driftMode) return;
  if (clients.size === 0) return console.log("Drift: no devices connected, waiting...");

  const previousSceneId = driftSceneId;

  if (driftSceneId === null) {
    const start = DRIFT_START !== "RANDOM"
      ? DRIFT_START
      : Math.floor(Math.random() * VIDEO_AMOUNT) + 1;
    driftSceneId = start.toString().padStart(2, "0");
  } else {
    const next = (parseInt(driftSceneId, 10) % VIDEO_AMOUNT) + 1;
    driftSceneId = next.toString().padStart(2, "0");
  }

  const available = [...clients.keys()].filter((id) => id !== excludeDeviceId);
  const deviceId = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : excludeDeviceId;

  console.log(`~> Drift: scene ${driftSceneId} on device ${deviceId}`);
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
console.log("Commands: play <media-id> on <device-id>  |  switch <device-id>  |  stop <device-id>  |  stop  |  drift  |  party  |  scatter");

rl.on("line", (input) => {
  const parts = input.trim().split(" ");

  if (parts[0] === "play" && parts[2] === "on" && parts[3]) {
    startVideo(parts[3], parts[1]);
    return;
  }

  if (parts[0] === "switch" && parts[1]) {
    switchToClient(parts[1]);
    return;
  }

  if (parts[0] === "stop" && parts[1]) {
    stopClient(parts[1]);
    return;
  }

  if (parts[0] === "stop") {
    stopAll();
    return;
  }

  if (parts[0] === "scatter") {
    stopAudio();
    nowPlaying = null;
    clients.forEach((ws, deviceId) => {
      const sceneId = (Math.floor(Math.random() * VIDEO_AMOUNT) + 1).toString().padStart(2, "0");
      ws.send(JSON.stringify({ action: "play", file: scenes[sceneId].video, timestamp: 0 }));
      console.log(`~> Scatter: scene ${sceneId} on device ${deviceId}`);
    });
    return;
  }

  if (parts[0] === "drift") {
    driftMode = true;
    driftTrace = parts.includes("--trace");
    driftSceneId = null;
    console.log(`~> Drift mode started${driftTrace ? " (trace)" : ""}`);
    driftStep();
    return;
  }

  if (parts[0] === "party") {
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
});
