export type PlatformId = 'android' | 'ios';
export type TechId =
  | 'kotlin'
  | 'java'
  | 'compose'
  | 'flutter'
  | 'react-native'
  | 'swift';

export type IntegrationCredentials = {
  clientId: string;
  clientSecret?: string | null;
  bundleId: string;
  apiUrl?: string;
  appName?: string;
};

export type GuideStep = {
  title: string;
  body: string;
  code?: string;
};

export type IntegrationGuide = {
  platform: PlatformId;
  tech: TechId;
  title: string;
  availability: 'live' | 'soon';
  summary: string;
  steps: GuideStep[];
};

const DEFAULT_API = 'https://api.wavelens.online';

function fill(template: string, c: IntegrationCredentials): string {
  return template
    .replaceAll('{{CLIENT_ID}}', c.clientId || 'YOUR_CLIENT_ID')
    .replaceAll('{{CLIENT_SECRET}}', c.clientSecret || 'YOUR_CLIENT_SECRET')
    .replaceAll('{{BUNDLE_ID}}', c.bundleId || 'com.yourcompany.app')
    .replaceAll('{{API_URL}}', c.apiUrl || DEFAULT_API)
    .replaceAll('{{APP_NAME}}', c.appName || 'Your App');
}

const TECH_BY_PLATFORM: Record<PlatformId, TechId[]> = {
  android: ['kotlin', 'java', 'compose', 'flutter', 'react-native'],
  ios: ['swift', 'flutter', 'react-native'],
};

export function techsForPlatform(platform: PlatformId): TechId[] {
  return TECH_BY_PLATFORM[platform];
}

export function techLabel(tech: TechId): string {
  const map: Record<TechId, string> = {
    kotlin: 'Kotlin',
    java: 'Java',
    compose: 'Jetpack Compose',
    flutter: 'Flutter',
    'react-native': 'React Native',
    swift: 'Swift (iOS)',
  };
  return map[tech];
}

export function platformLabel(platform: PlatformId): string {
  return platform === 'android' ? 'Android' : 'iOS';
}

function androidGradleStep(): GuideStep {
  return {
    title: 'Add the Wave Lens AAR',
    body: 'Copy wavelens-release.aar into your app libs/ folder and declare CameraX dependencies. Requires minSdk 24 and OpenGL ES 3.0.',
    code: `dependencies {
    implementation files('libs/wavelens-release.aar')
    implementation 'androidx.camera:camera-core:1.3.4'
    implementation 'androidx.camera:camera-camera2:1.3.4'
    implementation 'androidx.camera:camera-lifecycle:1.3.4'
}`,
  };
}

function androidInitKotlin(c: IntegrationCredentials): GuideStep {
  return {
    title: 'Initialize once at app start',
    body: 'Call WaveLens.init from Application.onCreate (or your first Activity). License checks are fail-open and cache on device.',
    code: fill(
      `WaveLens.init(
    context = this,
    clientId = "{{CLIENT_ID}}",
    clientSecret = "{{CLIENT_SECRET}}",
    baseUrl = "{{API_URL}}",
)`,
      c,
    ),
  };
}

function androidInitJava(c: IntegrationCredentials): GuideStep {
  return {
    title: 'Initialize once at app start',
    body: 'Call WaveLens.init from Application.onCreate. Keep the secret out of source control when you can (BuildConfig / secrets).',
    code: fill(
      `WaveLens.init(
    this,
    "{{CLIENT_ID}}",
    "{{CLIENT_SECRET}}",
    "{{API_URL}}"
);`,
      c,
    ),
  };
}

function androidShowCamera(): GuideStep {
  return {
    title: 'Show the filtered camera',
    body: 'Add WaveLensView to your layout, request CAMERA permission, then start the preview and apply presets.',
    code: `<!-- layout -->
<com.wavelens.sdk.WaveLensView
    android:id="@+id/waveLensView"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />

// after CAMERA permission
waveLensView.startCamera(this)
waveLensView.applyPreset(FilterPreset.VINTAGE)
waveLensView.setAutoEnabled(true)
// forward onResume / onPause to the view`,
  };
}

function androidComposeNote(): GuideStep {
  return {
    title: 'Wrap WaveLensView in Compose',
    body: 'Use AndroidView to host the native WaveLensView inside a Composable screen.',
    code: `AndroidView(
    factory = { context ->
        WaveLensView(context).also { it.startCamera(lifecycleOwner) }
    },
    modifier = Modifier.fillMaxSize(),
)`,
  };
}

function flutterSteps(c: IntegrationCredentials): GuideStep[] {
  return [
    {
      title: 'Add the Flutter plugin (when available)',
      body: 'Flutter support wraps the same native Android/iOS core. Track Wave Lens Studio announcements for the published package name.',
      code: `dependencies:
  wavelens: ^0.1.0  # replace with published version`,
    },
    {
      title: 'Initialize with Studio credentials',
      body: 'Pass the same client ID, secret, and API URL from this Integration page.',
      code: fill(
        `await WaveLens.init(
  clientId: '{{CLIENT_ID}}',
  clientSecret: '{{CLIENT_SECRET}}',
  baseUrl: '{{API_URL}}',
);`,
        c,
      ),
    },
    {
      title: 'Show the camera view',
      body: 'Place WaveLensView in your widget tree after camera permission is granted.',
      code: `WaveLensView(
  onReady: (controller) {
    controller.applyPreset('vintage');
  },
)`,
    },
  ];
}

