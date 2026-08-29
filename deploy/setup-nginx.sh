#!/bin/bash
# Run on the droplet as root from ~/wave-lens
# Usage: bash deploy/setup-nginx.sh

set -e

REPO_DIR="${REPO_DIR:-/root/wave-lens}"

echo "Installing Nginx site configs from $REPO_DIR/deploy/nginx/ ..."

cp "$REPO_DIR/deploy/nginx/wavelens.online.conf"       /etc/nginx/sites-available/wavelens.online
cp "$REPO_DIR/deploy/nginx/api.wavelens.online.conf"   /etc/nginx/sites-available/api.wavelens.online
cp "$REPO_DIR/deploy/nginx/studio.wavelens.online.conf" /etc/nginx/sites-available/studio.wavelens.online

mkdir -p /var/www/wavelens-website
cp -r "$REPO_DIR/website/"* /var/www/wavelens-website/

ln -sf /etc/nginx/sites-available/wavelens.online        /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/api.wavelens.online    /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/studio.wavelens.online /etc/nginx/sites-enabled/

nginx -t
systemctl reload nginx

echo ""
echo "Nginx OK."
echo ""
echo "IMPORTANT — re-apply SSL after updating nginx configs:"
echo "  certbot --nginx -d api.wavelens.online"
echo "  certbot --nginx -d studio.wavelens.online"
echo ""
echo "Test API:"
echo '  curl "http://api.wavelens.online/v1/license/status?client_id=wl_demo_client&client_secret=wl_demo_secret&bundle_id=com.wavelens.demo"'
