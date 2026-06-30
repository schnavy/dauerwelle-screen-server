#!/bin/bash
# requires: brew install sshpass
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/../server"

SERVER_HOST="10.0.0.1"
SERVER_USER="david"
SERVER_PASS="david"
REMOTE_DIR="/home/david/server"

echo "==> Syncing server/ to $SERVER_USER@$SERVER_HOST:$REMOTE_DIR"
sshpass -p "$SERVER_PASS" rsync -avz --progress -e "ssh -o StrictHostKeyChecking=no" "$SERVER_DIR/" "$SERVER_USER@$SERVER_HOST:$REMOTE_DIR/"

echo "==> Syncing dauerwelle-server.service to $SERVER_USER@$SERVER_HOST:/tmp/"
sshpass -p "$SERVER_PASS" rsync -avz --progress -e "ssh -o StrictHostKeyChecking=no" "$SCRIPT_DIR/dauerwelle-server.service" "$SERVER_USER@$SERVER_HOST:/tmp/"
