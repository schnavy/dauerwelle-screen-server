# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dauerwelle "Drift as a Method" — an algorithmic video screening network for Breminale 2026. A central server orchestrates synchronized video playback across multiple Raspberry Pi screens connected via a local network switch.

## Running

```bash
# On the server (Mac)
node server.js

# On each Pi/Ubuntu screen client
node client/client-pi.js      # Raspberry Pi (uses framebuffer: /dev/fb0)
node client/client-ubuntu.js  # Ubuntu (uses DISPLAY=:0 xset)
```

Both packages use ES modules (`"type": "module"`). No build step.

## Server CLI Commands

Once `server.js` is running, type commands into stdin:

```
play <media-id> on <device-id>   # e.g. play 01 on 2
switch <device-id>               # switch active screen, preserving timestamp
stop <device-id>                 # stop a specific device
stop                             # stop all devices
party                            # auto-switch every 2s between devices 2 and 3
```

## Architecture

**server.js** — WebSocket server on port 8080. Tracks connected clients in a `Map<deviceId, WebSocket>` keyed by the last octet of the client's IP. Plays audio locally via macOS `afplay`; sends `{ action, file, timestamp }` JSON messages to clients over WebSocket to control `mpv` on the screens.

**client/client-pi.js** — Pi client. Clears framebuffer on connect/stop (`dd if=/dev/zero of=/dev/fb0`). Plays video at `/home/pi/Videos/<file>`.

**client/client-ubuntu.js** — Ubuntu client. Uses `xset dpms force off` to blank on connect/stop. Plays video at `/home/david/player/client/videos/<file>`. On disconnect, waits 3s then exits (expects an external process supervisor to restart it).

**Scene registry** — hardcoded in `server.js`. `VIDEO_AMOUNT` controls how many numbered scenes exist (currently 4, generating scenes `01`–`03`). Audio path is also hardcoded to the server's local `videos/` directory.

**client/.env** — must contain `SERVER_IP=<server's LAN IP>` on each client machine.

## Key Known Issues / TODOs

- `VIDEO_AMOUNT` loop uses `i < VIDEO_AMOUNT` (not `<=`), so scene `03` is the last generated despite 4 files existing.
- Audio path in `server.js` is hardcoded to `/Users/david/GIT/dauerwelle-screen-server/videos/`.
- `party` mode ignores the `r` random value it generates and always plays `"01"` on device `"2"`.
- No reconnection logic on the server side; clients that disconnect are simply removed from the map.
- Media file count should eventually be read from the filesystem rather than `VIDEO_AMOUNT`.
