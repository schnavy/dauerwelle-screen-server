# Dauerwelle – Exhibition Cheatsheet

## Morning startup

1. Power on server (ThinkPad) and all Pis
2. SSH into server and attach to the running session:
   ```
   ssh david@10.0.0.1
   tmux -S /tmp/dauerwelle.sock attach -t dauerwelle
   ```
   The server starts automatically and begins drift mode as Pis connect.

3. If the server session doesn't exist (e.g. first boot after setup):
   ```
   bash /home/david/server/start.sh
   ```

Detach from tmux without stopping anything: `Ctrl+Space, D`

---

## Check Pi status

```
ssh pi@10.0.0.2
tmux -S /tmp/dauerwelle.sock attach -t dauerwelle
```

Replace `10.0.0.2` with the Pi's IP (`10.0.0.2` – `10.0.0.5`).

Detach: `Ctrl+Space, D`

---

## Server commands

```
drift          start drift mode (default on startup)
stop           stop all screens
stop 2         stop screen 2 only
play 03 on 2   play clip 03 on screen 2
scatter        play a random clip on every screen
restart        restart all Pi clients
quit           stop the server (keeps terminal open)
```

---

## Something is stuck / not playing

**One screen stuck:** stop and let drift continue
```
stop 2
```

**Drift stopped completely:** restart drift
```
drift
```

**A Pi not responding:** restart all clients
```
restart
```
Clients reconnect within 5 seconds and drift resumes.

**Still stuck:** restart the specific Pi manually
```
ssh pi@10.0.0.X
tmux -S /tmp/dauerwelle.sock attach -t dauerwelle
# Ctrl+C to stop, then:
bash /home/pi/client/start.sh
```

---

## Server crashed / not running

```
ssh david@10.0.0.1
bash /home/david/server/start.sh
```

Pis reconnect automatically within 5 seconds.

---

## Check logs

```
# Server
tail -f /home/david/server/logs/server.log

# Pi (SSH in first)
tail -f /home/pi/client/logs/client.log
```

---

## Pi IPs

| Screen | IP        |
|--------|-----------|
| Pi 1   | 10.0.0.2  |
| Pi 2   | 10.0.0.3  |
| Pi 3   | 10.0.0.4  |
| Pi 4   | 10.0.0.5  |
