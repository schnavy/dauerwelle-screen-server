import { WebSocketServer } from "ws";
import * as readline from "readline";
import { exec } from "child_process";
import { log } from "console";

const wss = new WebSocketServer({ port: 8080 });
let pi = null;
let audioPlayer = null;

// id to files mapping
// const scenes = {
//   "01": { video: "01.mp4", audio: "01.mp4" },
//   "02": { video: "02.mp4", audio: "02.mp4" },
//   "01": { video: "01.mp4", audio: "01.mp4" },
//   "02": { video: "02.mp4", audio: "02.mp4" },
// };

const scenes = new Object();
const VIDEO_AMOUNT = 4;

for (let i = 1; i < VIDEO_AMOUNT; i++) {
  let id = i.toString().padStart(2, "0");
  let videoName = id + ".mp4";
  scenes[id] = { video: videoName, audio: videoName };
}

console.log(scenes);

wss.on("connection", (ws) => {
  pi = ws;
  console.log("✓ Pi connecto");
  ws.on("close", () => {
    pi = null;
    console.log("Pi disconnected");
  });
});

function stopAudio() {
  if (audioPlayer) {
    audioPlayer.kill();
    audioPlayer = null;
  }
}

function playScene(id) {
  const scene = scenes[id];
  if (!scene) return console.log(`Unknown scene: ${id}`);

  if (!pi) return console.log(`No pi connected`);

  pi.send(JSON.stringify({ action: "play", file: scene.video }));
  stopAudio();
  audioPlayer = exec(
    `afplay /Users/david/GIT/dauerwelle-screen-server/videos/${scene.audio}`,
  );
  console.log(`~> Scene ${id}: ${scene.video} + ${scene.audio}`);
}

// Simple command line interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("Commands: play <id>  |  stop");

rl.on("line", (input) => {
  if (!pi) return console.log("No Pi connected");

  const [cmd, id] = input.trim().split(" ");

  if (cmd === "play" && id) playScene(id);

  if (cmd === "stop") {
    if (pi) pi.send(JSON.stringify({ action: "stop" }));
    stopAudio();
    console.log("~> Stopped");
  }
});
