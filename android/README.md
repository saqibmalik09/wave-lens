# Wave Lens — Android

Two modules:

- `wavelens/` — the SDK library (builds `wavelens-release.aar`). Kotlin API + JNI over the
  C++ engine in `../engine`.
- `demo/` — sample app: live camera preview with the color-effects tray.

## Setup (beginner-friendly)

1. Install [Android Studio](https://developer.android.com/studio) (Hedgehog 2023.1.1 or newer).
2. Open **this `android/` folder** as the project.
3. On first sync, Android Studio installs the required **NDK** and **CMake 3.22.1**
   automatically. If it asks, accept; if the build complains, install them manually via
   Tools > SDK Manager > SDK Tools > check "NDK (Side by side)" and "CMake".
4. If Studio asks to create the Gradle wrapper, accept (or run `gradle wrapper --gradle-version 8.7`
   in this folder if you have Gradle installed).
5. Plug in a real device (camera needed), select the `demo` run configuration, press Run.

## Building the AAR for tenants

```bash
./gradlew :wavelens:assembleRelease
# output: wavelens/build/outputs/aar/wavelens-release.aar
```

## Requirements

- minSdk 24 (Android 7.0+ — covers Android 10–17 targets with room below)
- OpenGL ES 3.0 (effectively universal on Android 8+ hardware)
- ABIs: armeabi-v7a, arm64-v8a, x86_64 (emulator)
