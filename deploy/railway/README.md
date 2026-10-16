# Purchase server on Railway

Deploy **only the Node API** (`npm run server`). Keep the game on **Vercel**.

## 1. Create the service

1. [Railway](https://railway.app) → **New Project** → **Deploy from GitHub repo** → `street-food-rush` (this repo).
2. If Railway picks the wrong start command, set **Settings → Deploy**:
   - **Build command:** `npm ci` (or leave empty; `railway.toml` sets this)
   - **Start command:** `npm run server`
3. **Settings → Networking → Generate domain** (e.g. `street-food-rush-production.up.railway.app`).

Health check (optional): path **`/health`**, already set in `railway.toml`.

## 2. Persistent volume (entitlements)

Without a volume, grants reset on redeploy.

1. Service → **Volumes** → **Add volume**
2. **Mount path:** `/data`
3. Set variable:

   ```env
   ENTITLEMENTS_PATH=/data/entitlements.json
   ```

## 3. Environment variables

Service → **Variables** (never commit these):

| Variable | Value |
|----------|--------|
| `VATAR_SECRET` | Game secret from Vatar dashboard |
| `VATAR_WEBHOOK_SECRET` | Webhook signing secret |
| `VATAR_API_BASE` | `https://lagoslife.app/api/games/v1` |
| `GAME_ORIGIN` | `https://lagoslifesocialmedia.vercel.app,https://lagoslife.app` |
| `ENTITLEMENTS_PATH` | `/data/entitlements.json` (with volume) |
| `HOST` | `0.0.0.0` (optional; default in code) |

**Do not set `PORT`** — Railway injects it automatically.

Redeploy after saving variables.

## 4. Verify

```bash
curl -s https://YOUR-RAILWAY-DOMAIN.up.railway.app/health
# {"ok":true}
```

In Vatar sandbox: **Send test webhook** (Listing webhook must point at your Railway URL).

## 5. Connect the game (Vercel)

**Vercel** → project → **Environment Variables** (Production):

```env
VITE_SERVER_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
```

No trailing slash. **Redeploy** the Vercel production build.

## 6. Vatar listing

When you are allowed to edit listing (saving while **in review** can revert to draft):

- **Webhook URL:** `https://YOUR-RAILWAY-DOMAIN.up.railway.app/vatar-webhook`
- **Game URL:** unchanged — `https://lagoslifesocialmedia.vercel.app/`

## CLI (optional)

```bash
npm i -g @railway/cli
railway login
cd /path/to/street-food-rush
railway link
railway up
railway variables set VATAR_SECRET=... # etc.
```

## Custom domain

Railway → **Settings → Networking → Custom Domain** → add `api.yourdomain.com`, then use that URL for `VITE_SERVER_URL` and the webhook instead of `*.up.railway.app`.
