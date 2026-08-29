#include "gl_utils.h"

#include <android/log.h>
#include <vector>

#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, "WaveLens", __VA_ARGS__)

namespace wavelens {
namespace gl {

GLuint compileShader(GLenum type, const char* source) {
    GLuint shader = glCreateShader(type);
    glShaderSource(shader, 1, &source, nullptr);
    glCompileShader(shader);

    GLint status = GL_FALSE;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &status);
    if (status != GL_TRUE) {
        GLint logLen = 0;
        glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &logLen);
        std::vector<char> log(logLen > 1 ? logLen : 1);
        glGetShaderInfoLog(shader, (GLsizei)log.size(), nullptr, log.data());
        LOGE("Shader compile failed: %s", log.data());
        glDeleteShader(shader);
        return 0;
    }
    return shader;
}

GLuint buildProgram(const char* vertexSource, const char* fragmentSource) {
    GLuint vs = compileShader(GL_VERTEX_SHADER, vertexSource);
    if (vs == 0) return 0;
    GLuint fs = compileShader(GL_FRAGMENT_SHADER, fragmentSource);
    if (fs == 0) {
        glDeleteShader(vs);
        return 0;
    }

    GLuint program = glCreateProgram();
    glAttachShader(program, vs);
    glAttachShader(program, fs);
    glLinkProgram(program);
    glDeleteShader(vs);
    glDeleteShader(fs);

    GLint status = GL_FALSE;
    glGetProgramiv(program, GL_LINK_STATUS, &status);
    if (status != GL_TRUE) {
        GLint logLen = 0;
        glGetProgramiv(program, GL_INFO_LOG_LENGTH, &logLen);
        std::vector<char> log(logLen > 1 ? logLen : 1);
        glGetProgramInfoLog(program, (GLsizei)log.size(), nullptr, log.data());
        LOGE("Program link failed: %s", log.data());
        glDeleteProgram(program);
        return 0;
    }
    return program;
}

}  // namespace gl
}  // namespace wavelens
