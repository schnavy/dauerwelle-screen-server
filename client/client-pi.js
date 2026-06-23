import "dotenv/config";
import WebSocket from "ws";
import { exec } from "child_process";
import net from "net";
import fs from "fs";

const SERVER_IP = process.env.SERVER_IP;
const ws = new WebSocket(`ws://${SERVER_IP}:8080`);

const VIDEO_DIR = "/home/pi/Videos";
const SOCKET_PATH = "/tmp/mpv-socket";

let mpvSocket = null;
let socketReady = false;
let socketBuffer = "";
let wasPlaying = false;
let pendingCommand = null; // single-slot: only the latest play/stop matters
let startingMpv = false;

function sendMpvCommand(args) {
  if (socketReady && mpvSocket && !mpvSocket.destroyed) {
    mpvSocket.write(JSON.stringify({ command: args }) + "\n");
  } else {
    pendingCommand = args;
  }
}

function connectMpvSocket(retries = 20) {
  const socket = net.createConnection(SOCKET_PATH);

  socket.on("connect", () => {
    console.log("Connected to mpv socket");
    mpvSocket = socket;
    socketReady = true;
    socket.write(JSON.stringify({ command: ["observe_property", 1, "idle-active"] }) + "\n");
    if (pendingCommand) {
      socket.write(JSON.stringify({ command: pendingCommand }) + "\n");
      pendingCommand = null;
    }
  });

  socket.on("data", (data) => {
    socketBuffer += data.toString();
    const lines = socketBuffer.split("\n");
    socketBuffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.event === "property-change" && event.name === "idle-active") {
          if (event.data === false) {
            wasPlaying = true;
          } else if (event.data === true && wasPlaying) {
            wasPlaying = false;
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ action: "ended" }));
            }
          }
        }
      } catch (e) {}
    }
  });

  socket.on("error", () => {
    socketReady = false;
    socket.destroy();
    if (retries > 0) {
      setTimeout(() => connectMpvSocket(retries - 1), 200);
    } else {
      console.error("Could not connect to mpv socket, restarting mpv...");
      setTimeout(() => startMpv(), 2000);
    }
  });

  socket.on("close", () => {
    socketReady = false;
    if (startingMpv) return;
    // mpv crashed unexpectedly — notify server and restart
    if (wasPlaying && ws.readyState === WebSocket.OPEN) {
      wasPlaying = false;
      ws.send(JSON.stringify({ action: "ended" }));
    }
    console.log("mpv socket closed unexpectedly, restarting mpv...");
    setTimeout(() => startMpv(), 1000);
  });
}

function startMpv() {
  startingMpv = true;
  socketBuffer = "";
  exec("killall mpv; sleep 0.5", () => {
    try { fs.unlinkSync(SOCKET_PATH); } catch (e) {}
    startingMpv = false;
    wasPlaying = false;
    exec(
      `DISPLAY=:0 mpv --force-window=yes --idle=yes --fullscreen --no-osc --input-ipc-server=${SOCKET_PATH}`,
      (err) => { if (err) console.error("mpv exited:", err.message); },
    );
    setTimeout(() => connectMpvSocket(), 300);
  });
}

ws.on("open", () => {
  console.log("Connected to server");
  startMpv();
});

ws.on("message", (raw) => {
  let msg;
  try { msg = JSON.parse(raw); } catch (e) { return; }
  console.log("Received:", msg);

  if (msg.action === "play") {
    sendMpvCommand(["loadfile", `${VIDEO_DIR}/${msg.file}`]);
  }

  if (msg.action === "stop") {
    wasPlaying = false;
    sendMpvCommand(["stop"]);
  }
});

ws.on("close", () => {
  console.log("Disconnected, retrying in 3s...");
  exec("killall mpv");
  setTimeout(() => process.exit(1), 3000);
});

process.on("SIGINT", () => {
  exec("killall mpv", () => process.exit(0));
});
