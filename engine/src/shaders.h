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
// Order: skin smoothing / sharpening (spatial) -> parametric color adjustments ->
// 3D LUT (512x512 2D texture, 64 slices in an 8x8 grid) -> vignette.
constexpr const char* kProcessOesFragment = R"(#version 300 es
#extension GL_OES_EGL_image_external_essl3 : require
precision mediump float;
uniform samplerExternalOES uTexture;
uniform sampler2D uLut;
uniform mat4 uTexMatrix;  // shared with the vertex stage; used for face-warp re-projection
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uTemperature;
uniform float uTint;
uniform float uVignette;
uniform float uLutIntensity;
uniform float uSmoothing;
uniform float uSharpen;
uniform vec2 uTexelSize;
// Face AR uniforms — all positions in screen-normalized space (x right, y up).
// uFacePresence fades 0..1 as a face is found/lost so effects never pop.
uniform float uFacePresence;
uniform float uFaceDeform;
uniform vec2 uFaceEyeL;
uniform vec2 uFaceEyeR;
uniform vec2 uFaceUp;
uniform vec2 uFaceCenter;
uniform float uFaceRadius;
uniform float uAspect;        // viewport height / width, for circular geometry
uniform sampler2D uSticker;
uniform float uStickerOn;
uniform float uStickerOffset; // along face-up, in eye-distance units
uniform float uStickerSpan;   // sticker width, in eye-distance units
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

// Map a point to aspect-corrected space so distances/rotations are Euclidean.
vec2 acs(vec2 p) { return vec2(p.x, p.y * uAspect); }

void main() {
    vec2 sampleTex = vTex;

    // Face bulge ("funny" deform): magnify inside the face circle. Warp the screen
    // coordinate, then re-project through the camera matrix. Gated by presence so
    // it only applies while a face is actually tracked.
    float deform = uFaceDeform * uFacePresence;
    if (deform > 0.001) {
        vec2 p = acs(vScreen);
        vec2 ctr = acs(uFaceCenter);
        vec2 d = p - ctr;
        float r = length(d) / max(uFaceRadius, 0.001);
        if (r < 1.0) {
            float k = deform * 0.35 * (1.0 - r * r);
            vec2 warped = ctr + d * (1.0 - k);
            vec2 ws = vec2(warped.x, warped.y / uAspect);
            sampleTex = (uTexMatrix * vec4(ws, 0.0, 1.0)).xy;
        }
    }

    vec3 c = texture(uTexture, sampleTex).rgb;

    // Beauty smoothing + detail sharpening share one 8-tap neighborhood read.
    if (uSmoothing > 0.001 || uSharpen > 0.001) {
        vec2 r1 = uTexelSize * 2.0;
        vec2 r2 = uTexelSize * 4.0;
        vec3 sum = vec3(0.0);
        vec3 bsum = vec3(0.0);
        float bw = 0.0;
        vec2 offs[8];
        offs[0] = vec2( r1.x, 0.0);   offs[1] = vec2(-r1.x, 0.0);
        offs[2] = vec2(0.0,  r1.y);   offs[3] = vec2(0.0, -r1.y);
        offs[4] = vec2( r2.x,  r2.y); offs[5] = vec2(-r2.x,  r2.y);
        offs[6] = vec2( r2.x, -r2.y); offs[7] = vec2(-r2.x, -r2.y);
        for (int i = 0; i < 8; i++) {
            vec3 s = texture(uTexture, sampleTex + offs[i]).rgb;
            sum += s;
            // Bilateral weight: nearby colors count, edges (big color deltas) don't —
            // smooths skin texture while keeping eyes/lips/hair lines crisp.
            vec3 d = s - c;
            float w = 1.0 - clamp(dot(d, d) * 18.0, 0.0, 1.0);
            bsum += s * w;
            bw += w;
        }
        vec3 avg = sum * 0.125;
        vec3 bilateral = (bsum + c) / (bw + 1.0);
        c = mix(c, bilateral, clamp(uSmoothing, 0.0, 1.0));
        if (uSharpen > 0.001) {
            c += (c - avg) * uSharpen * 1.4;  // unsharp mask
        }
    }

    c += vec3(uBrightness);
    c = (c - 0.5) * (1.0 + uContrast) + 0.5;
    float luma = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(luma), c, 1.0 + uSaturation);
    c.r += uTemperature * 0.18;
    c.b -= uTemperature * 0.18;
    c.g += uTint * 0.14;
    c = clamp(c, 0.0, 1.0);
    if (uLutIntensity > 0.001) {
        c = mix(c, applyLut(c), clamp(uLutIntensity, 0.0, 1.0));
    }
    if (uVignette > 0.001) {
        float d = distance(vScreen, vec2(0.5));
        float v = smoothstep(0.35, 0.85, d);
        c *= 1.0 - v * uVignette;
    }

    // Face-anchored 2D sticker (glasses/ears/...): a textured quad defined by the
    // eye axis — follows position, tilt and scale of the tracked face. Composited
    // last so it sits on top of all color work; fades with uFacePresence.
    if (uStickerOn > 0.5 && uFacePresence > 0.01) {
        vec2 eL = acs(uFaceEyeL);
        vec2 eR = acs(uFaceEyeR);
        vec2 axis = eR - eL;
        float eyeDist = max(length(axis), 0.001);
        vec2 xdir = axis / eyeDist;
        vec2 ydir = vec2(-xdir.y, xdir.x);
        vec2 upA = acs(uFaceUp);
        if (dot(ydir, upA) < 0.0) ydir = -ydir;   // ydir always points to the forehead
        float span = eyeDist * uStickerSpan;
        vec2 mid = (eL + eR) * 0.5 + ydir * (uStickerOffset * eyeDist);
        vec2 rel = acs(vScreen) - mid;
        vec2 suv = vec2(
            0.5 + dot(rel, xdir) / span,
            0.5 - dot(rel, ydir) / span
        );
        if (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) {
            // Sticker pixels are premultiplied (Android Bitmap), so blend as src-over.
            vec4 s = texture(uSticker, suv);
            c = c * (1.0 - s.a * uFacePresence) + s.rgb * uFacePresence;
        }
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
