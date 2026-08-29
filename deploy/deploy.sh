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
echo "==> [1/6] Pulling latest code"
git pull --ff-only

echo ""
echo "==> [2/6] Backend: install + migrate + build"
cd "$ROOT/backend"
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
# Seed is idempotent (upserts) — keeps the filter catalog & configs in sync.
npm run prisma:seed

echo ""
echo "==> [3/6] Backend: restart"
pm2 restart wavelens-api --update-env 2>/dev/null \
  || pm2 start npm --name wavelens-api --cwd "$ROOT/backend" -- run start

echo ""
echo "==> [4/6] Dashboard: install + build"
cd "$ROOT/dashboard"
npm install
npm run build

echo ""
echo "==> [5/6] Dashboard: restart"
pm2 restart wavelens-studio --update-env 2>/dev/null \
  || pm2 start npm --name wavelens-studio --cwd "$ROOT/dashboard" -- run start

echo ""
echo "==> [6/6] Save pm2 process list"
pm2 save

echo ""
echo "==> Deploy complete"
pm2 list
