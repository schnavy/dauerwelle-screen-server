# Dauerwelle – Exhibition Cheatsheet

---

## Morning startup

1. Power on the server (ThinkPad) and all Pis — everything starts automatically
2. Drift mode begins as soon as the Pis connect to the server (Server can take a few minutes to boot up)

Nothing else required.

---

## Evening / end of day

Just power everything off. No graceful shutdown needed.

---

## Something is stuck / not playing

**Try this first — power cycle the affected Pi.**
Unplug and replug the Pi. It restarts automatically and reconnects within ~30 seconds.

If multiple screens are stuck:

**Power cycle all Pis.** Unplug and replug them all. They reconnect and drift resumes.

**If the server itself seems frozen:** power cycle the ThinkCentre.
Everything restarts automatically.

---

## Debugging via laptop

Tehre is a Lenovo Thinkpad in the Kitchen. Plug the laptop into the switch with an extra Ethernet Cable.
```
user: t450s
pw: t450s
```

## SSH into server

```
ssh david@10.0.0.1
```
Password: `david`

Attach to the running session (see what is happening):
```
tmux -S /tmp/dauerwelle.sock attach -t dauerwelle
```

Detach without stopping anything: `Ctrl+B, D`

If no session exists (first boot after reinstall):
```
bash /home/david/server/start.sh
```

---

## Server commands

Type these in the server tmux session:

```
drift             restart drift mode
stop              stop all screens
stop 2            stop screen 2 only
play 03 on 2      play clip 03 on screen 2
scatter           play a random clip on every screen simultaneously
testpattern       show test image on all screens
restart           restart all Pi clients (reconnect within 5s)
quit              stop the server (keeps terminal open)
```

---

## SSH into a Pi

```
ssh pi@10.0.0.2

(the IP has to match the Pi. List of IP at bottom of this file)
```
Password: `pi`

Attach to the running session:
```
tmux -S /tmp/dauerwelle.sock attach -t dauerwelle
```

Detach: `Ctrl+B, D`

| Device id (Pi) | IP       |
|----------------|----------|
| 2              | 10.0.0.2 |
| 3              | 10.0.0.3 |
| 4              | 10.0.0.4 |
| 5              | 10.0.0.5 |
| 6              | 10.0.0.6 |

---

## Check logs (via SSH)

```
# Server
tail -f /home/david/server/logs/server.log

# Pi
tail -f /home/pi/client/logs/client.log
```
