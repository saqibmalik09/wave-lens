#include "wavelens/engine.h"

#include <GLES2/gl2ext.h>
#include <android/log.h>
#include <cmath>
#include <cstring>

#include "auto_adjust.h"
#include "gl_utils.h"
#include "lut.h"
#include "shaders.h"

#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, "WaveLens", __VA_ARGS__)

namespace wavelens {

namespace {

constexpr int kAnalysisDim = 32;
constexpr int kAnalysisIntervalFrames = 15;  // ~2x/sec at 30fps
constexpr float kAutoSmoothing = 0.06f;

const float kIdentityMatrix[16] = {
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
};

// Fullscreen quad: x, y, u, v (triangle strip).
const float kQuad[] = {
    -1.f, -1.f, 0.f, 0.f,
     1.f, -1.f, 1.f, 0.f,
    -1.f,  1.f, 0.f, 1.f,
     1.f,  1.f, 1.f, 1.f,
};

}  // namespace

void Engine::onSurfaceCreated() {
    // A new EGL context invalidates all previous GL object ids; just rebuild.
    surfaceReady_ = false;
    frame_ = 0;
    scene_ = Fbo{};
    glowA_ = Fbo{};
    glowB_ = Fbo{};
    analysis_ = Fbo{};

    progProcess_ = gl::buildProgram(kVertexShader, kProcessOesFragment);
    progOesCopy_ = gl::buildProgram(kVertexShader, kOesCopyFragment);
    progBright_ = gl::buildProgram(kVertexShader, kBrightPassFragment);
    progBlur_ = gl::buildProgram(kVertexShader, kBlurFragment);
    progComposite_ = gl::buildProgram(kVertexShader, kCompositeFragment);
    if (!progProcess_ || !progOesCopy_ || !progBright_ || !progBlur_ || !progComposite_) {
        LOGE("Failed to build shader programs");
        return;
    }

    processLocs_.texMatrix = glGetUniformLocation(progProcess_, "uTexMatrix");
    processLocs_.tex = glGetUniformLocation(progProcess_, "uTexture");
    processLocs_.lutTex = glGetUniformLocation(progProcess_, "uLut");
    processLocs_.brightness = glGetUniformLocation(progProcess_, "uBrightness");
    processLocs_.contrast = glGetUniformLocation(progProcess_, "uContrast");
    processLocs_.saturation = glGetUniformLocation(progProcess_, "uSaturation");
    processLocs_.temperature = glGetUniformLocation(progProcess_, "uTemperature");
    processLocs_.tint = glGetUniformLocation(progProcess_, "uTint");
    processLocs_.vignette = glGetUniformLocation(progProcess_, "uVignette");
    processLocs_.lutIntensity = glGetUniformLocation(progProcess_, "uLutIntensity");

    oesCopyLocs_.texMatrix = glGetUniformLocation(progOesCopy_, "uTexMatrix");
    oesCopyLocs_.tex = glGetUniformLocation(progOesCopy_, "uTexture");

    brightLocs_.texMatrix = glGetUniformLocation(progBright_, "uTexMatrix");
    brightLocs_.tex = glGetUniformLocation(progBright_, "uTexture");

    blurLocs_.texMatrix = glGetUniformLocation(progBlur_, "uTexMatrix");
    blurLocs_.tex = glGetUniformLocation(progBlur_, "uTexture");
    blurLocs_.texelOffset = glGetUniformLocation(progBlur_, "uTexelOffset");

    compositeLocs_.texMatrix = glGetUniformLocation(progComposite_, "uTexMatrix");
    compositeLocs_.base = glGetUniformLocation(progComposite_, "uBase");
    compositeLocs_.glow = glGetUniformLocation(progComposite_, "uGlow");
    compositeLocs_.strength = glGetUniformLocation(progComposite_, "uGlowStrength");

    glGenVertexArrays(1, &vao_);
    glBindVertexArray(vao_);
    glGenBuffers(1, &vbo_);
    glBindBuffer(GL_ARRAY_BUFFER, vbo_);
    glBufferData(GL_ARRAY_BUFFER, sizeof(kQuad), kQuad, GL_STATIC_DRAW);
    glEnableVertexAttribArray(0);
    glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 16, (const void*)0);
    glEnableVertexAttribArray(1);
    glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, 16, (const void*)8);
    glBindVertexArray(0);

    lutTex_ = lut::createTexture();
    applyCurrentLut();

    createFbo(analysis_, kAnalysisDim, kAnalysisDim);

    glDisable(GL_DEPTH_TEST);
    glDisable(GL_BLEND);

    surfaceReady_ = true;
}

