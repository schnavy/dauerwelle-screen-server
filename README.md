_Dauerwelle "Drift as a Method" – Breminale 2026_

## Setup for algorithmic video screening network.
Currently set up for testing on mac and a single Raspberry Pi 5

```
Server (running server.js)
-> Switch
  -> Pi 1 (running client.js)
    -> Screen
  -> Pi 2
    -> Screen
  -> Pi 3
    -> Screen
```

### Prepare Setup
1. Flash with R.OS, ssh enabled, set name
2. connect via switch and ssh
   ```
   ssh pi@screen-pi-1.local
   mkdir /home/pi/player
   ```
3. transfer client sub-repo to pi via scp
   ```
   scp -r client/ pi@screen-pi-1.local:/home/player
   ```
4. install npm modules
5. set SERVER_IP in .env on client

### Media transfer
1. Place video/audio material in a /videos directory. Each file should have a corresponding id as name. (01.mp4, 01.mp3 etc)
2. connect to pi via ssh
3. Mirror contents to Pi:
   ```
   rsync -avz videos/ pi@screen-pi-1.local:/home/pi/Videos/
   ```
4. Set amount of numerated video/audio files in server.js (TODO: read from file tree)

### Run Server and client

```
node server.js // on server -> commands: play [id] | stop
node client.js // on pi
```
