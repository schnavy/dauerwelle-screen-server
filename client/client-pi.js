import "dotenv/config";
import WebSocket from "ws";
import { exec } from "child_process";
import net from "net";
import fs from "fs";

function ts() { return new Date().toLocaleString("sv", { timeZone: "Europe/Berlin" }); }
const _log = console.log.bind(console);
const _err = console.error.bind(console);
console.log = (...args) => _log(`[${ts()}]`, ...args);
console.error = (...args) => _err(`[${ts()}] ERROR:`, ...args);

const SERVER_IP = process.env.SERVER_IP;
const VIDEO_DIR = "/home/pi/Videos";
const SOCKET_PATH = "/tmp/mpv-socket";

let mpvProc = null;
let mpvSocket = null;
let socketReady = false;
let socketBuffer = "";
let wasPlaying = false;
let pendingCommand = null;
let intentionalKill = false;

const ws = new WebSocket(`ws://${SERVER_IP}:8080`);

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
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: "ended" }));
          }
        }
      } catch (e) {}
    }
  });

  socket.on("error", () => {
    socketReady = false;
    socket.destroy();
    if (retries > 0) setTimeout(() => connectMpvSocket(retries - 1), 200);
    else console.error("Could not connect to mpv socket after retries");
  });

  socket.on("close", () => { socketReady = false; });
}

function startMpv() {
  intentionalKill = true;
  socketBuffer = "";
  wasPlaying = false;
  if (mpvProc) { mpvProc.kill(); mpvProc = null; }
  try { fs.unlinkSync(SOCKET_PATH); } catch (e) {}

  setTimeout(() => {
    intentionalKill = false;
    mpvProc = exec(
      `DISPLAY=:0 mpv --really-quiet --cursor-autohide=1 --force-window=yes --idle=yes --fullscreen --no-osc --input-ipc-server=${SOCKET_PATH}`,
      (err) => {
        mpvProc = null;
        socketReady = false;
        if (intentionalKill) return;
        console.error("mpv exited unexpectedly, restarting...", err?.message ?? "");
        if (wasPlaying && ws.readyState === WebSocket.OPEN) {
          wasPlaying = false;
          ws.send(JSON.stringify({ action: "ended" }));
        }
        setTimeout(() => startMpv(), 2000);
      }
    );
    setTimeout(() => connectMpvSocket(), 300);
  }, 500);
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
    const filePath = `${VIDEO_DIR}/${msg.file}`;
    const isImage = /\.(png|jpg|jpeg)$/i.test(msg.file);
    if (isImage && socketReady && mpvSocket && !mpvSocket.destroyed) {
      mpvSocket.write(JSON.stringify({ command: ["set_property", "image-display-duration", "inf"] }) + "\n");
    }
    sendMpvCommand(["loadfile", filePath]);
  }
  if (msg.action === "stop") { wasPlaying = false; sendMpvCommand(["stop"]); }
  if (msg.action === "restart") { console.log("Restarting..."); exec("killall mpv", () => process.exit(0)); }
});

ws.on("error", (err) => {
  console.error("Connection error:", err.message);
  exec("killall mpv");
  setTimeout(() => process.exit(1), 1000);
});

ws.on("close", () => {
  console.log("Disconnected — retrying...");
  exec("killall mpv");
  setTimeout(() => process.exit(1), 1000);
});

process.on("SIGINT", () => exec("killall mpv", () => process.exit(0)));
