import "dotenv/config";
import WebSocket from "ws";
import { exec, execSync } from "child_process";

const SERVER_IP = process.env.SERVER_IP;
const ws = new WebSocket(`ws://${SERVER_IP}:8080`);
let player = null;

ws.on("open", () => {
  console.log("Connected to server");
  exec("DISPLAY=:0 xset dpms force off");
});

ws.on("message", (raw) => {
  const msg = JSON.parse(raw);
  console.log("Received:", msg);

  if (msg.action === "play") {
    exec("killall mpv");
    const seek = msg.timestamp ? `--start=${msg.timestamp.toFixed(2)}` : "";
    player = exec(
      `DISPLAY=:0 mpv --fullscreen ${seek} /home/pi/Videos/${msg.file}`,
      (err) => { if (!err) ws.send(JSON.stringify({ action: "ended" })); },
    );
  }

  if (msg.action === "stop") {
    exec("killall mpv");
    player = null;
    exec("DISPLAY=:0 xset dpms force off");
  }
});

ws.on("close", () => {
  console.log("Disconnected, retrying in 3s...");
  setTimeout(() => process.exit(1), 3000);
});
