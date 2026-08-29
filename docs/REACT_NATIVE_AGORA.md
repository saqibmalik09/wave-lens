# Wave Lens + React Native + Agora — Integration Guide

> **Audience:** Developer implementing live streaming in a React Native app using **Agora RTC** (host + audience).  
> **Cursor use:** Open this file in chat (`@docs/REACT_NATIVE_AGORA.md`) and ask the agent to implement phase-by-phase.

---

## 1. What you are building

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

## 2. Current SDK status (read before coding)

| Platform | Status |
|----------|--------|
| **Android AAR** | ✅ Ready (`wavelens-release.aar`) |
| **License API** | ✅ `https://api.wavelens.online` |
| **Studio dashboard** | ✅ `https://studio.wavelens.online` |
| **Official `@wavelens/react-native`** | 🔜 Phase 5 — not published yet |
| **iOS** | 🔜 After Android |

**Important:** Today you integrate via a **thin custom native module** on Android that wraps:

1. `WaveLens.init()` — license (fail-open, cached)
2. `NativeBridge` / engine — GPU filter on camera frames
3. `react-native-agora` — publish filtered frames to the channel

Filter logic never lives in JavaScript — JS only calls init / preset / param APIs.

---

## 3. Studio setup (do this first)

1. Register at [https://studio.wavelens.online/register](https://studio.wavelens.online/register)
2. Save **Client ID**, **Client Secret**, **Bundle ID** (shown once on signup)
3. In **Dashboard → Filters**, enable the filters your hosts should see
4. Admin can entitle more filters per tenant at **Admin → Companies → Manage**

You will pass credentials into the app (use env / secure storage — never commit secrets):

```env
WAVELENS_CLIENT_ID=wl_xxxxxxxx
WAVELENS_CLIENT_SECRET=your-secret
WAVELENS_BUNDLE_ID=com.yourcompany.liveapp
WAVELENS_API_URL=https://api.wavelens.online
```

License check (automatic in SDK):

```http
GET /v1/license/status?client_id=...&client_secret=...&bundle_id=...
→ { "active": true, "filters": ["bw", "vintage", "glow", ...] }
```

---

## 4. Dependencies

### 4.1 React Native (JS)

```bash
npm install react-native-agora
# Wave Lens RN wrapper — use local native module until @wavelens/react-native ships
```

### 4.2 Android (`android/app/build.gradle`)

```gradle
dependencies {
    implementation files('libs/wavelens-release.aar')
    implementation 'androidx.camera:camera-core:1.3.4'
    implementation 'androidx.camera:camera-camera2:1.3.4'
    implementation 'androidx.camera:camera-lifecycle:1.3.4'
    implementation 'io.agora.rtc:full-sdk:4.x.x'  // match your react-native-agora version
}
```

Copy AAR:

```text
android/app/libs/wavelens-release.aar
```

Build AAR from Wave Lens repo:

```bash
cd wave-lens/android && ./gradlew :wavelens:assembleRelease
# → android/wavelens/build/outputs/aar/wavelens-release.aar
```

Requirements: **minSdk 24**, **OpenGL ES 3.0**, arm64-v8a / armeabi-v7a.

---

## 5. Target architecture (Android native + RN bridge)

Create a native module package, e.g. `WaveLensAgoraPackage`:

```text
android/app/src/main/java/com/yourapp/wavelens/
  WaveLensModule.kt          # RN bridge: init, presets, setParam
  WaveLensAgoraPublisher.kt  # Agora + filter pipeline (host only)
  WaveLensPackage.kt
```

### 5.1 Initialize once (Application or first screen)

```kotlin
// WaveLensModule.kt
WaveLens.init(
    context = reactContext.applicationContext,
    clientId = BuildConfig.WAVELENS_CLIENT_ID,
    clientSecret = BuildConfig.WAVELENS_CLIENT_SECRET,
    baseUrl = "https://api.wavelens.online",
)
```

Call from JS on app start:

```typescript
import { NativeModules } from 'react-native';
const { WaveLens } = NativeModules;

await WaveLens.init(); // reads BuildConfig on native side
```

Refresh before going live:

```kotlin
WaveLens.refreshLicense()
```

Build filter tray from license:

```kotlin
val presets = WaveLens.availablePresets() // entitled ∩ enabled, fail-open offline
```

---

## 6. Agora host pipeline (the critical part)

Agora must publish **filtered** frames, not a second unfiltered camera.

### Recommended approach: `IVideoFrameObserver` on capture path

Register an observer on the Agora engine **before** joining as broadcaster. In the capture callback, run the frame through Wave Lens GPU engine, then return the modified frame.

```kotlin
// WaveLensAgoraPublisher.kt — conceptual; adapt to your Agora 4.x API
class WaveLensAgoraPublisher(private val engine: RtcEngine) {

    private val engineHandle = NativeBridge.nativeCreate()

    fun attachFilterPipeline() {
        engine.registerVideoFrameObserver(object : IVideoFrameObserver {
            override fun onCaptureVideoFrame(
                sourceType: Int,
                videoFrame: VideoFrame,
            ): Boolean {
                // videoFrame.textureId = camera OES texture (GL thread)
                // videoFrame.transform = 4x4 matrix
                NativeBridge.nativeDraw(
                    engineHandle,
                    videoFrame.textureId,
                    videoFrame.transform,
                )
                // Agora sends the modified texture to the channel
                return true
            }
            // implement other observer methods as no-op / pass-through
        })
    }

    fun applyPreset(presetId: String) {
        // Look up the FilterPreset by id, then set ALL its params + LUT + auto mode
        // (mirrors WaveLensView.applyPreset — presets carry params, not just a LUT).
        val preset = FilterPreset.ALL.firstOrNull { it.id == presetId } ?: return
        for (param in FilterParam.values()) {
            NativeBridge.nativeSetParam(engineHandle, param.id, preset.params[param] ?: 0f)
        }
        NativeBridge.nativeSetPresetLut(engineHandle, preset.lut ?: "")
        NativeBridge.nativeSetAutoEnabled(engineHandle, preset.autoMode)
    }

    fun setParam(param: Int, value: Float) {
        NativeBridge.nativeSetParam(engineHandle, param, value)
    }

    fun destroy() {
        NativeBridge.nativeDestroy(engineHandle)
    }
}
```

> **Note:** `NativeBridge` is currently `internal` in the AAR. For production Agora integration, Wave Lens will expose a public `WaveLensProcessor` API. Until then, either:
> - Request a build with public processor API from Wave Lens team, or
> - Fork and expose `NativeBridge` in your vendored AAR.

### Alternative: Custom video source

1. `WaveLensView` renders filtered preview (CameraX → GL).
2. Read GL output into `AgoraVideoFrame` and `pushExternalVideoFrame`.

Higher latency and more CPU/GPU sync work — use only if frame observer is unavailable.

---

## 7. React Native layer — suggested file layout

```text
src/
  live/
    HostLiveScreen.tsx       # host: preview + go live + filter tray
    ViewerLiveScreen.tsx     # audience: remote video only
    FilterTray.tsx           # horizontal preset chips
  native/
    waveLens.ts              # typed wrapper over NativeModules
  config/
    wavelens.ts              # env / constants
```

### 7.1 Native module surface (implement in Kotlin, call from TS)

```typescript
// src/native/waveLens.ts
import { NativeModules, NativeEventEmitter } from 'react-native';

type Preset = { id: string; name: string; category: string };

interface WaveLensNative {
  init(): Promise<void>;
  refreshLicense(): Promise<void>;
  getAvailablePresets(): Promise<Preset[]>;
  getPresetsByCategory(): Promise<Record<string, Preset[]>>; // auto/beauty/enhance/effects
  applyPreset(presetId: string): Promise<void>;
  setParam(param: string, value: number): Promise<void>; // brightness -1..1
  // Host only — wire to Agora publisher
  attachToAgoraEngine(): Promise<void>;
  detachFromAgoraEngine(): Promise<void>;
}

export const WaveLens = NativeModules.WaveLens as WaveLensNative;
export const waveLensEvents = new NativeEventEmitter(NativeModules.WaveLens);
// Event: 'licenseUpdated' → { active: boolean; filters: string[] }
```

### 7.2 Host screen flow

```typescript
// HostLiveScreen.tsx — pseudocode
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import RtcEngine, { ChannelProfile, ClientRole } from 'react-native-agora';
import { WaveLens } from '../native/waveLens';
import { FilterTray } from './FilterTray';

export function HostLiveScreen({ channelId, token, uid }) {
  const [presets, setPresets] = useState([]);

  useEffect(() => {
    (async () => {
      await WaveLens.init();
      await WaveLens.refreshLicense();
      setPresets(await WaveLens.getAvailablePresets());

      const engine = await RtcEngine.create(AGORA_APP_ID);
      await engine.enableVideo();
      await engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
      await engine.setClientRole(ClientRole.Broadcaster);

      if (Platform.OS === 'android') {
        await WaveLens.attachToAgoraEngine(); // native: register frame observer
      }

      await engine.joinChannel(token, channelId, null, uid);
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {/* Local preview — RtcSurfaceView LOCAL or WaveLensView native component */}
      <RtcLocalView style={{ flex: 1 }} />
      <FilterTray
        presets={presets}
        onSelect={(id) => WaveLens.applyPreset(id)}
      />
    </View>
  );
}
```

### 7.3 Viewer screen (no Wave Lens)

```typescript
// ViewerLiveScreen.tsx
await engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
await engine.setClientRole(ClientRole.Audience);
await engine.joinChannel(token, channelId, null, uid);
// RtcRemoteView for host uid — receives already-filtered video from Agora
```

---

## 8. Filter tray (JS UI) — categories + single-button design

Presets are **grouped by category**. Native side exposes `WaveLens.presetsByCategory()`;
bridge it as `getPresetsByCategory(): Promise<Record<string, Preset[]>>`.

| Category | Preset ids | What it does |
|----------|-----------|--------------|
| **Auto** | `auto` | Live analysis of camera + lighting: auto exposure, auto contrast, auto white balance. Re-analyzes ~2x/sec, smoothly adapts. |
| **Beauty** | `beauty_smooth`, `beauty_natural`, `beauty_fair`, `beauty_rosy`, `beauty_glam` | GPU skin smoothing (edge-preserving — eyes/lips stay sharp) + brightness/tone looks. `beauty_natural` also runs auto mode. |
| **Enhance** | `enhance` (HD Boost) | For weak/low-light cameras: auto light correction + strong sharpening + color pop. |
| **Effects** | `original`, `bw`, `vintage`, `sepia`, `warm`, `cool`, `glow`, `film_warm`, `film_cool` | Strong color looks (LUT-based, boosted in v0.2). |
| **Face** | `sunglasses` (Chasma), `heart_glasses`, `cat_ears`, `face_warp` (Funny Face) | **Live face AR** — ML Kit tracks the face at runtime; stickers stick to the eyes/head through movement and tilt, `face_warp` slightly bulges the face. Effects render **only while a face is detected**; a "Find face" hint shows otherwise. `bunny_ears`, `dog_ears`, `crown` come in the next sticker pack. |

### Recommended UI — one button, expanding sheet

```text
[ ✨ Filters ]  ← single button on the go-live screen
     │ tap
     ▼
┌────────────────────────────────────────────┐
│  Auto │ Beauty │ Enhance │ Effects │ Face  │   ← category tabs
├────────────────────────────────────────────┤
│  (○) (○) (○) (○) (○)  ← preset chips      │   ← horizontal scroll
│  ────────●────────    ← strength slider    │
└────────────────────────────────────────────┘
```

```typescript
// FilterTray.tsx — sketch
const [open, setOpen] = useState(false);
const [groups, setGroups] = useState<Record<string, Preset[]>>({});
const [tab, setTab] = useState('beauty');

useEffect(() => { WaveLens.getPresetsByCategory().then(setGroups); }, []);

// Single button → bottom sheet with category tabs → chips call applyPreset(id).
// Hide the "face" tab if groups.face is empty (tenant not entitled).
```

### Face AR behavior (built into the SDK)

- Selecting a face preset starts **on-device ML Kit face detection** (FAST mode,
  low-res analysis stream, ≤1 frame in flight — negligible load, nothing runs when
  no face preset is selected).
- The sticker/deform **appears only when a face is detected**, fades in/out smoothly,
  and follows position, tilt and distance in real time.
- When a face effect is selected with no face visible, a built-in **"Find A face"**
  hint shows for **2 seconds** and disappears; it re-appears briefly if the face
  stays lost (customize the text via `waveLensView.faceHintText = "..."`).
- **Agora frame-observer path:** the built-in tracking uses the `WaveLensView`
  CameraX pipeline. If you capture through Agora instead, run ML Kit on every 2nd–3rd
  observer frame (`InputImage.fromByteArray` with the NV21 buffer) and forward results
  via `NativeBridge.nativeSetFaceState(...)` — the engine API is identical.

Sliders (continuous params):

```typescript
await WaveLens.setParam('brightness', 0.2);   // -1 .. 1
await WaveLens.setParam('contrast', 0.1);
await WaveLens.setParam('saturation', -0.1);
await WaveLens.setParam('temperature', 0.3);  // warm/cool
await WaveLens.setParam('smoothing', 0.7);    // 0..1 — beauty skin smoothing
await WaveLens.setParam('sharpen', 0.5);      // 0..1 — detail boost for soft cameras
```

Only show presets returned by the SDK — it already respects Studio entitlements.

---

## 8b. Dynamic updates — no app rebuild needed

**Question: "If we change filters in the backend, do we rebuild the app?" → No.**

Since backend v0.3 the license response includes **`filter_configs`** — the full
definition of every enabled filter (params, LUT, sticker, auto flag). The SDK builds
its tray from this, so even **adding a brand-new filter** in the backend (any
combination of existing params/LUTs/stickers) appears in already-installed apps at
the next refresh. Only new engine *capabilities* (new shader math, new sticker
artwork) need an SDK/app update — and old apps skip those safely instead of breaking.

Changes propagate to installed apps automatically:

1. **App start** — SDK checks the license (non-blocking, cached fail-open).
2. **Every 2 minutes** — background refresh while the app is alive.
3. **Instantly on demand** — call `WaveLens.refreshLicense()` when the host opens
   the go-live screen; then rebuild the tray from the `licenseUpdated` event:

```typescript
waveLensEvents.addListener('licenseUpdated', async () => {
  setGroups(await WaveLens.getPresetsByCategory());
});
```

So: add or toggle a filter in the backend → within ~2 minutes (or the next go-live
tap) every host's tray updates. Deactivating a company kills its filters the same way.

**Built-in host messages:** the SDK tells the host what happened, automatically —
`WaveLensView` shows a top banner when the account is deactivated ("Wave Lens filters
are turned off for this account…", stays until reactivated), reactivated, or the
filter lineup changes ("Filters updated — your tray has changed", auto-hides in 5 s).
To render these in your own RN UI instead, bridge `WaveLens.addStatusListener` as a
`licenseStatus` event: `{ active: boolean; message: string }`.

Same behavior on **all stacks** (native Android, React Native, later Flutter/iOS) —
see [PLATFORMS.md](./PLATFORMS.md) for the side-by-side matrix.

---

## 9. Lifecycle & performance checklist

| When | Action |
|------|--------|
| App start | `WaveLens.init()` — non-blocking, uses cache |
| Before go live | `WaveLens.refreshLicense()` |
| Host joins channel | `attachToAgoraEngine()` then `joinChannel` |
| Host leaves | `leaveChannel`, `detachFromAgoraEngine()` |
| App background | Pause camera / Agora per Agora docs |
| Filter change | In-memory GPU uniform swap — no network |

- All filtering is **GPU (OpenGL ES 3.0)** — no CPU pixel loops (beauty smoothing and
  sharpening included; they share one 8-tap neighborhood read in the main pass).
- Viewers do not run Wave Lens — they receive encoded video from Agora.
- License JSON ~1–2 KB; refresh every 2 minutes in background + on `refreshLicense()`.

---

## 10. Implementation phases for Cursor

Copy each phase into Cursor as a task:

### Phase A — Config & license
- [ ] Add `wavelens-release.aar` to `android/app/libs/`
- [ ] Add Gradle deps (CameraX + AAR)
- [ ] Add `WAVELENS_*` to `android/app/build.gradle` `buildConfigField`
- [ ] Create `WaveLensModule.init()` RN method
- [ ] Test: init + `getAvailablePresets()` returns filters from Studio

### Phase B — Host preview (no Agora yet)
- [ ] Add native `WaveLensView` component OR Agora local view
- [ ] `FilterTray` toggles `applyPreset`
- [ ] Listen for `licenseUpdated` event → rebuild tray

### Phase C — Agora publish (Android)
- [ ] Integrate `react-native-agora` host flow (broadcaster role)
- [ ] Native: `WaveLensAgoraPublisher.attachFilterPipeline()` on Agora engine
- [ ] Verify viewers see **filtered** video on a second device

### Phase D — Viewer screen
- [ ] Audience role, remote video view, no Wave Lens imports

### Phase E — Polish
- [ ] Error states: license inactive → block go-live with message
- [ ] Secure secret storage (Android Keystore / env)
- [ ] iOS stub (wait for Wave Lens iOS XCFramework)

---

## 11. Troubleshooting

| Symptom | Fix |
|---------|-----|
| Filters only on preview, not on stream | Agora is publishing raw camera — implement §6 frame observer |
| Empty filter tray | Run seed / enable filters in Studio; call `refreshLicense()` |
| `active: false` | Tenant deactivated in Admin → Companies |
| SSL / network errors | Use `https://api.wavelens.online`; check device network |
| RN "Cannot POST /v1/auth/login" | Dashboard issue — ensure `NEXT_PUBLIC_API_URL` points to API, not Studio |
| Build: Prisma / native errors on Windows | Build backend on Linux server; Android AAR builds in Android Studio |

---

## 12. Reference — pure Android (without RN)

If you need a working reference before RN bridge:

```kotlin
WaveLens.init(context, clientId, clientSecret, "https://api.wavelens.online")
waveLensView.startCamera(lifecycleOwner)
waveLensView.applyPreset(FilterPreset.VINTAGE)
val presets = WaveLens.availablePresets()
```

See [`docs/INTEGRATION.md`](./INTEGRATION.md) and `android/demo/`.

---

## 13. Support

- **Studio:** [https://studio.wavelens.online](https://studio.wavelens.online)
- **WhatsApp:** +92 325 226 5427
- **Email:** supportwavetech@gmail.online

When asking Wave Lens team for Agora help, specify: **React Native**, **Agora RTC 4.x**, **host-only filtering**, **Android first**.
