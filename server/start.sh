#!/bin/bash
cd /home/david/server

mkdir -p /home/david/server/logs

LOG=/home/david/server/logs/server.log

if [ -f "$LOG" ] && [ $(stat -c%s "$LOG") -gt $((10 * 1024 * 1024)) ]; then
  mv "$LOG" "${LOG}.old"
fi

echo "[$(TZ=Europe/Berlin date '+%Y-%m-%d %H:%M:%S')] Starting server..." | tee -a "$LOG"
node server.js "$@" 2>&1 | tee -a "$LOG"
echo "[$(TZ=Europe/Berlin date '+%Y-%m-%d %H:%M:%S')] Server stopped. Type 'bash start.sh' to restart."

exec bash
