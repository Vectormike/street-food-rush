#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ ! -f .env ]]; then
  echo "Missing .env in repo root (server secrets)."
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

GAME_ORIGIN="${GAME_ORIGIN:-https://lagoslifesocialmedia.vercel.app,https://lagoslife.app}"
ENTITLEMENTS_PATH="${ENTITLEMENTS_PATH:-/tmp/street-food-rush-entitlements.json}"

echo "Deploying purchase API (vercel.server.json)…"
# Hobby teams may block CLI deploys when .git commit author is not a project member; deploy without .git if needed.
npx vercel@latest deploy --prod --yes --local-config vercel.server.json --project street-food-rush-api

echo "Setting API project env (production)…"
for key in VATAR_SECRET VATAR_WEBHOOK_SECRET VATAR_API_BASE; do
  val="${!key:-}"
  if [[ -z "$val" ]]; then
    echo "Skip empty $key"
    continue
  fi
  npx vercel@latest env add "$key" production --value "$val" --force --yes --project street-food-rush-api
done
npx vercel@latest env add GAME_ORIGIN production --value "$GAME_ORIGIN" --force --yes --project street-food-rush-api
npx vercel@latest env add ENTITLEMENTS_PATH production --value "$ENTITLEMENTS_PATH" --force --yes --project street-food-rush-api

echo "Redeploy API after env…"
API_URL="$(npx vercel@latest deploy --prod --yes --local-config vercel.server.json --project street-food-rush-api)"
API_URL="${API_URL%/}"
echo "API_URL=$API_URL"

echo "Updating game project VITE_SERVER_URL…"
npx vercel@latest env add VITE_SERVER_URL production --value "$API_URL" --force --yes --project lagoslifesocialmedia
npx vercel@latest deploy --prod --yes --project lagoslifesocialmedia

echo "Done. Set Vatar webhook to ${API_URL}/vatar-webhook"