void Engine::onSurfaceChanged(int width, int height) {
    width_ = width;
    height_ = height;
    if (!surfaceReady_) return;
    createFbo(scene_, width, height);
    int gw = width / 4 > 0 ? width / 4 : 1;
    int gh = height / 4 > 0 ? height / 4 : 1;
    createFbo(glowA_, gw, gh);
    createFbo(glowB_, gw, gh);
}

void Engine::createFbo(Fbo& fbo, int w, int h) {
    if (fbo.fbo != 0 && fbo.w == w && fbo.h == h) return;
    if (fbo.fbo != 0) {
        glDeleteFramebuffers(1, &fbo.fbo);
        glDeleteTextures(1, &fbo.tex);
        fbo = Fbo{};
    }
    glGenTextures(1, &fbo.tex);
    glBindTexture(GL_TEXTURE_2D, fbo.tex);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);

    glGenFramebuffers(1, &fbo.fbo);
    glBindFramebuffer(GL_FRAMEBUFFER, fbo.fbo);
    glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, fbo.tex, 0);
    if (glCheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE) {
        LOGE("FBO incomplete (%dx%d)", w, h);
    }
    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    fbo.w = w;
    fbo.h = h;
}

void Engine::drawQuad() const {
    glBindVertexArray(vao_);
    glDrawArrays(GL_TRIANGLE_STRIP, 0, 4);
    glBindVertexArray(0);
}

void Engine::drawProcessPass(int oesTextureId, const float* texMatrix16, float brightness,
                             float contrast, float saturation, float temperature, float tint,
                             float vignette, float lutIntensity) {
    glUseProgram(progProcess_);
    glUniformMatrix4fv(processLocs_.texMatrix, 1, GL_FALSE, texMatrix16);
    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_EXTERNAL_OES, (GLuint)oesTextureId);
    glUniform1i(processLocs_.tex, 0);
    glActiveTexture(GL_TEXTURE1);
    glBindTexture(GL_TEXTURE_2D, lutTex_);
    glUniform1i(processLocs_.lutTex, 1);
    glUniform1f(processLocs_.brightness, brightness);
    glUniform1f(processLocs_.contrast, contrast);
    glUniform1f(processLocs_.saturation, saturation);
    glUniform1f(processLocs_.temperature, temperature);
    glUniform1f(processLocs_.tint, tint);
    glUniform1f(processLocs_.vignette, vignette);
    glUniform1f(processLocs_.lutIntensity, lutIntensity);
    drawQuad();
}

void Engine::draw(int oesTextureId, const float* texMatrix16) {
    if (!surfaceReady_ || width_ <= 0 || height_ <= 0) return;
    frame_++;

    if (autoOn_ && (frame_ % kAnalysisIntervalFrames == 1)) {
        runAutoAnalysis(oesTextureId, texMatrix16);
    }
    stepAutoSmoothing();

    const float brightness = params_[PARAM_BRIGHTNESS] + auto_.brightness;
    const float contrast = params_[PARAM_CONTRAST] + auto_.contrast;
    const float saturation = params_[PARAM_SATURATION];
    const float temperature = params_[PARAM_TEMPERATURE] + auto_.temperature;
    const float tint = params_[PARAM_TINT];
    const float vignette = params_[PARAM_VIGNETTE];
    const float lutIntensity = params_[PARAM_LUT_INTENSITY];
    const float glow = params_[PARAM_GLOW];

    if (glow < 0.001f) {
        glBindFramebuffer(GL_FRAMEBUFFER, 0);
        glViewport(0, 0, width_, height_);
        drawProcessPass(oesTextureId, texMatrix16, brightness, contrast, saturation, temperature,
                        tint, vignette, lutIntensity);
        return;
    }

    // Glow path: scene -> brightpass (1/4 res) -> blur H -> blur V -> composite.
    glBindFramebuffer(GL_FRAMEBUFFER, scene_.fbo);
    glViewport(0, 0, scene_.w, scene_.h);
    drawProcessPass(oesTextureId, texMatrix16, brightness, contrast, saturation, temperature,
                    tint, vignette, lutIntensity);

    glBindFramebuffer(GL_FRAMEBUFFER, glowA_.fbo);
    glViewport(0, 0, glowA_.w, glowA_.h);
    glUseProgram(progBright_);
    glUniformMatrix4fv(brightLocs_.texMatrix, 1, GL_FALSE, kIdentityMatrix);
    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_2D, scene_.tex);
    glUniform1i(brightLocs_.tex, 0);
    drawQuad();

    glUseProgram(progBlur_);
    glUniformMatrix4fv(blurLocs_.texMatrix, 1, GL_FALSE, kIdentityMatrix);
    glUniform1i(blurLocs_.tex, 0);

    glBindFramebuffer(GL_FRAMEBUFFER, glowB_.fbo);
    glViewport(0, 0, glowB_.w, glowB_.h);
    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_2D, glowA_.tex);
    glUniform2f(blurLocs_.texelOffset, 1.f / glowA_.w, 0.f);
    drawQuad();

    glBindFramebuffer(GL_FRAMEBUFFER, glowA_.fbo);
    glViewport(0, 0, glowA_.w, glowA_.h);
    glBindTexture(GL_TEXTURE_2D, glowB_.tex);
    glUniform2f(blurLocs_.texelOffset, 0.f, 1.f / glowB_.h);
    drawQuad();

    glBindFramebuffer(GL_FRAMEBUFFER, 0);
    glViewport(0, 0, width_, height_);
    glUseProgram(progComposite_);
    glUniformMatrix4fv(compositeLocs_.texMatrix, 1, GL_FALSE, kIdentityMatrix);
    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_2D, scene_.tex);
    glUniform1i(compositeLocs_.base, 0);
    glActiveTexture(GL_TEXTURE1);
    glBindTexture(GL_TEXTURE_2D, glowA_.tex);
    glUniform1i(compositeLocs_.glow, 1);
    glUniform1f(compositeLocs_.strength, glow);
    drawQuad();
}

