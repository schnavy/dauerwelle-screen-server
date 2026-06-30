#!/bin/bash
export DISPLAY=:0
export XAUTHORITY=/home/pi/.Xauthority
cd /home/pi/client

mkdir -p /home/pi/client/logs

LOG=/home/pi/client/logs/client.log

# rotate if over 10MB
if [ -f "$LOG" ] && [ $(stat -c%s "$LOG") -gt $((10 * 1024 * 1024)) ]; then
  mv "$LOG" "${LOG}.old"
fi

while true; do
  echo "[$(TZ=Europe/Berlin date '+%Y-%m-%d %H:%M:%S')] Starting client..." | tee -a "$LOG"
  node client-pi.js 2>&1 | tee -a "$LOG"
  echo "[$(TZ=Europe/Berlin date '+%Y-%m-%d %H:%M:%S')] Client exited, retrying in 5s..." | tee -a "$LOG"
  sleep 5
done
