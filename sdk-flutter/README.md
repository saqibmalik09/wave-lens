# Wave Lens Flutter Plugin (Phase 5 — not started)

Thin Flutter plugin over the same compiled native core used by the Android `.aar`
(and later the iOS `.xcframework`). Dart-side API mirrors the Kotlin API:

```dart
await WaveLens.init(clientId: '...', clientSecret: '...');
WaveLensPreview(); // platform view backed by the native render pipeline
```

No filter logic lives in Dart — it is a platform-channel wrapper only.
