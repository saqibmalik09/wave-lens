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

    // Auto exposure: pull mean luminance toward mid-gray (strong enough to rescue
    // dim rooms and blown-out backlight, clamped so faces never look artificial).
    t.brightness = clampf((0.5f - meanLuma) * 1.1f, -0.45f, 0.45f);

    // Auto contrast: flat scenes (low luma spread) get a boost, harsh ones get softened.
    t.contrast = clampf((0.16f - stddev) * 1.5f, -0.18f, 0.32f);

    // Auto white balance (gray-world): bluish frames get warmed, reddish frames cooled.
    t.temperature = clampf((meanB - meanR) * 1.8f, -0.45f, 0.45f);

    // Low-light rescue: dark scenes get extra smoothing to hide the sensor noise
    // that the exposure lift would otherwise amplify. Free — reuses the beauty
    // smoothing taps already in the main pass.
    float lowLight = clampf((0.32f - meanLuma) / 0.32f, 0.f, 1.f);
    t.denoise = lowLight * 0.35f;

    return t;
}

}  // namespace wavelens
