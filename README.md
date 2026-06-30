_Dauerwelle "Drift as a Method" – Breminale 2026_

## Setup for algorithmic video screening network.

```
Server (Ubuntu ThinkPad, 10.0.0.1, running server.js)
-> Switch
  -> Pi 1 (running client-pi.js)
    -> Projector
  -> Pi 2
    -> Projector
  -> Pi 3
    -> Projector
```

### Prepare Pis

1. Flash with Raspberry Pi OS, ssh enabled, set hostname as `screen-pi-X` where X matches the IP ending.

2. Connect via SSH and set static IP:
   ```
   ssh pi@screen-pi-1.local

   sudo nmcli con mod "Wired connection 1" ipv4.addresses 10.0.0.X/24 ipv4.gateway 10.0.0.1 ipv4.dns 8.8.8.8 ipv4.method manual
   sudo nmcli con up "Wired connection 1"
   ```
   From now on use `ssh pi@10.0.0.X`.

3. Install dependencies:
   ```
   sudo apt update
   sudo apt install -y mpv nodejs npm
   ```
   Verify: `mpv --version` and `node --version` (needs v18+).

4. Deploy client and videos from this repo:
   ```
   ./scripts/sync-client.sh
   ./scripts/sync-videos.sh
   ```

5. Install npm modules on the Pi:
   ```
   ssh pi@10.0.0.X
   cd /home/pi/client && npm install
   ```

6. Add the Pi to `server/clients.json`.

Clients autostart on boot via crontab (set by `sync-client.sh`). To attach:
```
ssh pi@10.0.0.X
tmux -S /tmp/dauerwelle.sock attach -t dauerwelle
```

### Prepare Server (Ubuntu)

1. Find the ethernet interface connected to the switch:
   ```
   nmcli con show
   ```

2. Set static IP:
   ```
   sudo nmcli con mod "Wired connection 1" ipv4.addresses 10.0.0.1/24 ipv4.method manual
   sudo nmcli con up "Wired connection 1"
   ```

3. Install Node.js:
   ```
   sudo apt update && sudo apt install -y nodejs npm
   ```

4. Deploy server from this repo:
   ```
   ./scripts/sync-server.sh
   ```

5. Install npm modules on the server:
   ```
   ssh david@10.0.0.1
   cd /home/david/server && npm install
   ```

6. Set up autostart via crontab:
   ```
   crontab -e
   ```
   Add:
   ```
   @reboot /usr/bin/tmux -S /tmp/dauerwelle.sock new-session -d -s dauerwelle 'bash /home/david/server/start.sh'
   ```

To attach after reboot:
```
ssh david@10.0.0.1
tmux -S /tmp/dauerwelle.sock attach -t dauerwelle
```

### Media

Place video files in `videos/`. Each file must be `.mp4` named by order: `01.mp4`, `02.mp4` etc.

For testing, add `-test` variants: `01-test.mp4`, `02-test.mp4` etc.

Set `VIDEO_AMOUNT` in `server.js` to match the number of files.

Sync to all Pis:
```
./scripts/sync-videos.sh
```

### Server Commands

Start:
```
node server.js          # normal mode
node server.js --test   # uses XX-test.mp4 files
```

The server starts in drift mode automatically when clients connect.

```
play <media-id> on <device-id>   # e.g. play 03 on 2
switch <device-id>               # move current video to another screen, keeping timestamp
stop <device-id>                 # stop one screen
stop                             # stop all screens and exit drift/party mode
drift [--trace]                  # play clips sequentially (n+1), each on a random screen
party                            # auto-switch to a random clip every PARTY_DURATION ms
scatter                          # play a random clip on every screen simultaneously
restart                          # restart all connected clients
quit                             # stop the server (keeps tmux session alive)
```

`media-id`: `01`, `02` etc. `device-id`: last IP octet (`2` for `10.0.0.2`).

### Logs

```
tail -f /home/david/server/logs/server.log   # server
tail -f /home/pi/client/logs/client.log      # on each Pi
```

Logs rotate automatically at 10MB.
