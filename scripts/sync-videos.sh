#!/bin/bash
# requires: brew install sshpass
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENTS="$SCRIPT_DIR/../server/clients.json"
VIDEOS_DIR="$SCRIPT_DIR/../videos"

while IFS= read -r row; do
  user=$(echo "$row" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['user'])")
  host=$(echo "$row" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['host'])")
  pass=$(echo "$row" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['password'])")
  path=$(echo "$row" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['videoPath'])")
  echo "==> Syncing videos to $user@$host:$path"
  sshpass -p "$pass" rsync -avz --progress -e "ssh -o StrictHostKeyChecking=no" "$VIDEOS_DIR/" "$user@$host:$path/"
done < <(python3 -c "import json; [print(json.dumps(c)) for c in json.load(open('$CLIENTS'))]")
