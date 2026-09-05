# Wave Lens

Real-time camera filter SDK for live-streaming apps. Color effects, face-anchored 2D filters,
background change and (later) advanced AR — licensed per app (tenant) via a simple
`client_id` / `client_secret` activation.

Built for the real market constraint: **low-end Android phones, weak rural networks.**
GPU-only rendering (no heating), tiny license payloads (~1 KB), permanent on-device asset
caching (works fully offline after first activation), fail-open license checks (never blocks
app start or stream start).

## Repository layout

| Folder | What it is |
|---|---|
| `engine/` | C++ core: OpenGL ES render pipeline, color shaders, LUT engine, auto-adjust |
| `android/` | Android SDK (`wavelens` library module → `.aar`) + `demo` sample app |
| `backend/` | License/activation service (NestJS + Prisma + MySQL) |
| `dashboard/` | Admin + tenant dashboards (Next.js — later phase, placeholder) |
| `assets/` | LUT/look sources and pack-builder tools |
| `sdk-flutter/` | Flutter plugin wrapper (later phase, placeholder) |
| `sdk-react-native/` | React Native module wrapper (later phase, placeholder) |
| `docs/` | Integration guides (Android, RN+Agora, platforms) |
| `deploy/` | Nginx + one-command `npm run deploy` for server |

## Quick start (SDK + demo app)

1. Open `android/` in Android Studio (Hedgehog or newer). Let it sync — it will install
   NDK + CMake automatically if missing (see `android/README.md`).
2. Run the `demo` configuration on a real device (camera required).
3. Grant camera permission — you get the live filtered preview with the effects tray.

## Quick start (license service)

```bash
cd backend
npm install
cp .env.example .env        # point DATABASE_URL at your MySQL
npx prisma migrate dev      # creates tables
npm run prisma:seed         # seeds filter catalog + demo tenant
npm run start:dev           # http://localhost:3000
```

Demo tenant credentials (seeded): `client_id=wl_demo_client`, `client_secret=wl_demo_secret`,
bundle `com.wavelens.demo`.

Check it:

```bash
curl "http://localhost:3000/v1/license/status?client_id=wl_demo_client&client_secret=wl_demo_secret&bundle_id=com.wavelens.demo"
```

## Tenant integration

- **Android (native):** [docs/INTEGRATION.md](docs/INTEGRATION.md) — `WaveLens.init` + `WaveLensView`.
- **React Native + Agora:** [docs/REACT_NATIVE_AGORA.md](docs/REACT_NATIVE_AGORA.md) — **use this with Cursor** in the live app. §0 is a copy-paste prompt; §1 lists exactly what to change; §8 requires **arranged** filter settings (Auto → Beauty → Enhance → Face → Effects tabs), not a random chip list.
- **All stacks:** [docs/PLATFORMS.md](docs/PLATFORMS.md)

### Server deploy

```bash
cd ~/wave-lens && npm run deploy
```

Deploys **backend** (API), **dashboard** (Studio), and **website** only.  
Optional: `npm run deploy:backend` · `deploy:dashboard` · `deploy:website`  
Nginx/SSL (when needed): `bash deploy/sync-nginx.sh`

## Roadmap (phases)

1. **Phase 0/1 (this repo, now):** camera → GLES pipeline, color effects (brightness, contrast,
   saturation, warm/cool, B&W, vintage, sepia, glow, film looks) + Auto adjust.
2. **Phase 2:** license service + SDK activation (done here in minimal form).
3. **Phase 3:** face-anchored 2D filters (MediaPipe Face Landmarker, sticker packs via CDN).
4. **Phase 4:** background blur/replace (selfie segmentation).
5. **Phase 5:** Flutter + React Native wrappers, low-end device hardening.
6. **Phase 6:** admin + tenant dashboards.
7. **Phase 7:** advanced AR (3D, occlusion, body/hand tracking).
8. **Phase 8:** Snapchat-like consumer app.
