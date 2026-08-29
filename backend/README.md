# Wave Lens License Service

Minimal activation backend (NestJS + Prisma + MySQL). Two endpoints, no tokens,
no sessions — per the platform spec:

- `GET /v1/license/status?client_id=&client_secret=&bundle_id=`
  → `{ "active": true, "filters": ["bw", "glow", ...] }`
  Invalid/inactive/mismatched → `{ "active": false, "filters": [] }` (always HTTP 200).
- `GET /v1/catalog/filters?client_id=&client_secret=&bundle_id=&category=color`
  → filter metadata + asset URLs for on-demand fetching (entitled filters only).

Rules implemented:

- Tray list = `entitled_filters ∩ enabled_filters` (admin ceiling AND tenant toggle).
- Secrets stored as SHA-256 hashes, compared with `timingSafeEqual`.
- Key is bound to one `bundle_id`; wrong package = inactive.
- Responses never reveal whether a `client_id` exists.

## Run it

```bash
npm install
cp .env.example .env       # set your MySQL DATABASE_URL
npx prisma migrate dev     # create tables
npm run prisma:seed        # catalog + demo tenant (wl_demo_client / wl_demo_secret)
npm run start:dev          # http://localhost:3000
```

Smoke test:

```bash
curl "http://localhost:3000/v1/license/status?client_id=wl_demo_client&client_secret=wl_demo_secret&bundle_id=com.wavelens.demo"
```

## Managing tenants (until the dashboard exists — Phase 6)

Insert rows directly (or via Prisma Studio: `npx prisma studio`):

- `tenants` — one row per app; `client_secret_hash` = SHA-256 hex of the secret.
- `tenant_entitled_filters` — what the tenant CAN use (admin decision).
- `tenant_enabled_filters` — what the tenant has switched ON.
- Flip `tenants.status` to `inactive` to kill all access at the next SDK check-in.
