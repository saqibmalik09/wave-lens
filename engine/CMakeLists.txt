cmake_minimum_required(VERSION 3.22)
project(wavelens_engine CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(wavelens SHARED
        src/gl_utils.cpp
        src/lut.cpp
        src/auto_adjust.cpp
        src/engine.cpp
        src/jni_bridge.cpp)

target_include_directories(wavelens PRIVATE include)

# Keep the binary small and the implementation hidden.
target_compile_options(wavelens PRIVATE -fvisibility=hidden -ffunction-sections -fdata-sections -Os)
target_link_options(wavelens PRIVATE -Wl,--gc-sections -Wl,--exclude-libs,ALL)

find_library(log-lib log)
find_library(android-lib android)
find_library(gles-lib GLESv3)

target_link_libraries(wavelens ${log-lib} ${android-lib} ${gles-lib})
