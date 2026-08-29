#pragma once

// All GLSL ES 3.00 shaders used by the Wave Lens color pipeline.
// One vertex shader is shared by every pass; camera passes use the SurfaceTexture
// transform matrix, offscreen 2D passes use identity.

namespace wavelens {

constexpr const char* kVertexShader = R"(#version 300 es
layout(location = 0) in vec2 aPos;
layout(location = 1) in vec2 aTex;
uniform mat4 uTexMatrix;
out vec2 vTex;
out vec2 vScreen;
void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
    vTex = (uTexMatrix * vec4(aTex, 0.0, 1.0)).xy;
    vScreen = aTex;
}
)";

// Main color pass: camera (external OES) -> adjusted color.
// Parametric adjustments run first, then the 3D LUT (stored as a 512x512 2D texture,
// 64 slices in an 8x8 grid), then vignette.
constexpr const char* kProcessOesFragment = R"(#version 300 es
#extension GL_OES_EGL_image_external_essl3 : require
precision mediump float;
uniform samplerExternalOES uTexture;
uniform sampler2D uLut;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uTemperature;
uniform float uTint;
uniform float uVignette;
uniform float uLutIntensity;
in vec2 vTex;
in vec2 vScreen;
out vec4 fragColor;

vec3 applyLut(vec3 color) {
    float b = clamp(color.b, 0.0, 1.0) * 63.0;
    float bLow = floor(b);
    float bHigh = min(bLow + 1.0, 63.0);
    vec2 quadLow = vec2(mod(bLow, 8.0), floor(bLow / 8.0));
    vec2 quadHigh = vec2(mod(bHigh, 8.0), floor(bHigh / 8.0));
    vec2 uvInTile = clamp(color.rg, 0.0, 1.0) * (63.0 / 512.0) + (0.5 / 512.0);
    vec3 c1 = texture(uLut, quadLow * 0.125 + uvInTile).rgb;
    vec3 c2 = texture(uLut, quadHigh * 0.125 + uvInTile).rgb;
    return mix(c1, c2, b - bLow);
}

void main() {
    vec3 c = texture(uTexture, vTex).rgb;
    c += vec3(uBrightness);
    c = (c - 0.5) * (1.0 + uContrast) + 0.5;
    float luma = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(luma), c, 1.0 + uSaturation);
    c.r += uTemperature * 0.12;
    c.b -= uTemperature * 0.12;
    c.g += uTint * 0.10;
    c = clamp(c, 0.0, 1.0);
    if (uLutIntensity > 0.001) {
        c = mix(c, applyLut(c), clamp(uLutIntensity, 0.0, 1.0));
    }
    if (uVignette > 0.001) {
        float d = distance(vScreen, vec2(0.5));
        float v = smoothstep(0.35, 0.85, d);
        c *= 1.0 - v * uVignette;
    }
    fragColor = vec4(c, 1.0);
}
)";

// Plain copy of the camera texture (used for the tiny auto-adjust analysis FBO).
constexpr const char* kOesCopyFragment = R"(#version 300 es
#extension GL_OES_EGL_image_external_essl3 : require
precision mediump float;
uniform samplerExternalOES uTexture;
in vec2 vTex;
out vec4 fragColor;
void main() {
    fragColor = vec4(texture(uTexture, vTex).rgb, 1.0);
}
)";

// Glow pass 1: keep only bright areas (runs at 1/4 resolution).
constexpr const char* kBrightPassFragment = R"(#version 300 es
precision mediump float;
uniform sampler2D uTexture;
in vec2 vTex;
out vec4 fragColor;
void main() {
    vec3 c = texture(uTexture, vTex).rgb;
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    fragColor = vec4(c * smoothstep(0.55, 0.95, l), 1.0);
}
)";

// Glow pass 2/3: separable gaussian blur (5 taps, linear-sampling optimized).
constexpr const char* kBlurFragment = R"(#version 300 es
precision mediump float;
uniform sampler2D uTexture;
uniform vec2 uTexelOffset;
in vec2 vTex;
out vec4 fragColor;
void main() {
    vec2 o1 = uTexelOffset * 1.3846153846;
    vec2 o2 = uTexelOffset * 3.2307692308;
    vec3 sum = texture(uTexture, vTex).rgb * 0.2270270270;
    sum += texture(uTexture, vTex + o1).rgb * 0.3162162162;
    sum += texture(uTexture, vTex - o1).rgb * 0.3162162162;
    sum += texture(uTexture, vTex + o2).rgb * 0.0702702703;
    sum += texture(uTexture, vTex - o2).rgb * 0.0702702703;
    fragColor = vec4(sum, 1.0);
}
)";

// Glow pass 4: screen-blend the blurred highlights over the scene.
constexpr const char* kCompositeFragment = R"(#version 300 es
precision mediump float;
uniform sampler2D uBase;
uniform sampler2D uGlow;
uniform float uGlowStrength;
in vec2 vTex;
out vec4 fragColor;
void main() {
    vec3 base = texture(uBase, vTex).rgb;
    vec3 glow = clamp(texture(uGlow, vTex).rgb * uGlowStrength * 1.6, 0.0, 1.0);
    fragColor = vec4(1.0 - (1.0 - base) * (1.0 - glow), 1.0);
}
)";

}  // namespace wavelens
