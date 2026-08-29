# Wave Lens — Tenant Integration Guide (Android)

Target: a beginner Android developer integrates in under 10 minutes.

## 1. Add the SDK

Copy `wavelens-release.aar` into your app's `libs/` folder and add:

```gradle
dependencies {
    implementation files('libs/wavelens-release.aar')
    // CameraX (required by the SDK's preview view)
    implementation 'androidx.camera:camera-core:1.3.4'
    implementation 'androidx.camera:camera-camera2:1.3.4'
    implementation 'androidx.camera:camera-lifecycle:1.3.4'
}
```

Requirements: `minSdk 24`, OpenGL ES 3.0 (all Android 10–17 devices).

## 2. Initialize once

In your `Application` (or first Activity):

```kotlin
WaveLens.init(
    context = this,
    clientId = "YOUR_CLIENT_ID",        // from your Wave Lens dashboard
    clientSecret = "YOUR_CLIENT_SECRET",
    baseUrl = "https://YOUR-LICENSE-SERVER",
)
```

This never blocks startup. It reads the last cached entitlement immediately and
refreshes in the background. Works fully offline after the first successful check.

## 3. Show the filtered camera

Layout:

```xml
<com.wavelens.sdk.WaveLensView
    android:id="@+id/waveLensView"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

Activity (after CAMERA permission is granted):

```kotlin
waveLensView.startCamera(this)                       // front camera by default
waveLensView.applyPreset(FilterPreset.VINTAGE)       // one-tap looks
waveLensView.setParam(FilterParam.BRIGHTNESS, 0.2f)  // sliders, -1..1
waveLensView.setAutoEnabled(true)                    // auto exposure/WB/contrast
```

Forward lifecycle: call `waveLensView.onResume()` / `waveLensView.onPause()`.

## 4. Build the tray from the license

```kotlin
val presets = WaveLens.availablePresets()  // entitled ∩ enabled, fail-open
WaveLens.addLicenseListener { active, filters -> /* rebuild your tray */ }
```

That's the entire integration. No tokens, no callbacks required at stream time,
no network on the render path.

## Performance notes (why it won't lag or heat)

- All pixel work is GPU shaders (OpenGL ES 3.0); the CPU never touches frames.
- Rendering is on-demand: no camera frame, no work.
- License payload is ~1 KB JSON, checked on app start and every ~4 hours.
- Filter switching is an in-memory uniform/LUT swap — instant, no I/O.
