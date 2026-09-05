#!/usr/bin/env bash
# Simple Wave Lens deploy (run on the server):
#   npm run deploy              # all: pull + backend + dashboard + website
#   npm run deploy:backend
#   npm run deploy:dashboard
#   npm run deploy:website
#
# Nginx/SSL (one-time / when configs change):
#   bash deploy/sync-nginx.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TARGET="${1:-all}"

deploy_backend() {
  echo "==> Backend"
  cd "$ROOT/backend"
  npm install
  npx prisma migrate deploy
  npx prisma generate
  npm run build
  pm2 restart wavelens-api --update-env 2>/dev/null \
    || pm2 start npm --name wavelens-api --cwd "$ROOT/backend" -- run start
}

deploy_dashboard() {
  echo "==> Dashboard"
  cd "$ROOT/dashboard"
  npm install
  npm run build
  pm2 restart wavelens-studio --update-env 2>/dev/null \
    || pm2 start npm --name wavelens-studio --cwd "$ROOT/dashboard" -- run start
}

deploy_website() {
  echo "==> Website"
  mkdir -p /var/www/wavelens-website
  cp -r "$ROOT/website/"* /var/www/wavelens-website/
}

case "$TARGET" in
  all)
    echo "==> Pull"
    git pull --ff-only
    deploy_backend
    deploy_dashboard
    deploy_website
    ;;
  backend)
    deploy_backend
    ;;
  dashboard)
    deploy_dashboard
    ;;
  website)
    deploy_website
    ;;
  *)
    echo "Usage: bash deploy/deploy.sh [all|backend|dashboard|website]"
    exit 1
    ;;
esac

pm2 save 2>/dev/null || true
echo "==> Done ($TARGET)"
pm2 list 2>/dev/null || true
