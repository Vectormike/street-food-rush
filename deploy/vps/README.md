# Purchase server on a VPS

Deploy the Node purchase server (`npm run server`) on Ubuntu 22.04+ (or similar). The static game stays on Vercel; only this API runs on the VPS.

## What you need

- A domain or subdomain, e.g. `api.yourdomain.com` → A record to the VPS IP
- Vatar **game secret** and **webhook secret** (dashboard)
- HTTPS (Let's Encrypt via Certbot)

## 1. Server setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx certbot python3-certbot-nginx ufw
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Install Node 22 (example: NodeSource):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v22.x
```

Create an unprivileged user:

```bash
sudo adduser --disabled-password --gecos '' streetfood
sudo mkdir -p /opt/street-food-rush/data
sudo chown -R streetfood:streetfood /opt/street-food-rush
```

## 2. App code

As `streetfood`:

```bash
sudo -u streetfood -i
cd /opt/street-food-rush
git clone https://github.com/Vectormike/street-food-rush.git .
npm ci
```

Create `/opt/street-food-rush/.env` (see `deploy/vps/env.production.example`). At minimum:

- `VATAR_SECRET`, `VATAR_WEBHOOK_SECRET`
- `GAME_ORIGIN=https://lagoslifesocialmedia.vercel.app,https://lagoslife.app`
- `ENTITLEMENTS_PATH=/opt/street-food-rush/data/entitlements.json`
- `PORT=8080`

Test once:

```bash
npm run server
curl -s http://127.0.0.1:8080/health
# {"ok":true}
```

Ctrl+C, then install systemd (below).

## 3. systemd

```bash
sudo cp /opt/street-food-rush/deploy/vps/street-food-rush.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now street-food-rush
sudo systemctl status street-food-rush
journalctl -u street-food-rush -f
```

## 4. nginx + TLS

```bash
sudo cp /opt/street-food-rush/deploy/vps/nginx.conf.example /etc/nginx/sites-available/street-food-rush
# Edit server_name to your hostname
sudo nano /etc/nginx/sites-available/street-food-rush
sudo ln -sf /etc/nginx/sites-available/street-food-rush /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

Public check:

```bash
curl -s https://api.yourdomain.com/health
```

## 5. Vercel + Vatar

**Vercel** (game, Production env):

- `VITE_SERVER_URL=https://api.yourdomain.com`  
  Redeploy after changing.

**Vatar dashboard → Listing** (when allowed to edit):

- **Webhook URL:** `https://api.yourdomain.com/vatar-webhook`
- **Game URL:** `https://lagoslifesocialmedia.vercel.app/`

Sandbox: **Send test webhook** and run a test purchase.

## Updates

```bash
sudo -u streetfood -i
cd /opt/street-food-rush
git pull
npm ci
exit
sudo systemctl restart street-food-rush
```

## Firewall note

The Node app listens on `8080` on localhost only is **not** configured in code—it binds all interfaces. With ufw, only 22/80/443 are open, so `8080` is not exposed publicly if you do not `ufw allow 8080`. nginx terminates TLS and proxies to `127.0.0.1:8080`.
