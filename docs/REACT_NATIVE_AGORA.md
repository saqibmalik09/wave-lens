# Wave Lens + React Native + Agora — Integration Guide

> **Audience:** App developer (or Cursor agent) integrating Wave Lens into a React Native live-streaming app that uses **Agora RTC**.  
> **How to use with Cursor:** Attach this file (`@docs/REACT_NATIVE_AGORA.md`) and paste the prompt in **§0**. Follow phases in order. Do **not** invent a random filter list — use the fixed category order and SDK APIs below.

Also see: [PLATFORMS.md](./PLATFORMS.md) (all stacks) · [INTEGRATION.md](./INTEGRATION.md) (pure Android)

---

## 0. Cursor prompt — copy this into the app chat

```text
Read @docs/REACT_NATIVE_AGORA.md carefully and implement Wave Lens for our React Native + Agora live host flow.

RULES (do not break these):
1. Do NOT invent filter names or show a flat random list of chips.
2. Build settings EXACTLY in this category order:
   Auto → Beauty → Enhance → Face → Effects
3. UI must be: ONE "Filters" button on go-live → bottom sheet → category TABS → preset chips inside the active tab only.
4. Presets MUST come from WaveLens.getPresetsByCategory() / availablePresets() after refreshLicense() — never hardcode the tray.
5. On licenseUpdated / licenseStatus events, rebuild the tray and show the status message to the host.
6. Call refreshLicense() every time the host opens go-live.
7. Viewers do NOT run Wave Lens — only the host publishes filtered video.
8. Replace android/app/libs/wavelens-release.aar with the latest AAR from wave-lens (see §4).
9. Match our existing app design language; keep the filter sheet clean and arranged — no scattered toggles, no emoji spam, no unsorted grid.

Implement Phase A → B → C → D → E from §10. After each phase, summarize what changed and what to test.
```

---

## 1. What must change in the app (checklist)

| # | Change | Where | Why |
|---|--------|-------|-----|
| 1 | **Replace AAR** with latest `wavelens-release.aar` | `android/app/libs/` | New engine: stronger filters, face AR, 2‑min license sync, status messages, server-driven configs |
| 2 | **Gradle deps** — CameraX + ML Kit comes via AAR; keep Agora | `android/app/build.gradle` | Face AR + preview |
| 3 | **Native module** — init, presets by category, applyPreset, setParam, status events | `android/.../wavelens/` | Bridge JS ↔ AAR |
| 4 | **Agora frame filter** — publish *filtered* frames | Host go-live native path | Viewers must see the same look |
| 5 | **Filter settings UI** — one button → sheet → **ordered category tabs** | Host live screen | Not a random chip row |
| 6 | **refreshLicense()** on go-live open + listen for updates | Host screen | Studio changes appear without rebuild |
| 7 | **Status toast/banner** when account off or filters updated | Host screen | Host must know why tray is empty |
| 8 | **Do not** put Wave Lens on viewer screens | Audience flow | Host already sends filtered video |

### What the host should see (arranged settings)

```text
Go-live screen
└── [ Filters ]          ← single entry point (not 20 chips on the main UI)

Tap Filters → bottom sheet (arranged):
┌──────────────────────────────────────────────┐
│  Auto │ Beauty │ Enhance │ Face │ Effects    │  ← tabs IN THIS ORDER only
├──────────────────────────────────────────────┤
│  [Smooth] [Natural] [Fair] [Rosy] [Glam]     │  ← chips for ACTIVE tab only
│  Strength  ────●────                         │  ← optional slider for continuous params
└──────────────────────────────────────────────┘
```

**Forbidden UI:** dumping all presets in one horizontal scroll with no categories; random order; inventing labels not returned by the SDK; mixing face AR chips into “Effects”.

**Required category order (hard rule):**

