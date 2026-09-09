#!/usr/bin/env bash
# Idempotent dependency + local-config bootstrap for the Dealr full stack.
# Runs after the repositories are checked out. Safe to run repeatedly.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$(dirname "$SCRIPT_DIR")"
REPOS_DIR="$(dirname "$WEB_DIR")"
BACKEND_DIR="$REPOS_DIR/dealr-backend"
MOBILE_DIR="$REPOS_DIR/dealr-mobile"

log() { printf '\n\033[1;34m[install]\033[0m %s\n' "$*"; }

# --- MongoDB (only if not already present in the base image/snapshot) ---
if ! command -v mongod >/dev/null 2>&1; then
  log "Installing MongoDB 8.0 (not found in base image)"
  . /etc/os-release
  curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
    | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${VERSION_CODENAME:-noble}/mongodb-org/8.0 multiverse" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y mongodb-org
else
  log "MongoDB already installed: $(mongod --version | head -1)"
fi

# --- Web (primary repo) ---
log "Installing web dependencies (dealr-web)"
(cd "$WEB_DIR" && npm install)

# --- Backend ---
if [ -d "$BACKEND_DIR" ]; then
  log "Installing backend dependencies (dealr-backend)"
  (cd "$BACKEND_DIR" && npm install)

  # Generate a local-only dummy Firebase service account so firebase-admin can
  # initialize offline. This is NOT a real credential; push notifications are
  # inert locally. Never commit this file.
  if [ ! -f "$BACKEND_DIR/serviceAccountKey.json" ]; then
    log "Generating local dummy Firebase service account"
    (cd "$BACKEND_DIR" && node -e '
      const fs=require("fs");
      const key=require("child_process").execSync("openssl genrsa 2048 2>/dev/null").toString();
      const sa={type:"service_account",project_id:"dealr-local-dev",
        private_key_id:"localdevkey0000000000000000000000000000",private_key:key,
        client_email:"local-dev@dealr-local-dev.iam.gserviceaccount.com",client_id:"000000000000000000000",
        auth_uri:"https://accounts.google.com/o/oauth2/auth",token_uri:"https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:"https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url:"https://www.googleapis.com/robot/v1/metadata/x509/local-dev%40dealr-local-dev.iam.gserviceaccount.com"};
      fs.writeFileSync("serviceAccountKey.json",JSON.stringify(sa,null,2));
      console.log("wrote serviceAccountKey.json");
    ')
  fi

  # Generate a local .env for the backend if missing.
  if [ ! -f "$BACKEND_DIR/.env" ]; then
    log "Writing backend .env (local dev defaults)"
    cat > "$BACKEND_DIR/.env" <<'EOF'
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/dealr
JWT_SECRET=local-dev-jwt-secret-change-me
GOOGLE_CLIENT_ID=local-dev-google-client-id.apps.googleusercontent.com
ADMIN_EMAILS=admin@dealr.local
CRON_SECRET=local-dev-cron-secret
EOF
  fi
else
  log "dealr-backend not found next to dealr-web; skipping backend setup"
fi

# --- Mobile ---
if [ -d "$MOBILE_DIR" ]; then
  log "Installing mobile dependencies (dealr-mobile)"
  (cd "$MOBILE_DIR" && npm install)
else
  log "dealr-mobile not found next to dealr-web; skipping mobile setup"
fi

log "Install complete."
