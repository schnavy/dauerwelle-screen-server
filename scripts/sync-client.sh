#!/bin/bash
# requires: brew install sshpass
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENTS="$SCRIPT_DIR/../server/clients.json"
CLIENT_FILE="$SCRIPT_DIR/../client/client-pi.js"

while IFS= read -r row; do
  user=$(echo "$row" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['user'])")
  host=$(echo "$row" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['host'])")
  pass=$(echo "$row" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['password'])")
  echo "==> Syncing client-pi.js to $user@$host:/home/$user/client/"
  sshpass -p "$pass" rsync -avz --progress -e "ssh -o StrictHostKeyChecking=no" "$CLIENT_FILE" "$user@$host:/home/$user/client/client-pi.js"
done < <(python3 -c "import json; [print(json.dumps(c)) for c in json.load(open('$CLIENTS'))]")
