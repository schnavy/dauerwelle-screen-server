#!/bin/bash
# requires: brew install sshpass
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENTS="$SCRIPT_DIR/../server/clients.json"
CLIENT_FILE="$SCRIPT_DIR/../client/client-pi.js"

while IFS= read -r row; do
  user=$(echo "$row" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['user'])")
  host=$(echo "$row" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['host'])")
  pass=$(echo "$row" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['password'])")
  echo "==> Syncing client files to $user@$host:/home/$user/client/"
  sshpass -p "$pass" rsync -avz --progress --exclude="node_modules" --exclude="package-lock.json" \
    -e "ssh -o StrictHostKeyChecking=no" \
    "$SCRIPT_DIR/../client/" \
    "$user@$host:/home/$user/client/"
  sshpass -p "$pass" ssh -n -o StrictHostKeyChecking=no "$user@$host" "chmod +x /home/$user/client/start.sh"
  sshpass -p "$pass" ssh -n -o StrictHostKeyChecking=no "$user@$host" \
    "(crontab -l 2>/dev/null | grep -v dauerwelle; echo '@reboot /usr/bin/tmux -S /tmp/dauerwelle.sock new-session -d -s dauerwelle \"bash /home/$user/client/start.sh\"') | crontab -"
  echo "  Crontab updated on $host"
done < <(python3 -c "import json; [print(json.dumps(c)) for c in json.load(open('$CLIENTS')) if c.get('active')]")
