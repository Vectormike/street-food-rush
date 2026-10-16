#!/usr/bin/env bash
# Run preview + purchase server + HTTPS tunnels for Vatar sandbox testing.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v cloudflared >/dev/null; then
  echo "Install cloudflared: brew install cloudflared"
  exit 1
fi

export $(grep -v '^#' .env | xargs)
npm run build

pkill -f "vite preview" 2>/dev/null || true
pkill -f "tsx server/index" 2>/dev/null || true
sleep 1

npm run preview -- --host 127.0.0.1 --port 4173 &
PREVIEW_PID=$!
npm run server &
SERVER_PID=$!

sleep 2

LOG_GAME="/tmp/street-food-rush-game-tunnel.log"
LOG_SERVER="/tmp/street-food-rush-server-tunnel.log"
: >"$LOG_GAME"
: >"$LOG_SERVER"

cloudflared tunnel --url http://127.0.0.1:4173 2>&1 | tee "$LOG_GAME" &
cloudflared tunnel --url http://127.0.0.1:8080 2>&1 | tee "$LOG_SERVER" &

echo "Waiting for tunnel URLs..."
GAME_URL=""
SERVER_URL=""
for _ in $(seq 1 30); do
  GAME_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG_GAME" | head -1 || true)
  SERVER_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG_SERVER" | head -1 || true)
  if [[ -n "$GAME_URL" && -n "$SERVER_URL" ]]; then break; fi
  sleep 1
done

if [[ -z "$GAME_URL" || -z "$SERVER_URL" ]]; then
  echo "Could not read tunnel URLs. Check $LOG_GAME and $LOG_SERVER"
  exit 1
fi

echo "GAME_URL=$GAME_URL"
echo "SERVER_URL=$SERVER_URL"
cat >"$ROOT/review/current-urls.env" <<EOF
# Regenerated $(date -u +%Y-%m-%dT%H:%M:%SZ). Paste into Vatar dashboard → Listing, then Save.
GAME_URL=$GAME_URL/
WEBHOOK_URL=$SERVER_URL/vatar-webhook
EOF

echo ""
echo "Update .env VITE_SERVER_URL and GAME_ORIGIN, then npm run build && kill -HUP $PREVIEW_PID 2>/dev/null || npm run preview ..."
echo "Dashboard Listing → Game URL: ${GAME_URL}/"
echo "Dashboard Listing → Webhook: ${SERVER_URL}/vatar-webhook"
echo ""
echo "Preview PID $PREVIEW_PID, server PID $SERVER_PID. Ctrl+C stops this shell; kill tunnels manually if needed."

wait
