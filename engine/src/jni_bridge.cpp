#include <jni.h>

#include <string>

#include "wavelens/engine.h"

using wavelens::Engine;

namespace {
inline Engine* toEngine(jlong handle) { return reinterpret_cast<Engine*>(handle); }

std::string toStdString(JNIEnv* env, jstring s) {
    if (s == nullptr) return {};
    const char* chars = env->GetStringUTFChars(s, nullptr);
    std::string result(chars ? chars : "");
    if (chars) env->ReleaseStringUTFChars(s, chars);
    return result;
}
}  // namespace

extern "C" {

JNIEXPORT jlong JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeCreate(JNIEnv*, jobject) {
    return reinterpret_cast<jlong>(new Engine());
}

JNIEXPORT void JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeDestroy(JNIEnv*, jobject, jlong handle) {
    delete toEngine(handle);
}

JNIEXPORT void JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeOnSurfaceCreated(JNIEnv*, jobject,
                                                                   jlong handle) {
    if (Engine* e = toEngine(handle)) e->onSurfaceCreated();
}

JNIEXPORT void JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeOnSurfaceChanged(JNIEnv*, jobject, jlong handle,
                                                                   jint width, jint height) {
    if (Engine* e = toEngine(handle)) e->onSurfaceChanged(width, height);
}

JNIEXPORT void JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeDraw(JNIEnv* env, jobject, jlong handle,
                                                       jint oesTextureId, jfloatArray texMatrix) {
    Engine* e = toEngine(handle);
    if (e == nullptr || texMatrix == nullptr) return;
    jfloat m[16];
    env->GetFloatArrayRegion(texMatrix, 0, 16, m);
    e->draw(oesTextureId, m);
}

JNIEXPORT void JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeSetParam(JNIEnv*, jobject, jlong handle,
                                                           jint param, jfloat value) {
    if (Engine* e = toEngine(handle)) e->setParam(param, value);
}

JNIEXPORT void JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeSetPresetLut(JNIEnv* env, jobject, jlong handle,
                                                               jstring name) {
    if (Engine* e = toEngine(handle)) e->setPresetLut(toStdString(env, name));
}

JNIEXPORT jboolean JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeLoadCubeLut(JNIEnv* env, jobject, jlong handle,
                                                              jstring contents) {
    Engine* e = toEngine(handle);
    if (e == nullptr) return JNI_FALSE;
    return e->loadCubeLut(toStdString(env, contents)) ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT void JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeSetAutoEnabled(JNIEnv*, jobject, jlong handle,
                                                                 jboolean enabled) {
    if (Engine* e = toEngine(handle)) e->setAutoEnabled(enabled == JNI_TRUE);
}

JNIEXPORT void JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeSetFaceState(
    JNIEnv*, jobject, jlong handle, jboolean detected, jfloat eyeLx, jfloat eyeLy, jfloat eyeRx,
    jfloat eyeRy, jfloat upX, jfloat upY, jfloat centerX, jfloat centerY, jfloat radius) {
    if (Engine* e = toEngine(handle)) {
        e->setFaceState(detected == JNI_TRUE, eyeLx, eyeLy, eyeRx, eyeRy, upX, upY, centerX,
                        centerY, radius);
    }
}

JNIEXPORT void JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeSetSticker(JNIEnv* env, jobject, jlong handle,
                                                             jbyteArray rgba, jint width,
                                                             jint height, jfloat offsetEyeDists,
                                                             jfloat spanEyeDists) {
    Engine* e = toEngine(handle);
    if (e == nullptr || rgba == nullptr) return;
    jsize len = env->GetArrayLength(rgba);
    if (len < width * height * 4) return;
    jbyte* data = env->GetByteArrayElements(rgba, nullptr);
    if (data == nullptr) return;
    e->setSticker(reinterpret_cast<const uint8_t*>(data), width, height, offsetEyeDists,
                  spanEyeDists);
    env->ReleaseByteArrayElements(rgba, data, JNI_ABORT);
}

JNIEXPORT void JNICALL
Java_com_wavelens_sdk_internal_NativeBridge_nativeClearSticker(JNIEnv*, jobject, jlong handle) {
    if (Engine* e = toEngine(handle)) e->clearSticker();
}

}  // extern "C"
