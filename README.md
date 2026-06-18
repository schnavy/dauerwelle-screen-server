_Dauerwelle "Drift as a Method" – Breminale 2026_

## Setup for algorithmic video screening network.
Currently set up for testing on mac as server and Raspberry Pi 5 and ubunutu laptop as clients

```
Server (running server.js)
-> Switch
  -> Pi 1 (running client.js)
    -> Projector
  -> Pi 2
    -> Projector
  -> Pi 3
    -> Projector
```

### Prepare Setup
1. Flash with Raspberry Pi OS, ssh enabled, set hostname (using wifi makes initial setup easier, because static IP over switch must be set separately)
2. Connect via ssh and create player directory
   ```
   ssh pi@screen-pi-1.local
   mkdir /home/pi/player
   ```
3. Install dependencies on the Pi
   ```
   sudo apt update
   sudo apt install -y mpv nodejs npm
   ```
   Verify: `mpv --version` and `node --version` (needs v18+). If `apt` gives an older Node, install via [NodeSource](https://github.com/nodesource/distributions):
   ```
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
4. Setup Pi for static IP over switch
   ```
   sudo nmcli con mod "Wired connection 1" ipv4.addresses 10.0.0.6/24 ipv4.gateway 10.0.0.1 ipv4.dns 8.8.8.8 ipv4.method manual

   sudo nmcli con up "Wired connection 1"
   ```
   Server (Mac) should use 10.0.0.1 on the switch interface.
5. Transfer client to Pi
   ```
   scp -r client/ pi@screen-pi-1.local:/home/pi/player/
   ```
6. Install npm modules on the Pi
   ```
   ssh pi@screen-pi-1.local
   cd /home/pi/player/client
   npm install
   ```
7. Create `.env` in the client directory on the Pi
   ```
   echo "SERVER_IP=10.0.0.1" > /home/pi/player/client/.env
   ```
8. All connected clients should be documented in clients.json (for the moment only for overview, not technically needed)

### Media transfer
1. Place video files in a `videos/` directory on the server. Each file is named by its id: `01.mp4`, `02.mp4` etc.
2. Mirror to each Pi via rsync:
   ```
   rsync -avz videos/ pi@screen-pi-1.local:/home/pi/Videos/
   ```
3. Set `VIDEO_AMOUNT` in `server.js` to match the number of files (TODO: read from file tree)

### Run Server and client

On the server (Mac):
```
node server.js
```
Commands:
```
play <media-id> on <device-id>   # e.g. play 03 on 2
switch <device-id>               # move current video to another screen, keeping timestamp
stop <device-id>                 # stop one screen
stop                             # stop all
drift                            # play clips sequentially, each on a random screen
party                            # auto-switch every 5s between devices 2 and 3
```
`media-id` looks like `01`, `02`, `03`. `device-id` is the last octet of the Pi's IP (e.g. `2` for `10.0.0.2`).

On each Pi:
```
cd /home/pi/player/client
node client-pi.js
```

On Ubuntu client:
```
node client-ubuntu.js
```
