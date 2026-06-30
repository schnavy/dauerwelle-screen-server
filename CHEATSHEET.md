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

Plug the laptop into the switch. Set its IP to the same subnet:

```
# Mac:
System Settings → Network → Ethernet → Manual
IP: 10.0.0.9   Subnet: 255.255.255.0   Router: (leave empty)

# Ubuntu/Linux:
sudo nmcli con mod "Wired connection 1" ipv4.addresses 10.0.0.9/24 ipv4.method manual
sudo nmcli con up "Wired connection 1"
```

Verify connection: `ping 10.0.0.1`

---

## SSH into server

```
ssh david@10.0.0.1
```
Password: `david`

Attach to the running session:
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
```
Password: `pi`

Attach to the running session:
```
tmux -S /tmp/dauerwelle.sock attach -t dauerwelle
```

Detach: `Ctrl+B, D`

| Screen | IP       |
|--------|----------|
| Pi 1   | 10.0.0.2 |
| Pi 2   | 10.0.0.3 |
| Pi 3   | 10.0.0.4 |
| Pi 4   | 10.0.0.5 |

---

## Check logs (via SSH)

```
# Server
tail -f /home/david/server/logs/server.log

# Pi
tail -f /home/pi/client/logs/client.log
```
