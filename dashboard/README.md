# Wave Lens Dashboards (Phase 6 — not started)

Planned: a Next.js app (separate from the license API in `../backend`) with two areas:

- **Admin panel (us):** tenant management, activate/deactivate, entitled-filter control,
  client key regeneration, usage overview, audit log.
- **Tenant dashboard:** view client_id, toggle enabled filters (subset of entitled),
  basic usage stats.

Both talk to the same MySQL database / NestJS API as the license service.
