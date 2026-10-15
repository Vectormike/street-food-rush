# Vatar submission packet — Street Food Rush

Use this file when filling in the Lagos Life / Vatar developer dashboard. Local checks and store assets are ready in this folder.

## Game URL (fill after deploy)

Source repo: https://github.com/Vectormike/street-food-rush

Import to Vercel (uses `vercel.json` CSP): https://vercel.com/new/import?s=https%3A%2F%2Fgithub.com%2FVectormike%2Fstreet-food-rush

Or Netlify (uses `netlify.toml`): connect the same repo; build `npm run build`, publish `dist`.

Then paste the production URL here:

```
GAME_URL=
```

Verify headers:

```bash
curl -sI "GAME_URL" | grep -i content-security-policy
```

Expected substring: `frame-ancestors https://lagoslife.app`

Support and privacy (same origin, linked from the game):

- `GAME_URL/support.html`
- `GAME_URL/privacy.html`

## Purchase server URL (optional cosmetic)

If you offer `ankara_counter` inside Lagos Life, deploy the Node server (`npm run server`) separately and set these before `npm run build`:

- `VITE_SERVER_URL` → public HTTPS origin of the purchase server (client)
- Server env: `VATAR_SECRET`, `VATAR_WEBHOOK_SECRET`, `GAME_ORIGIN` (your `GAME_URL`), `VATAR_API_BASE`, `PORT`

Product id (must match dashboard): **`ankara_counter`**

## Store listing copy

**Short** (from `listing.md`):

> Cook jollof, suya, egusi, puff-puff and more for Lagos customers in 90-second shifts.

**Long:** see `listing.md` § Long description.

**Category:** Casual, solo.

## Assets to upload

| Asset | Path |
|-------|------|
| Icon 512×512 | `review/icon-512.png` |
| Screenshot 1 | `review/screenshots/01-home.png` |
| Screenshot 2 | `review/screenshots/02-shop.png` |
| Screenshot 3 | `review/screenshots/03-tutorial.png` |
| Screenshot 4 | `review/screenshots/04-kitchen.png` |
| Screenshot 5 | `review/screenshots/05-pause.png` |

## Dashboard checklist (your Lagos Life account)

1. [Developer keys](https://lagoslife.app/developers/keys) — submit while signed in; store test secret outside the repo.
2. Vatar dashboard — create product **`ankara_counter`**.
3. Set game URL to **`GAME_URL`**; configure webhook to purchase server `/vatar-webhook` if using cosmetics.
4. Open **sandbox** — confirm init, pause/resume, score, leaderboard, test purchase.
5. Upload icon, screenshots, descriptions above.
6. **Submit for review** in the Vatar dashboard.

Live API credentials are issued after approval. Keep test and live data separate.
