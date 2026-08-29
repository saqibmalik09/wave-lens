# Wave Lens React Native Module (Phase 5 — not started)

Thin native module (Turbo module) over the same compiled native core used by the
Android `.aar` (and later the iOS `.xcframework`).

```jsx
import { WaveLens, WaveLensPreview } from '@wavelens/react-native';
await WaveLens.init(clientId, clientSecret);
<WaveLensPreview style={{ flex: 1 }} />
```

No filter logic lives in JS — it is a bridge wrapper only.
