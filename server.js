import { WebSocketServer } from "ws";
import * as readline from "readline";
import { exec } from "child_process";
import { log } from "console";

const wss = new WebSocketServer({ port: 8080 });
const clients = new Map();
let audioPlayer = null;

// global now-playing state
let nowPlaying = null; // { sceneId, startTime }

const scenes = {};
const VIDEO_AMOUNT = 4;
for (let i = 1; i < VIDEO_AMOUNT; i++) {
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

  ws.on("close", () => {
    clients.delete(deviceId);
    console.log(`Device disconnected: ${deviceId}`);
    console.log(`  Connected devices: ${[...clients.keys()].join(", ")}`);
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

  audioPlayer = exec(
    `afplay /Users/david/GIT/dauerwelle-screen-server/videos/${scene.audio}`,
  );

  client.send(
    JSON.stringify({ action: "play", file: scene.video, timestamp: 0 }),
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
  console.log("new: " + deviceId + " at " + timestamp);
  client.send(JSON.stringify({ action: "play", file: scene.video, timestamp }));
  nowPlaying.deviceId = deviceId;
  console.log(`~> Switched to device ${deviceId} at ${timestamp.toFixed(2)}s`);
}

function stopClient(deviceId) {
  const client = clients.get(deviceId);
  if (!client) return console.log(`Device not connected: ${deviceId}`);

  client.send(JSON.stringify({ action: "stop" }));
  console.log(`~> Stopped ${deviceId}`);
}

function stopAll() {
  clients.forEach((_, deviceId) => stopClient(deviceId));
  stopAudio();
  nowPlaying = null;
  console.log(`~> Stopped all`);
}

// CLI
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
console.log(
  "Commands: play <media-id> on <device-id>  |  switch <device-id>  |  stop <device-id>  |  stop",
);

rl.on("line", (input) => {
  const parts = input.trim().split(" ");

  // play 01 on 2
  if (parts[0] === "play" && parts[2] === "on" && parts[3]) {
    startVideo(parts[3], parts[1]);
    return;
  }

  // switch 3
  if (parts[0] === "switch" && parts[1]) {
    switchToClient(parts[1]);
    return;
  }

  // stop 2
  if (parts[0] === "stop" && parts[1]) {
    stopClient(parts[1]);
    return;
  }

  // stop
  if (parts[0] === "stop") {
    stopAll();
  }

  if (parts[0] === "party") {
    setInterval(() => {
      if (!nowPlaying) {
        let r = Math.floor(Math.random() * VIDEO_AMOUNT + 1);
        console.log(r);
        startVideo("2", "01");
      } else {
        let otherClient = nowPlaying.deviceId === "3" ? "2" : "3";
        console.log(otherClient);
        switchToClient(otherClient);
      }
    }, 2000);
    return;
  }
});
