#pragma once

#include <cstdint>

namespace wavelens {

struct AutoTargets {
    float brightness = 0.f;
    float contrast = 0.f;
    float temperature = 0.f;
};

// Computes auto exposure / contrast / white-balance targets from a small RGBA
// snapshot of the camera frame (e.g. 32x32 read back from the analysis FBO).
AutoTargets computeAutoTargets(const uint8_t* rgba, int pixelCount);

}  // namespace wavelens
