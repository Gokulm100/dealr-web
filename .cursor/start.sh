#!/usr/bin/env bash
# Per-boot service reconciliation. Starts MongoDB (a background daemon) and
# returns. The backend API and web dev server run as named terminals (see
# environment.json) so their logs stay visible and restartable.
set -euo pipefail

MONGO_DATA_DIR="${MONGO_DATA_DIR:-/var/lib/mongodb}"
MONGO_LOG_DIR="${MONGO_LOG_DIR:-/var/log/mongodb}"

log() { printf '\n\033[1;32m[start]\033[0m %s\n' "$*"; }

# --- MongoDB ---
if ! command -v mongod >/dev/null 2>&1; then
  log "mongod not installed; run .cursor/install.sh first. Skipping."
  exit 0
fi

sudo mkdir -p "$MONGO_DATA_DIR" "$MONGO_LOG_DIR"
sudo chown -R "$(id -u):$(id -g)" "$MONGO_DATA_DIR" "$MONGO_LOG_DIR"

if (ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null) | grep -q ':27017'; then
  log "MongoDB already listening on 27017"
else
  log "Starting MongoDB on 127.0.0.1:27017"
  mongod --dbpath "$MONGO_DATA_DIR" --bind_ip 127.0.0.1 --port 27017 \
    --logpath "$MONGO_LOG_DIR/mongod.log" --fork
fi

# Wait for MongoDB to accept connections (best effort).
for i in $(seq 1 30); do
  if (ss -ltn 2>/dev/null || netstat -ltn 2>/dev/null) | grep -q ':27017'; then
    log "MongoDB is ready"
    break
  fi
  sleep 1
done

log "Start reconciliation complete."
