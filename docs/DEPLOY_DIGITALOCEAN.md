# Deploy Wave Lens on DigitalOcean (wavelens.online)

Your DNS is already correct — all three A records point to **168.144.65.62**:

| Domain | Purpose | What runs there |
|---|---|---|
| `wavelens.online` | Public marketing site | Static HTML (`website/`) |
| `api.wavelens.online` | License API | NestJS backend (port 5000) |
| `studio.wavelens.online` | Admin + tenant dashboard | Next.js (port 3001, Phase 6) |

Everything below assumes **one Ubuntu Droplet** at that IP.

---

## 1. Server setup (once)

SSH into the droplet:

```bash
ssh root@168.144.65.62
```

Install basics:

```bash
apt update && apt upgrade -y
apt install -y nginx mysql-server git ufw certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
```

Firewall:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 2. MySQL database

```bash
mysql -u root -p
```

```sql
CREATE DATABASE wave_lens CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wave_lens'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON wave_lens.* TO 'wave_lens'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Deploy backend → `api.wavelens.online`

```bash
mkdir -p /var/www/wave-lens
cd /var/www/wave-lens
git clone YOUR_REPO_URL .
cd backend
npm install
```

Create `/var/www/wave-lens/backend/.env`:

```env
DATABASE_URL="mysql://wave_lens:STRONG_PASSWORD_HERE@127.0.0.1:3306/wave_lens"
PORT=5000
```

Run migrations + seed:

```bash
npx prisma migrate deploy
npm run prisma:seed
npm run build
pm2 start dist/main.js --name wavelens-api
pm2 save
pm2 startup
```

Nginx config `/etc/nginx/sites-available/api.wavelens.online`:

```nginx
server {
    listen 80;
    server_name api.wavelens.online;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable + SSL:

```bash
ln -s /etc/nginx/sites-available/api.wavelens.online /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.wavelens.online
```

Test:

```bash
curl "https://api.wavelens.online/v1/license/status?client_id=wl_demo_client&client_secret=wl_demo_secret&bundle_id=com.wavelens.demo"
```

---

## 4. Deploy website → `wavelens.online`

Copy static files:

```bash
mkdir -p /var/www/wavelens-website
# From your dev machine:
# scp -r website/* root@168.144.65.62:/var/www/wavelens-website/
```

Or on server after git clone:

```bash
cp -r /var/www/wave-lens/website/* /var/www/wavelens-website/
```

Nginx config `/etc/nginx/sites-available/wavelens.online`:

```nginx
server {
    listen 80;
    server_name wavelens.online www.wavelens.online;
    root /var/www/wavelens-website;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(css|js|svg|png|jpg|webp|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable + SSL:

```bash
ln -s /etc/nginx/sites-available/wavelens.online /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d wavelens.online -d www.wavelens.online
```

**Before go-live:** edit `website/index.html` and replace:
- Phone: `+92 300 1234567`
- Email: `support@wavegames.com`

---

## 5. Deploy dashboard → `studio.wavelens.online` (when ready)

Dashboard is Phase 6 — placeholder for now. When built (Next.js):

```bash
cd /var/www/wave-lens/dashboard
npm install
npm run build
pm2 start npm --name wavelens-studio -- start -- -p 3001
```

Nginx `/etc/nginx/sites-available/studio.wavelens.online`:

```nginx
server {
    listen 80;
    server_name studio.wavelens.online;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/studio.wavelens.online /etc/nginx/sites-enabled/
certbot --nginx -d studio.wavelens.online
```

Until dashboard exists, you can show a simple "Coming soon" page on studio using the same static-site pattern as the main site.

---

## 6. Point Android SDK to production

In tenant apps:

```kotlin
WaveLens.init(
    context = this,
    clientId = "YOUR_CLIENT_ID",
    clientSecret = "YOUR_CLIENT_SECRET",
    baseUrl = "https://api.wavelens.online"
)
```

---

## 7. Future: filter assets CDN

When sticker packs / LUTs go to CDN, add:

```text
assets.wavelens.online  →  DigitalOcean Spaces + CDN
```

That keeps the API droplet light; only ~1 KB license JSON hits your server.

---

## Quick checklist

- [ ] DNS A records → 168.144.65.62 (done)
- [ ] MySQL + `wave_lens` database
- [ ] Backend on PM2 port 5000
- [ ] Nginx + SSL for api, wavelens.online, studio
- [ ] Website files in `/var/www/wavelens-website`
- [ ] Update phone/email on landing page
- [ ] Android app uses `https://api.wavelens.online`
