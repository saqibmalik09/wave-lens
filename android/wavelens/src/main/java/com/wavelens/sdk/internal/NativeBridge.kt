package com.wavelens.sdk.internal

/**
 * JNI surface to the C++ engine (libwavelens.so).
 * All render-affecting calls must run on the GL thread — [com.wavelens.sdk.WaveLensView]
 * queues them there.
 */
internal object NativeBridge {

    init {
        System.loadLibrary("wavelens")
    }

    external fun nativeCreate(): Long
    external fun nativeDestroy(handle: Long)
    external fun nativeOnSurfaceCreated(handle: Long)
    external fun nativeOnSurfaceChanged(handle: Long, width: Int, height: Int)
    external fun nativeDraw(handle: Long, oesTextureId: Int, texMatrix: FloatArray)
    external fun nativeSetParam(handle: Long, param: Int, value: Float)
    external fun nativeSetPresetLut(handle: Long, name: String)
    external fun nativeLoadCubeLut(handle: Long, contents: String): Boolean
    external fun nativeSetAutoEnabled(handle: Long, enabled: Boolean)
}
