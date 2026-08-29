#pragma once

#include <GLES3/gl3.h>

namespace wavelens {
namespace gl {

GLuint compileShader(GLenum type, const char* source);
// Returns 0 on failure (errors are logged to logcat with tag "WaveLens").
GLuint buildProgram(const char* vertexSource, const char* fragmentSource);

}  // namespace gl
}  // namespace wavelens