| Order | Tab key | Display label | Example presets (from SDK / Studio) |
|------:|---------|---------------|-------------------------------------|
| 1 | `auto` | Auto | Auto |
| 2 | `beauty` | Beauty | Smooth, Natural, Fair, Rosy, Glam |
| 3 | `enhance` | Enhance | HD Boost |
| 4 | `face` | Face | Chasma, Hearts, Cat Ears, Funny Face |
| 5 | `effects` | Effects | Original, B&W, Vintage, Sepia, Warm, Cool, Glow, Film Warm, Film Cool |

Hide a tab if that category array is empty (tenant not entitled). Default selected tab: **Beauty** (or first non-empty).

---

## 2. What you are building

```
┌─────────────────────────────────────────────────────────────┐
│  HOST (goes live)                                           │
│  Camera → Wave Lens (GPU filters) → Agora publish → channel │
│  Local preview shows the same filtered picture              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼  Agora RTC
┌─────────────────────────────────────────────────────────────┐
│  VIEWERS (watch only)                                       │
│  Agora subscribe → remote video view                        │
│  No Wave Lens on viewer unless they also broadcast          │
└─────────────────────────────────────────────────────────────┘
```

| Role | Wave Lens | Agora |
|------|-----------|-------|
| **Host** | Yes — filters on outgoing video | Publish video + audio |
| **Audience** | No | Subscribe only |

---

## 3. Current SDK status (read before coding)

| Platform | Status |
|----------|--------|
| **Android AAR** | ✅ Ready (`wavelens-release.aar`) — rebuild from wave-lens repo |
| **License API** | ✅ `https://api.wavelens.online` |
| **Studio dashboard** | ✅ `https://studio.wavelens.online` |
| **Official `@wavelens/react-native`** | 🔜 Phase 5 — not published yet |
| **iOS** | 🔜 After Android |

**Important:** Integrate via a **thin custom native module** on Android that wraps:

1. `WaveLens.init()` — license (fail-open, cached; refresh every **2 minutes**)
2. Engine / `applyPreset` — GPU filters + face AR
3. `react-native-agora` — publish filtered frames

Filter logic never lives in JavaScript — JS only calls init / preset / param / category APIs.

---

## 4. Studio + credentials (do this first)