void Engine::runAutoAnalysis(int oesTextureId, const float* texMatrix16) {
    glBindFramebuffer(GL_FRAMEBUFFER, analysis_.fbo);
    glViewport(0, 0, analysis_.w, analysis_.h);
    glUseProgram(progOesCopy_);
    glUniformMatrix4fv(oesCopyLocs_.texMatrix, 1, GL_FALSE, texMatrix16);
    glActiveTexture(GL_TEXTURE0);
    glBindTexture(GL_TEXTURE_EXTERNAL_OES, (GLuint)oesTextureId);
    glUniform1i(oesCopyLocs_.tex, 0);
    drawQuad();

    uint8_t pixels[kAnalysisDim * kAnalysisDim * 4];
    glReadPixels(0, 0, kAnalysisDim, kAnalysisDim, GL_RGBA, GL_UNSIGNED_BYTE, pixels);
    glBindFramebuffer(GL_FRAMEBUFFER, 0);

    AutoTargets t = computeAutoTargets(pixels, kAnalysisDim * kAnalysisDim);
    auto_.targetBrightness = t.brightness;
    auto_.targetContrast = t.contrast;
    auto_.targetTemperature = t.temperature;
}

void Engine::stepAutoSmoothing() {
    float tb = autoOn_ ? auto_.targetBrightness : 0.f;
    float tc = autoOn_ ? auto_.targetContrast : 0.f;
    float tt = autoOn_ ? auto_.targetTemperature : 0.f;
    auto_.brightness += (tb - auto_.brightness) * kAutoSmoothing;
    auto_.contrast += (tc - auto_.contrast) * kAutoSmoothing;
    auto_.temperature += (tt - auto_.temperature) * kAutoSmoothing;
}

void Engine::setParam(int param, float value) {
    if (param < 0 || param >= PARAM_COUNT) return;
    params_[param] = value;
}

float Engine::getParam(int param) const {
    if (param < 0 || param >= PARAM_COUNT) return 0.f;
    return params_[param];
}

void Engine::applyCurrentLut() {
    if (lutTex_ == 0) return;
    if (!customLut_.empty()) {
        lut::upload(lutTex_, customLut_);
    } else {
        lut::upload(lutTex_, lut::generatePreset(lutName_));
    }
}

void Engine::setPresetLut(const std::string& name) {
    lutName_ = (name == "identity") ? "" : name;
    customLut_.clear();
    if (surfaceReady_) applyCurrentLut();
}

bool Engine::loadCubeLut(const std::string& cubeFileContents) {
    std::vector<uint8_t> rgba;
    if (!lut::parseCube(cubeFileContents, rgba)) return false;
    customLut_ = std::move(rgba);
    lutName_.clear();
    if (surfaceReady_) applyCurrentLut();
    return true;
}

void Engine::setAutoEnabled(bool enabled) {
    autoOn_ = enabled;
}

void Engine::destroyFbos() {
    for (Fbo* f : {&scene_, &glowA_, &glowB_, &analysis_}) {
        if (f->fbo != 0) {
            glDeleteFramebuffers(1, &f->fbo);
            glDeleteTextures(1, &f->tex);
            *f = Fbo{};
        }
    }
}

}  // namespace wavelens
