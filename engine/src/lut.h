#pragma once

#include <GLES3/gl3.h>
#include <cstdint>
#include <string>
#include <vector>

namespace wavelens {
namespace lut {

// 64^3 LUT stored as a 512x512 RGBA texture (8x8 grid of 64x64 slices).
constexpr int kSize = 64;
constexpr int kGrid = 8;
constexpr int kTexDim = kSize * kGrid;  // 512
constexpr size_t kBytes = (size_t)kTexDim * kTexDim * 4;

GLuint createTexture();
void upload(GLuint texture, const std::vector<uint8_t>& rgba);

// name: "" or "identity", "bw", "sepia", "vintage", "film_warm", "film_cool".
// Unknown names return identity.
std::vector<uint8_t> generatePreset(const std::string& name);

// Parses a .cube file (LUT_3D_SIZE N) and trilinearly resamples it to the internal
// 64-point grid. Returns false on malformed input.
bool parseCube(const std::string& contents, std::vector<uint8_t>& outRgba);

}  // namespace lut
}  // namespace wavelens