1. Register at [https://studio.wavelens.online/register](https://studio.wavelens.online/register)
2. Save **Client ID**, **Client Secret**, **Bundle ID**
3. **Dashboard → Filters** — enable only what hosts should see (grouped by category in Studio)
4. Admin can entitle companies at **Admin → Companies**

```env
WAVELENS_CLIENT_ID=wl_xxxxxxxx
WAVELENS_CLIENT_SECRET=your-secret
WAVELENS_BUNDLE_ID=com.yourcompany.liveapp
WAVELENS_API_URL=https://api.wavelens.online
```

License response (v0.3+):

```http
GET /v1/license/status?client_id=...&client_secret=...&bundle_id=...
→ {
    "active": true,
    "filters": ["auto", "beauty_smooth", "sunglasses", ...],
    "filter_configs": [ { "id", "name", "category", "lut?", "auto?", "sticker?", "params?" }, ... ],
    "message": "..."   // when inactive
  }
```

The SDK builds the tray from `filter_configs` when present. **Do not hardcode presets in JS.**

---

## 5. Dependencies & AAR

### 5.1 React Native

```bash
npm install react-native-agora
# Wave Lens RN wrapper = your local native module until @wavelens/react-native ships
```

### 5.2 Android (`android/app/build.gradle`)

```gradle
dependencies {
    implementation files('libs/wavelens-release.aar')
    implementation 'androidx.camera:camera-core:1.3.4'
    implementation 'androidx.camera:camera-camera2:1.3.4'
    implementation 'androidx.camera:camera-lifecycle:1.3.4'
    implementation 'io.agora.rtc:full-sdk:4.x.x'  // match react-native-agora
}
```

```text
android/app/libs/wavelens-release.aar
```

Build the AAR from the Wave Lens repo (required for current features):

```bash
cd wave-lens/android && ./gradlew :wavelens:assembleRelease
# → android/wavelens/build/outputs/aar/wavelens-release.aar
# Copy into the live app, then rebuild the app once.
```

Requirements: **minSdk 24**, **OpenGL ES 3.0**, arm64-v8a / armeabi-v7a.

---

## 6. Native architecture

```text
android/app/src/main/java/com/yourapp/wavelens/
  WaveLensModule.kt          # RN bridge: init, getPresetsByCategory, applyPreset, setParam, events
  WaveLensAgoraPublisher.kt  # Agora + filter pipeline (host only)
  WaveLensPackage.kt
```

### 6.1 Init (once)

```kotlin
WaveLens.init(
    context = reactContext.applicationContext,
    clientId = BuildConfig.WAVELENS_CLIENT_ID,
    clientSecret = BuildConfig.WAVELENS_CLIENT_SECRET,
    baseUrl = "https://api.wavelens.online",
)
```

```typescript
await WaveLens.init();
await WaveLens.refreshLicense(); // every go-live open
```

### 6.2 Build tray from SDK (arranged)

```kotlin
// Prefer category map — preserves Auto → Beauty → Enhance → Face → Effects
val groups = WaveLens.presetsByCategory()
```

Bridge to JS as `getPresetsByCategory()`. In JS, iterate categories with a **fixed order array** (see §8), not `Object.keys()` alone (key order can look random).

---

## 7. Agora host pipeline (critical)

Agora must publish **filtered** frames, not raw camera.

### Recommended: `IVideoFrameObserver`

```kotlin
class WaveLensAgoraPublisher(private val engine: RtcEngine) {
    private val engineHandle = NativeBridge.nativeCreate()

    fun attachFilterPipeline() {
        engine.registerVideoFrameObserver(object : IVideoFrameObserver {
            override fun onCaptureVideoFrame(sourceType: Int, videoFrame: VideoFrame): Boolean {
                NativeBridge.nativeDraw(engineHandle, videoFrame.textureId, videoFrame.transform)
                return true
            }
        })
    }

    fun applyPreset(presetId: String) {
        val preset = WaveLens.availablePresets().firstOrNull { it.id == presetId }
            ?: FilterPreset.ALL.firstOrNull { it.id == presetId }
            ?: return
        for (param in FilterParam.values()) {
            NativeBridge.nativeSetParam(engineHandle, param.id, preset.params[param] ?: 0f)
        }
        NativeBridge.nativeSetPresetLut(engineHandle, preset.lut ?: "")
        NativeBridge.nativeSetAutoEnabled(engineHandle, preset.autoMode)
        // Face presets: also set sticker via WaveLensView path or nativeSetSticker if exposed
    }

    fun destroy() { NativeBridge.nativeDestroy(engineHandle) }
}
```

> `NativeBridge` may be `internal` in the AAR — expose a public processor API or vendor a build that exports it.

---

## 8. Filter settings UI — arranged, not random

### 8.1 File layout

```text
src/live/
  HostLiveScreen.tsx
  ViewerLiveScreen.tsx
  FilterSettingsSheet.tsx   # one button → sheet → tabs → chips
src/native/waveLens.ts
src/config/wavelens.ts
```

### 8.2 Native module surface

```typescript
// src/native/waveLens.ts
import { NativeModules, NativeEventEmitter } from 'react-native';

export type Preset = { id: string; name: string; category: string };

/** Fixed tab order — NEVER sort alphabetically or by Object.keys alone. */
export const FILTER_CATEGORY_ORDER = [
  'auto',
  'beauty',
  'enhance',
  'face',
  'effects',
] as const;

export const FILTER_CATEGORY_LABELS: Record<string, string> = {
  auto: 'Auto',
  beauty: 'Beauty',
  enhance: 'Enhance',
  face: 'Face',
  effects: 'Effects',
};

interface WaveLensNative {
  init(): Promise<void>;
  refreshLicense(): Promise<void>;
  getAvailablePresets(): Promise<Preset[]>;
  getPresetsByCategory(): Promise<Record<string, Preset[]>>;
  applyPreset(presetId: string): Promise<void>;
  setParam(param: string, value: number): Promise<void>;
  attachToAgoraEngine(): Promise<void>;
  detachFromAgoraEngine(): Promise<void>;
}

export const WaveLens = NativeModules.WaveLens as WaveLensNative;
export const waveLensEvents = new NativeEventEmitter(NativeModules.WaveLens);
// 'licenseUpdated' → { active, filters }
// 'licenseStatus'  → { active, message }  // deactivated / filters updated
```

### 8.3 Category → presets (what each tab contains)

| Category | Preset ids | Behavior |
|----------|------------|----------|
| **Auto** | `auto` | Live auto exposure / contrast / white balance (+ low-light denoise in dark scenes) |
| **Beauty** | `beauty_smooth`, `beauty_natural`, `beauty_fair`, `beauty_rosy`, `beauty_glam` | Skin smoothing + tone |
| **Enhance** | `enhance` | HD Boost — weak/low-light cameras |
| **Face** | `sunglasses` (Chasma), `heart_glasses`, `cat_ears`, `face_warp` | Face AR — only while face detected; “Find A face” for 2 s if none |
| **Effects** | `original`, `bw`, `vintage`, `sepia`, `warm`, `cool`, `glow`, `film_warm`, `film_cool` | Strong color looks |

### 8.4 FilterSettingsSheet — required behavior for Cursor

```tsx
// FilterSettingsSheet.tsx — arrangement contract
const [open, setOpen] = useState(false);
const [groups, setGroups] = useState<Record<string, Preset[]>>({});
const [tab, setTab] = useState<string>('beauty');
const [selectedId, setSelectedId] = useState<string>('original');
const [statusMsg, setStatusMsg] = useState<string | null>(null);

async function reloadTray() {
  const g = await WaveLens.getPresetsByCategory();
  setGroups(g);
  // Keep tab order fixed; pick first non-empty if current tab empty
  const first = FILTER_CATEGORY_ORDER.find((k) => (g[k]?.length ?? 0) > 0);
  if (first && !(g[tab]?.length)) setTab(first);
}

useEffect(() => {
  reloadTray();
  const u1 = waveLensEvents.addListener('licenseUpdated', reloadTray);
  const u2 = waveLensEvents.addListener('licenseStatus', (e) => {
    setStatusMsg(e.message);
    // Show toast/banner to host — do not ignore
  });
  return () => { u1.remove(); u2.remove(); };
}, []);

// Render:
// 1. Floating / bottom "Filters" button on HostLiveScreen only when sheet closed
// 2. Sheet: horizontal Tabs = FILTER_CATEGORY_ORDER.filter(k => groups[k]?.length)
// 3. Body: ONLY groups[tab] as chips (selected state on selectedId)
// 4. onPress chip → WaveLens.applyPreset(id); setSelectedId(id)
// 5. Optional: one strength slider for brightness/smoothing when that tab needs it
```

**Do not:** show all categories’ chips at once; use `Object.keys(groups).sort()`; hardcode chip lists in JSX.

### 8.5 Host screen

```typescript
useEffect(() => {
  (async () => {
    await WaveLens.init();
    await WaveLens.refreshLicense(); // required on every go-live open
    // create Agora engine, broadcaster role, attachToAgoraEngine, joinChannel
  })();
}, []);
```

Viewer screen: audience role only — **no** FilterSettingsSheet, **no** Wave Lens.

### 8.6 Continuous params (optional slider row)

```typescript
await WaveLens.setParam('brightness', 0.2);   // -1 .. 1
await WaveLens.setParam('contrast', 0.1);
await WaveLens.setParam('saturation', -0.1);
await WaveLens.setParam('temperature', 0.3);
await WaveLens.setParam('smoothing', 0.7);    // 0..1
await WaveLens.setParam('sharpen', 0.5);      // 0..1
```

---

## 9. Dynamic updates (no rebuild for Studio changes)

After the **new AAR** is in the app once:

| Studio / backend change | App behavior |
|-------------------------|--------------|
| Enable/disable filters | Tray rebuilds within ~2 min or on `refreshLicense()` |
| New filter from existing params/LUTs/stickers | Appears in correct category tab |
| Deactivate company | Host gets status message; filters off |
| New shader / new sticker artwork | Needs new AAR + app build |

```typescript
waveLensEvents.addListener('licenseUpdated', async () => {
  setGroups(await WaveLens.getPresetsByCategory());
});
waveLensEvents.addListener('licenseStatus', ({ message }) => {
  // Toast / banner: "Wave Lens filters are turned off…" / "Filters updated…"
});
```

---

## 10. Lifecycle

| When | Action |
|------|--------|
| App start | `WaveLens.init()` |
| Open go-live | `refreshLicense()` + rebuild category tray |
| Host joins | `attachToAgoraEngine()` then `joinChannel` |
| Host leaves | `leaveChannel`, `detachFromAgoraEngine()` |
| Filter tap | `applyPreset(id)` only — GPU swap, no network |

---

## 11. Implementation phases for Cursor (do in order)

### Phase A — AAR, config, license
- [ ] Copy latest `wavelens-release.aar` → `android/app/libs/`
- [ ] Gradle deps + `WAVELENS_*` BuildConfig fields
- [ ] `WaveLensModule.init` / `refreshLicense` / `getPresetsByCategory`
- [ ] Emit `licenseUpdated` + `licenseStatus` to JS
- [ ] Test: presets return with `category` fields; empty tray if tenant inactive

### Phase B — Arranged Filter settings UI (no Agora yet)
- [ ] One **Filters** button on host preview
- [ ] Bottom sheet with tabs in order: Auto → Beauty → Enhance → Face → Effects
- [ ] Chips only for active tab; selection highlight; `applyPreset`
- [ ] Status banner/toast for deactivate / filters updated
- [ ] Rebuild tray on `licenseUpdated`

### Phase C — Agora publish (Android)
- [ ] Broadcaster role + `attachToAgoraEngine` / frame observer
- [ ] Verify second device sees **filtered** video

### Phase D — Viewer
- [ ] Audience only; no Wave Lens UI

### Phase E — Polish
- [ ] Inactive license → clear message, block or hide Filters
- [ ] Secrets not in git
- [ ] Match app design system (clean sheet, no clutter)

---

## 12. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Filters look random / one long chip row | Rebuild UI per §1 and §8 — use `FILTER_CATEGORY_ORDER` |
| Filters only on preview, not stream | Frame observer not attached (§7) |
| Empty tray | Studio entitlements; `refreshLicense()`; check `active` |
| Face effects never appear | New AAR required; face tab empty until entitled; need a face in camera |
| Old weak effects | Old AAR — rebuild and replace AAR (§5.2) |
| Studio changes never show | Call `refreshLicense` on go-live; listen to `licenseUpdated` |

---

## 13. Pure Android reference

```kotlin
WaveLens.init(context, clientId, clientSecret, "https://api.wavelens.online")
waveLensView.startCamera(lifecycleOwner)
waveLensView.applyPreset(FilterPreset.BEAUTY_SMOOTH)
val groups = WaveLens.presetsByCategory() // arranged categories
```

See [`INTEGRATION.md`](./INTEGRATION.md) and `android/demo/`.

---

## 14. Support

- **Studio:** https://studio.wavelens.online  
- **WhatsApp:** +92 325 226 5427  
- **Email:** supportwavetech@gmail.online  

When asking Wave Lens for help, specify: **React Native**, **Agora RTC 4.x**, **host-only filtering**, **Android first**, and whether the tray is category-tabbed per this doc.
