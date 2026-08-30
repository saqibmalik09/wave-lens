#!/usr/bin/env bash
# Wave Lens one-command server deploy.
#
#   cd ~/wave-lens && npm run deploy
#
# Pulls latest code, then: backend (install → migrate → build → seed → restart)
# and dashboard (install → build → restart). Fails fast on any error, so a broken
# build never restarts a service with stale/partial output.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo ""
echo "==> [1/8] Pulling latest code"
git pull --ff-only

echo ""
echo "==> [2/8] Backend: install + migrate + build"
cd "$ROOT/backend"
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
# Seed is idempotent (upserts) — keeps the filter catalog & configs in sync.
npm run prisma:seed

echo ""
echo "==> [3/8] Backend: restart"
pm2 restart wavelens-api --update-env 2>/dev/null \
  || pm2 start npm --name wavelens-api --cwd "$ROOT/backend" -- run start

echo ""
echo "==> [4/8] Dashboard: install + build"
cd "$ROOT/dashboard"
npm install
npm run build

echo ""
echo "==> [5/8] Dashboard: restart"
pm2 restart wavelens-studio --update-env 2>/dev/null \
  || pm2 start npm --name wavelens-studio --cwd "$ROOT/dashboard" -- run start

echo ""
echo "==> [6/8] Website: copy static files to /var/www/wavelens-website"
mkdir -p /var/www/wavelens-website
BUILD_ID="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%s)"
STAGE="$(mktemp -d)"
cp -r "$ROOT/website/"* "$STAGE/"
# Cache-bust CSS + hero image so deploys show immediately (nginx may still cache assets separately).
for page in "$STAGE"/*.html; do
  [ -f "$page" ] || continue
  sed -i "s|/styles.css|/styles.css?v=${BUILD_ID}|g" "$page"
  sed -i "s|mobile-live-filters-mockup.png|mobile-live-filters-mockup.png?v=${BUILD_ID}|g" "$page"
done
cp -r "$STAGE/"* /var/www/wavelens-website/
rm -rf "$STAGE"
echo "    Published website (build ${BUILD_ID})"

echo ""
echo "==> [7/8] Nginx + SSL (wavelens.online HTTPS)"
bash "$ROOT/deploy/sync-nginx.sh"

echo ""
echo "==> [8/8] Save pm2 process list"
pm2 save

echo ""
echo "==> Deploy complete"
pm2 list
