#!/usr/bin/env bash
# Sync nginx site configs + ensure wavelens.online SSL cert exists.
# Called from deploy.sh on the server (root). Safe to run manually:
#   bash deploy/sync-nginx.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@wavelens.online}"
WAVELENS_CERT="/etc/letsencrypt/live/wavelens.online/fullchain.pem"

if ! command -v nginx >/dev/null || [ ! -d /etc/nginx/sites-available ]; then
  echo "nginx not installed — skipping site sync"
  exit 0
fi

mkdir -p /var/www/wavelens-website

# Request cert BEFORE copying :443 config (nginx -t needs cert files to exist).
if command -v certbot >/dev/null; then
  if [ ! -f "$WAVELENS_CERT" ]; then
    echo "==> No cert at $WAVELENS_CERT — requesting Let's Encrypt certificate..."
    certbot certonly --webroot -w /var/www/wavelens-website \
      -d wavelens.online -d www.wavelens.online \
      --non-interactive --agree-tos -m "$CERTBOT_EMAIL" \
      || {
        echo "ERROR: certbot failed for wavelens.online"
        echo "  Fix DNS (A records for wavelens.online + www) then run:"
        echo "  certbot certonly --webroot -w /var/www/wavelens-website -d wavelens.online -d www.wavelens.online"
        exit 1
      }
  fi
else
  echo "WARN: certbot not found — install certbot if HTTPS is missing"
  if [ ! -f "$WAVELENS_CERT" ]; then
    echo "ERROR: no SSL cert and no certbot — HTTPS will not work"
    exit 1
  fi
fi

echo "==> Sync nginx configs from $ROOT/deploy/nginx/"
cp "$ROOT/deploy/nginx/wavelens.online.conf"        /etc/nginx/sites-available/wavelens.online
cp "$ROOT/deploy/nginx/api.wavelens.online.conf"    /etc/nginx/sites-available/api.wavelens.online
cp "$ROOT/deploy/nginx/studio.wavelens.online.conf" /etc/nginx/sites-available/studio.wavelens.online

ln -sf /etc/nginx/sites-available/wavelens.online        /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/api.wavelens.online    /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/studio.wavelens.online /etc/nginx/sites-enabled/

nginx -t
systemctl reload nginx

if command -v certbot >/dev/null; then
  certbot renew --quiet --deploy-hook "systemctl reload nginx" 2>/dev/null || true
fi

echo "==> Nginx + SSL OK"
echo "    https://wavelens.online/"
echo "    https://api.wavelens.online/"
echo "    https://studio.wavelens.online/"
