#pragma once

#include <GLES3/gl3.h>
#include <cstdint>
#include <string>
#include <vector>

namespace wavelens {

// Keep ids in sync with FilterParam.kt on the Kotlin side.
enum Param {
    PARAM_BRIGHTNESS = 0,
    PARAM_CONTRAST = 1,
    PARAM_SATURATION = 2,
    PARAM_TEMPERATURE = 3,
    PARAM_TINT = 4,
    PARAM_VIGNETTE = 5,
    PARAM_GLOW = 6,
    PARAM_LUT_INTENSITY = 7,
    PARAM_COUNT = 8
};

// Smoothed auto-adjust state (auto exposure / contrast / white balance).
struct AutoState {
    float brightness = 0.f;
    float contrast = 0.f;
    float temperature = 0.f;
    float targetBrightness = 0.f;
    float targetContrast = 0.f;
    float targetTemperature = 0.f;
};

struct Fbo {
    GLuint fbo = 0;
    GLuint tex = 0;
    int w = 0;
    int h = 0;
};

// One engine instance per render surface. All methods must be called on the GL thread,
// except setParam/setAutoEnabled which only write plain floats/bools (queued from Kotlin
// onto the GL thread anyway for consistency).
class Engine {
public:
    Engine() = default;
    ~Engine() = default;

    void onSurfaceCreated();
    void onSurfaceChanged(int width, int height);
    void draw(int oesTextureId, const float* texMatrix16);

    void setParam(int param, float value);
    float getParam(int param) const;

    // name: "" (identity/none), "bw", "sepia", "vintage", "film_warm", "film_cool"
    void setPresetLut(const std::string& name);
    // Contents of a .cube file; resampled into the internal 64^3 LUT.
    bool loadCubeLut(const std::string& cubeFileContents);

    void setAutoEnabled(bool enabled);
    bool autoEnabled() const { return autoOn_; }

private:
    struct ProcessLocs {
        GLint texMatrix = -1, tex = -1, lutTex = -1;
        GLint brightness = -1, contrast = -1, saturation = -1;
        GLint temperature = -1, tint = -1, vignette = -1, lutIntensity = -1;
    };
    struct SimpleLocs {
        GLint texMatrix = -1, tex = -1;
    };
    struct BlurLocs {
        GLint texMatrix = -1, tex = -1, texelOffset = -1;
    };
    struct CompositeLocs {
        GLint texMatrix = -1, base = -1, glow = -1, strength = -1;
    };

    void destroyFbos();
    void createFbo(Fbo& fbo, int w, int h);
    void drawQuad() const;
    void applyCurrentLut();
    void runAutoAnalysis(int oesTextureId, const float* texMatrix16);
    void stepAutoSmoothing();
    void drawProcessPass(int oesTextureId, const float* texMatrix16,
                         float brightness, float contrast, float saturation,
                         float temperature, float tint, float vignette, float lutIntensity);

    bool surfaceReady_ = false;
    int width_ = 0;
    int height_ = 0;
    uint64_t frame_ = 0;

    GLuint progProcess_ = 0, progBright_ = 0, progBlur_ = 0, progComposite_ = 0, progOesCopy_ = 0;
    ProcessLocs processLocs_;
    SimpleLocs brightLocs_;
    BlurLocs blurLocs_;
    CompositeLocs compositeLocs_;
    SimpleLocs oesCopyLocs_;

    GLuint vao_ = 0;
    GLuint vbo_ = 0;
    GLuint lutTex_ = 0;

    Fbo scene_;
    Fbo glowA_;
    Fbo glowB_;
    Fbo analysis_;

    float params_[PARAM_COUNT] = {0.f};
    std::string lutName_;
    std::vector<uint8_t> customLut_;  // non-empty when a .cube LUT is loaded
    bool autoOn_ = false;
    AutoState auto_;
};

}  // namespace wavelens
