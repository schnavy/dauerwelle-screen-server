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
1. Flash with Raspberry Pi OS, ssh enabled, set hostname as "screen-pi-X" while X will be identical to IP ending number.
2. Connect via ssh and setup static IP
   ```
   ssh pi@screen-pi-1.local
   
   sudo nmcli con mod "Wired connection 1" ipv4.addresses 10.0.0.6/24 ipv4.gateway 10.0.0.1 ipv4.dns 8.8.8.8 ipv4.method manual
   sudo nmcli con up "Wired connection 1"
   ```
   Server (currently Mac) uses 10.0.0.1 on the switch interface.

   From now on use ```ssh pi@10.0.0.X``` for ssh connection

3. Install dependencies on the Pi
   ```
   sudo apt update
   sudo apt install -y mpv nodejs npm
   ```
   Verify: `mpv --version` and `node --version` (needs v18+).

4. Transfer client and videos to Pi
   ```
   # from this repository root:
   rsync -avz --progress client/ pi@10.0.0.2:/home/pi/client/
   rsync -avz --progress videos/ pi@10.0.0.X:/home/pi/Videos/
   ```
5. Install npm modules on the Pi and start app
   ```
   cd /home/pi/client
   npm install

   node /home/pi/client/client-pi.js
   ```
8. All connected clients should be documented in clients.json (for the moment only for overview, not technically needed)

### Using an Ubuntu machine as server (instead of Mac)

The server currently runs on a Mac at 10.0.0.1. To move it to an Ubuntu machine:

1. Find the ethernet interface connected to the switch
   ```
   nmcli con show
   # or
   ip link show
   ```
   Look for sth like `Wired connection 1` or an interface like `eth0` / `enp3s0`.

2. Set static IP — replace "Wired connectio 1" with "eth0" etc. if needed
    ```
   sudo nmcli con mod "Wired connection 1" ipv4.addresses 10.0.0.1/24 ipv4.method manual
   sudo nmcli con up "Wired connection 1"
   ```
   If the Ubuntu machine has multiple NICs (built-in ethernet, USB adapter, Wi-Fi), make sure you're modifying the one physically wired to the switch. Run `ip addr` after to confirm `10.0.0.1/24` is on the right interface.

3. Verify connectivity
   ```
   ip addr show          # on Ubuntu — confirm 10.0.0.1/24 appears
   ping 10.0.0.2         # from Ubuntu — confirm a Pi is reachable
   ping 10.0.0.1         # from a Pi — confirm server is reachable
   ```

4. Install Node.js on Ubuntu and run the server
   ```
   sudo apt update && sudo apt install -y nodejs npm
   node server.js
   ```

5. Audio: the server plays audio locally via `afplay`, which is macOS-only. On Ubuntu, replace the `afplay` call in `server.js` with `aplay` or `mpg123` depending on your audio setup, or comment it out if audio runs separately. (TODO)

### Media transfer
1. Place video files in `videos/` in this repository. Each file must be .mp4 and named by its id/order: `01.mp4`, `02.mp4` etc.

2. Mirror to each Pi via rsync:
   ```
   rsync -avz --progress videos/ pi@10.0.0.X:/home/pi/Videos/
   ```
3. Set `VIDEO_AMOUNT` in `server.js` to match the number of files (TODO: read from file tree)

### Run Server and client

On the server (from repository root):
```
node server.js
```
Commands:
```
play <media-id> on <device-id>   # e.g. play 03 on 2
switch <device-id>               # move current video to another screen, keeping timestamp
stop <device-id>                 # stop one screen
stop                             # stop all
drift                            # play clips sequentially, each on a random screen. Starting clip can be set via DRIFT_START
party                            # auto-switch every N seconds. N can be set in server.js as PARTY_DURATION
```
`media-id` looks like `01`, `02`, `03`. `device-id` is the last octet of the Pi's IP (e.g. `2` for `10.0.0.2`).

## Start client on pi
```
ssh pi@10.0.0.X
node /home/pi/player/client/client-pi.js
```
