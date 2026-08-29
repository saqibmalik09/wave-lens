#include "auto_adjust.h"

#include <cmath>

namespace wavelens {

namespace {
inline float clampf(float v, float lo, float hi) { return v < lo ? lo : (v > hi ? hi : v); }
}

AutoTargets computeAutoTargets(const uint8_t* rgba, int pixelCount) {
    AutoTargets t;
    if (pixelCount <= 0) return t;

    double sumR = 0, sumG = 0, sumB = 0, sumLuma = 0, sumLuma2 = 0;
    for (int i = 0; i < pixelCount; ++i) {
        float r = rgba[i * 4 + 0] / 255.f;
        float g = rgba[i * 4 + 1] / 255.f;
        float b = rgba[i * 4 + 2] / 255.f;
        float l = 0.299f * r + 0.587f * g + 0.114f * b;
        sumR += r;
        sumG += g;
        sumB += b;
        sumLuma += l;
        sumLuma2 += (double)l * l;
    }

    float meanR = (float)(sumR / pixelCount);
    float meanB = (float)(sumB / pixelCount);
    float meanLuma = (float)(sumLuma / pixelCount);
    float variance = (float)(sumLuma2 / pixelCount) - meanLuma * meanLuma;
    float stddev = variance > 0.f ? std::sqrt(variance) : 0.f;

    // Auto exposure: pull mean luminance toward mid-gray.
    t.brightness = clampf((0.5f - meanLuma) * 0.8f, -0.3f, 0.3f);

    // Auto contrast: flat scenes (low luma spread) get a boost, harsh ones get softened.
    t.contrast = clampf((0.16f - stddev) * 1.2f, -0.15f, 0.25f);

    // Auto white balance (gray-world): bluish frames get warmed, reddish frames cooled.
    t.temperature = clampf((meanB - meanR) * 1.5f, -0.4f, 0.4f);

    return t;
}

}  // namespace wavelens
