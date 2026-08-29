# Wave Lens Studio

Next.js dashboard for **studio.wavelens.online** — tenant login, registration, SDK credentials, and filter management.

## Routes

| Path | Description |
|------|-------------|
| `/` | Public landing |
| `/login` | Sign in |
| `/register` | Create tenant account + SDK keys |
| `/dashboard` | Tenant: credentials, enabled filters |
| `/admin` | Administrator: all tenants |
| `/admin/tenants/[id]` | Administrator: manage one tenant |

## Local dev

```bash
cd dashboard
cp .env.example .env.local
npm install
npm run dev   # http://localhost:3001
```

Set `NEXT_PUBLIC_API_URL` to the backend (default `http://localhost:5000`).

## Production (PM2)

```bash
npm run build
pm2 start npm --name wavelens-studio -- run start
```

Nginx proxies `studio.wavelens.online` → `127.0.0.1:3001`.

## Default admin (after backend seed)

- Email: `admin@wavelens.online`
- Password: `WaveLens@Admin2026` (override with `ADMIN_PASSWORD` in backend env)
