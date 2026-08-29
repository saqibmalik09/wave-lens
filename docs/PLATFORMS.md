# Wave Lens — All Tech Stacks, Side by Side

One engine, one behavior, every stack. The filter pipeline (GPU color engine, beauty
smoothing, face AR, auto mode, server-driven catalog) lives in the native core — every
integration below is a thin wrapper over the same `.aar`, so features and visual
results are identical everywhere.

## Platform status

| Stack | Status | How you integrate |
|-------|--------|-------------------|
| **Android (Kotlin/Java)** | ✅ Ready | `wavelens-release.aar` + `WaveLensView` — see [INTEGRATION.md](./INTEGRATION.md) |
| **React Native (+ Agora)** | ✅ Ready via thin native module | Same AAR bridged with a small Kotlin module — see [REACT_NATIVE_AGORA.md](./REACT_NATIVE_AGORA.md) |
| **Flutter** | 🔜 Planned | Same AAR behind a platform channel (identical API surface) |
| **iOS / iOS RN & Flutter** | 🔜 After Android | XCFramework with the same C++ engine |

## Feature matrix (identical on every supported stack)

| Feature | What it does | Since |
|---------|--------------|-------|
| Auto mode | Live auto exposure / contrast / white balance, re-analyzed ~2×/sec | v0.2 |
| Low-light rescue | In dark scenes auto mode also lifts exposure harder and adds adaptive denoise (reuses the beauty-smoothing taps — no extra GPU cost) | v0.3 |
| Beauty filters | Edge-preserving GPU skin smoothing (Smooth / Natural / Fair / Rosy / Glam) | v0.2 |
| HD Boost | Auto light + strong sharpen + color pop for weak cameras | v0.2 |
| Color effects | B&W, Vintage, Sepia, Warm, Cool, Glow, Film Warm/Cool — strong, visible looks | v0.2 (boosted again in v0.3) |
| Face AR | ML Kit runtime face tracking; Chasma sunglasses, Heart Glasses, Cat Ears anchored to the face; Funny Face deform; effects render only while a face is detected | v0.2 |
| "Find A face" hint | Built-in overlay shown for 2 s when a face effect is selected with no face visible; re-appears briefly if the face stays lost | v0.3 |
| Server-driven catalog | Tray is built from `filter_configs` delivered by the license API — new filters and tuning changes reach installed apps at the next refresh (every 2 min), **no app rebuild** | v0.3 |
| Host status messages | Built-in banner (or `addStatusListener`) tells the host when the account is deactivated/reactivated or the filter lineup changes | v0.3 |
| Category tray | Auto → Beauty → Enhance → Face → Effects, grouped for a one-button expanding UI | v0.2 |

## The same 4 calls on every stack

| Step | Android (Kotlin) | React Native (TS over native module) |
|------|------------------|----------------------------------------|
| Init once | `WaveLens.init(ctx, clientId, secret, baseUrl)` | `await WaveLens.init()` |
| Refresh before go-live | `WaveLens.refreshLicense()` | `await WaveLens.refreshLicense()` |
| Build tray | `WaveLens.presetsByCategory()` | `await WaveLens.getPresetsByCategory()` |
| Apply a look | `waveLensView.applyPreset(preset)` | `await WaveLens.applyPreset(id)` |

Listen for license/catalog updates and rebuild the tray (both stacks):

- Kotlin: `WaveLens.addLicenseListener { active, filters -> rebuildTray() }`
- RN: `waveLensEvents.addListener('licenseUpdated', rebuildTray)`

## How dynamic updates work (all stacks)

```text
Studio / backend change            Installed app (any stack)
──────────────────────            ─────────────────────────────
add filter row + config    ───►   license refresh (app start /
tune params of a filter           every 2 min / refreshLicense())
enable/disable per tenant  ───►   tray rebuilds from filter_configs
                                  + "Filters updated" banner to the host
deactivate a company       ───►   filters disappear + deactivation
                                  banner shown to the host
```

- A "filter config" is JSON: `{ lut?, auto?, sticker?, params: { brightness, contrast, saturation, temperature, tint, vignette, glow, lut_intensity, smoothing, sharpen, face_deform } }`.
- Anything expressible with those building blocks is deployable server-side with **no app build** — new beauty looks, new color moods, new combinations.
- Only brand-new *capabilities* (new shader math, new sticker artwork, face mesh, etc.) ship in an SDK update. Old apps skip configs they can't render instead of breaking.

## Update / deploy checklist per stack

| Change | Android app | React Native app | Backend |
|--------|-------------|------------------|---------|
| New filter from existing params/LUTs/stickers | nothing | nothing | add row in seed/Studio |
| Tune existing filter strength | nothing | nothing | edit `config` |
| Enable/disable filters per tenant | nothing | nothing | Studio toggle |
| New sticker artwork or shader capability | new AAR + rebuild | new AAR + app rebuild | seed new ids |

Server deploy is one command from the repo root on the server:

```bash
cd ~/wave-lens && npm run deploy
```

(pulls latest code, then backend: install → migrate → build → seed → pm2 restart,
then dashboard: install → build → pm2 restart — fails fast on any error).
