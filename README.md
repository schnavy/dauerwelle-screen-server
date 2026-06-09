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
1. Flash with R.OS, ssh enabled, set name (using wifi makes initial setup easier, because IP Adress over switch must be set)
2. connect via switch and ssh
   ```
   ssh pi@screen-pi-1.local
   mkdir /home/pi/player
   ```
3. Setup Pi for Network
   ```
   tba. (edit config file, i will add documentation soon)
   ```
4. transfer client sub-repo to pi via scp
   ```
   scp -r client/ pi@screen-pi-1.local:/home/player
   ```
5. install npm modules
6. set SERVER_IP in .env on client (if not using 10.0.0.1)
7. All connected clients should be documented in clients.json (for the moment only for overview, not techinally needed)

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
node server.js // on server -> commands: play [video id] on [client id] | stop | party | swith to [client id]
# video ids loook like this 03 / 04 / 05 and client ids like this 2 / 3 / 4 (last number of ip adress)

node client.js // on pi
```