function rnSteps(c: IntegrationCredentials): GuideStep[] {
  return [
    {
      title: 'Configure environment variables',
      body: 'Keep secrets out of the repo. Match the package / bundle ID registered in Studio.',
      code: fill(
        `WAVELENS_CLIENT_ID={{CLIENT_ID}}
WAVELENS_CLIENT_SECRET={{CLIENT_SECRET}}
WAVELENS_BUNDLE_ID={{BUNDLE_ID}}
WAVELENS_API_URL={{API_URL}}`,
        c,
      ),
    },
    {
      title: 'Initialize the native module',
      body: 'Call init early in App.tsx / index before opening any live camera screen.',
      code: fill(
        `import { WaveLens } from 'react-native-wavelens';

await WaveLens.init({
  clientId: process.env.WAVELENS_CLIENT_ID,
  clientSecret: process.env.WAVELENS_CLIENT_SECRET,
  baseUrl: process.env.WAVELENS_API_URL,
});`,
        c,
      ),
    },
    {
      title: 'Render WaveLensView',
      body: 'For Agora / live apps, place the filtered preview where the host camera normally shows.',
      code: `<WaveLensView style={{ flex: 1 }} />`,
    },
  ];
}

function iosSwiftSteps(c: IntegrationCredentials): GuideStep[] {
  return [
    {
      title: 'Add the XCFramework',
      body: 'iOS ships as an XCFramework using the same C++ engine. Request early access if your plan includes iOS.',
      code: `// Xcode → Frameworks → WaveLens.xcframework
// Bundle ID must match Studio: {{BUNDLE_ID}}`.replaceAll(
        '{{BUNDLE_ID}}',
        c.bundleId || 'com.yourcompany.app',
      ),
    },
    {
      title: 'Initialize WaveLens',
      body: 'Call init once at launch with credentials from Studio.',
      code: fill(
        `WaveLens.shared.initialize(
  clientId: "{{CLIENT_ID}}",
  clientSecret: "{{CLIENT_SECRET}}",
  baseUrl: URL(string: "{{API_URL}}")!
)`,
        c,
      ),
    },
    {
      title: 'Present the camera view',
      body: 'Embed WaveLensViewController or WaveLensView after camera permission.',
      code: `let camera = WaveLensViewController()
present(camera, animated: true)`,
    },
  ];
}

export function buildGuide(
  platform: PlatformId,
  tech: TechId,
  credentials: IntegrationCredentials,
): IntegrationGuide {
  const c = credentials;
  const soon = (title: string, summary: string, steps: GuideStep[]): IntegrationGuide => ({
    platform,
    tech,
    title,
    availability: 'soon',
    summary,
    steps,
  });
  const live = (title: string, summary: string, steps: GuideStep[]): IntegrationGuide => ({
    platform,
    tech,
    title,
    availability: 'live',
    summary,
    steps,
  });

  if (platform === 'ios') {
    if (tech === 'swift') {
      return soon(
        'iOS (Swift) integration',
        'XCFramework path — same engine as Android. Contact Wave Tech if you need iOS early access.',
        iosSwiftSteps(c),
      );
    }
    if (tech === 'flutter') {
      return soon(
        'Flutter on iOS',
        'Flutter iOS uses the same plugin API once the iOS core ships.',
        flutterSteps(c),
      );
    }
    return soon(
      'React Native on iOS',
      'RN bridge will target the iOS XCFramework when available.',
      rnSteps(c),
    );
  }

  // Android
  if (tech === 'kotlin') {
    return live('Android (Kotlin) — go live in three steps', 'Native AAR. Production-ready today.', [
      androidGradleStep(),
      androidInitKotlin(c),
      androidShowCamera(),
    ]);
  }
  if (tech === 'java') {
    return live('Android (Java) — go live in three steps', 'Same AAR and API as Kotlin.', [
      androidGradleStep(),
      androidInitJava(c),
      androidShowCamera(),
    ]);
  }
  if (tech === 'compose') {
    return live(
      'Jetpack Compose integration',
      'Host WaveLensView inside AndroidView after the same Gradle + init steps.',
      [androidGradleStep(), androidInitKotlin(c), androidComposeNote(), androidShowCamera()],
    );
  }
  if (tech === 'flutter') {
    return soon(
      'Flutter on Android',
      'Thin plugin over the native core — package release coming soon.',
      flutterSteps(c),
    );
  }
  return soon(
    'React Native on Android',
    'Native module bridge — use with Agora or your own camera pipeline.',
    rnSteps(c),
  );
}

export function guideToPlainText(guide: IntegrationGuide, c: IntegrationCredentials): string {
  const lines: string[] = [
    'Wave Lens — Integration Guide',
    guide.title,
    `Platform: ${platformLabel(guide.platform)} · Tech: ${techLabel(guide.tech)}`,
    `Availability: ${guide.availability === 'live' ? 'Available now' : 'Coming soon'}`,
    '',
    guide.summary,
    '',
    'Your credentials',
    `App: ${c.appName || '—'}`,
    `Client ID: ${c.clientId}`,
    `Client secret: ${c.clientSecret || '(regenerate in Studio if you lost it)'}`,
    `Package / Bundle ID: ${c.bundleId}`,
    `API URL: ${c.apiUrl || DEFAULT_API}`,
    '',
  ];

  guide.steps.forEach((step, i) => {
    lines.push(`Step ${i + 1}. ${step.title}`);
    lines.push(step.body);
    if (step.code) {
      lines.push('');
      lines.push(step.code);
    }
    lines.push('');
  });

  lines.push('Support: WhatsApp +92 325 226 5427 · supportwavetech@gmail.online');
  lines.push('Studio: https://studio.wavelens.online');
  return lines.join('\n');
}
