#include "lut.h"

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <sstream>

namespace wavelens {
namespace lut {

namespace {

inline float clamp01(float v) { return v < 0.f ? 0.f : (v > 1.f ? 1.f : v); }
inline float lerp(float a, float b, float t) { return a + (b - a) * t; }
// Smoothstep-shaped S-curve blended with identity; amount 0..1.
inline float scurve(float x, float amount) {
    float s = x * x * (3.f - 2.f * x);
    return lerp(x, s, amount);
}

struct Rgb {
    float r, g, b;
};

Rgb transformIdentity(float r, float g, float b) { return {r, g, b}; }

Rgb transformBw(float r, float g, float b) {
    float l = 0.299f * r + 0.587f * g + 0.114f * b;
    l = scurve(l, 0.35f);  // punchy monochrome
    return {l, l, l};
}

Rgb transformSepia(float r, float g, float b) {
    return {
        clamp01(0.393f * r + 0.769f * g + 0.189f * b),
        clamp01(0.349f * r + 0.686f * g + 0.168f * b),
        clamp01(0.272f * r + 0.534f * g + 0.131f * b),
    };
}

Rgb transformVintage(float r, float g, float b) {
    float l = 0.299f * r + 0.587f * g + 0.114f * b;
    // desaturate, lift blacks / fade highlights, warm tint
    r = lerp(r, l, 0.25f) * 0.86f + 0.075f;
    g = lerp(g, l, 0.25f) * 0.86f + 0.065f;
    b = lerp(b, l, 0.25f) * 0.86f + 0.05f;
    r = scurve(r, 0.15f) + 0.035f;
    g = scurve(g, 0.15f);
    b = scurve(b, 0.15f) - 0.045f;
    return {clamp01(r), clamp01(g), clamp01(b)};
}

Rgb transformFilmWarm(float r, float g, float b) {
    float l = 0.299f * r + 0.587f * g + 0.114f * b;
    // gentle contrast S-curve, slight saturation boost, warm shift
    r = clamp01(lerp(l, scurve(r, 0.3f), 1.1f) + 0.03f);
    g = clamp01(lerp(l, scurve(g, 0.3f), 1.08f));
    b = clamp01(lerp(l, scurve(b, 0.3f), 1.05f) - 0.03f);
    return {r, g, b};
}

Rgb transformFilmCool(float r, float g, float b) {
    float l = 0.299f * r + 0.587f * g + 0.114f * b;
    r = clamp01(lerp(l, scurve(r, 0.3f), 1.02f) - 0.02f);
    g = clamp01(lerp(l, scurve(g, 0.3f), 1.02f) + 0.005f);
    b = clamp01(lerp(l, scurve(b, 0.3f), 1.05f) + 0.04f);
    return {r, g, b};
}

using TransformFn = Rgb (*)(float, float, float);

TransformFn transformFor(const std::string& name) {
    if (name == "bw") return transformBw;
    if (name == "sepia") return transformSepia;
    if (name == "vintage") return transformVintage;
    if (name == "film_warm") return transformFilmWarm;
    if (name == "film_cool") return transformFilmCool;
    return transformIdentity;
}

// Writes value for LUT grid point (ri, gi, bi) into the tiled 512x512 buffer.
inline void writeTexel(std::vector<uint8_t>& buf, int ri, int gi, int bi, const Rgb& c) {
    int tileX = bi % kGrid;
    int tileY = bi / kGrid;
    int px = tileX * kSize + ri;
    int py = tileY * kSize + gi;
    size_t off = ((size_t)py * kTexDim + px) * 4;
    buf[off + 0] = (uint8_t)std::lround(clamp01(c.r) * 255.f);
    buf[off + 1] = (uint8_t)std::lround(clamp01(c.g) * 255.f);
    buf[off + 2] = (uint8_t)std::lround(clamp01(c.b) * 255.f);
    buf[off + 3] = 255;
}

}  // namespace

GLuint createTexture() {
    GLuint tex = 0;
    glGenTextures(1, &tex);
    glBindTexture(GL_TEXTURE_2D, tex);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    return tex;
}

void upload(GLuint texture, const std::vector<uint8_t>& rgba) {
    if (rgba.size() != kBytes) return;
    glBindTexture(GL_TEXTURE_2D, texture);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, kTexDim, kTexDim, 0, GL_RGBA, GL_UNSIGNED_BYTE,
                 rgba.data());
}

std::vector<uint8_t> generatePreset(const std::string& name) {
    std::vector<uint8_t> buf(kBytes, 255);
    TransformFn fn = transformFor(name);
    const float inv = 1.f / (kSize - 1);
    for (int bi = 0; bi < kSize; ++bi) {
        for (int gi = 0; gi < kSize; ++gi) {
            for (int ri = 0; ri < kSize; ++ri) {
                Rgb c = fn(ri * inv, gi * inv, bi * inv);
                writeTexel(buf, ri, gi, bi, c);
            }
        }
    }
    return buf;
}

bool parseCube(const std::string& contents, std::vector<uint8_t>& outRgba) {
    std::istringstream in(contents);
    std::string line;
    int n = 0;
    std::vector<float> data;  // r,g,b triples, r fastest then g then b

    while (std::getline(in, line)) {
        // trim leading whitespace
        size_t start = line.find_first_not_of(" \t\r");
        if (start == std::string::npos) continue;
        if (line[start] == '#') continue;
        std::string trimmed = line.substr(start);
        if (trimmed.rfind("TITLE", 0) == 0 || trimmed.rfind("DOMAIN_", 0) == 0) continue;
        if (trimmed.rfind("LUT_3D_SIZE", 0) == 0) {
            n = std::atoi(trimmed.c_str() + 11);
            if (n < 2 || n > 256) return false;
            data.reserve((size_t)n * n * n * 3);
            continue;
        }
        if (trimmed.rfind("LUT_1D_SIZE", 0) == 0) return false;  // 1D LUTs unsupported

        std::istringstream ls(trimmed);
        float r, g, b;
        if (ls >> r >> g >> b) {
            data.push_back(r);
            data.push_back(g);
            data.push_back(b);
        }
    }

    if (n == 0 || data.size() != (size_t)n * n * n * 3) return false;

    auto sample = [&](int ri, int gi, int bi, int ch) -> float {
        size_t idx = ((size_t)bi * n * n + (size_t)gi * n + ri) * 3 + ch;
        return data[idx];
    };

    outRgba.assign(kBytes, 255);
    const float scale = (float)(n - 1) / (kSize - 1);
    for (int bi = 0; bi < kSize; ++bi) {
        float fb = bi * scale;
        int b0 = (int)fb, b1 = std::min(b0 + 1, n - 1);
        float tb = fb - b0;
        for (int gi = 0; gi < kSize; ++gi) {
            float fg = gi * scale;
            int g0 = (int)fg, g1 = std::min(g0 + 1, n - 1);
            float tg = fg - g0;
            for (int ri = 0; ri < kSize; ++ri) {
                float fr = ri * scale;
                int r0 = (int)fr, r1 = std::min(r0 + 1, n - 1);
                float tr = fr - r0;
                Rgb c;
                float* out[3] = {&c.r, &c.g, &c.b};
                for (int ch = 0; ch < 3; ++ch) {
                    float c00 = lerp(sample(r0, g0, b0, ch), sample(r1, g0, b0, ch), tr);
                    float c10 = lerp(sample(r0, g1, b0, ch), sample(r1, g1, b0, ch), tr);
                    float c01 = lerp(sample(r0, g0, b1, ch), sample(r1, g0, b1, ch), tr);
                    float c11 = lerp(sample(r0, g1, b1, ch), sample(r1, g1, b1, ch), tr);
                    *out[ch] = lerp(lerp(c00, c10, tg), lerp(c01, c11, tg), tb);
                }
                writeTexel(outRgba, ri, gi, bi, c);
            }
        }
    }
    return true;
}

}  // namespace lut
}  // namespace wavelens
