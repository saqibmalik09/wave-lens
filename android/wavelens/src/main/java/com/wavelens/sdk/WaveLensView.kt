package com.wavelens.sdk

import android.content.Context
import android.graphics.SurfaceTexture
import android.opengl.GLES11Ext
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.view.Surface
import android.widget.FrameLayout
import androidx.camera.core.CameraSelector
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.wavelens.sdk.internal.NativeBridge
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

/**
 * Live filtered camera preview. Drop into any layout, then:
 *
 * ```
 * waveLensView.startCamera(lifecycleOwner)          // after CAMERA permission is granted
 * waveLensView.applyPreset(FilterPreset.VINTAGE)
 * waveLensView.setParam(FilterParam.BRIGHTNESS, 0.2f)
 * waveLensView.setAutoEnabled(true)
 * ```
 *
 * Rendering runs entirely on the GPU via the native engine; frames are drawn on demand
 * (RENDERMODE_WHEN_DIRTY), so idle cost is zero.
 */
class WaveLensView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
) : FrameLayout(context, attrs) {

    private val glView = GLSurfaceView(context)
    private val mainHandler = Handler(Looper.getMainLooper())

    @Volatile
    private var engineHandle: Long = NativeBridge.nativeCreate()

    @Volatile
    private var surfaceTexture: SurfaceTexture? = null

    private var lifecycleOwner: LifecycleOwner? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private var lensFacing: Int = CameraSelector.LENS_FACING_FRONT
    private var cameraRequested = false

    init {
        glView.setEGLContextClientVersion(3)
        glView.preserveEGLContextOnPause = true
        glView.setRenderer(EngineRenderer())
        glView.renderMode = GLSurfaceView.RENDERMODE_WHEN_DIRTY
        addView(glView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }

    /** Call once CAMERA permission is granted. Front camera by default. */
    fun startCamera(owner: LifecycleOwner, facing: Int = CameraSelector.LENS_FACING_FRONT) {
        lifecycleOwner = owner
        lensFacing = facing
        cameraRequested = true
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            cameraProvider = future.get()
            bindCameraIfReady()
        }, ContextCompat.getMainExecutor(context))
    }

    fun switchCamera() {
        lensFacing = if (lensFacing == CameraSelector.LENS_FACING_FRONT) {
            CameraSelector.LENS_FACING_BACK
        } else {
            CameraSelector.LENS_FACING_FRONT
        }
        bindCameraIfReady()
    }

    /** Set one continuous adjustment (see [FilterParam] for ranges). */
    fun setParam(param: FilterParam, value: Float) {
        val handle = engineHandle
        if (handle == 0L) return
        glView.queueEvent { NativeBridge.nativeSetParam(handle, param.id, value) }
        glView.requestRender()
    }

    /** Apply a one-tap look. Resets all params to the preset's values. */
    fun applyPreset(preset: FilterPreset) {
        val handle = engineHandle
        if (handle == 0L) return
        glView.queueEvent {
            for (param in FilterParam.values()) {
                NativeBridge.nativeSetParam(handle, param.id, preset.params[param] ?: 0f)
            }
            NativeBridge.nativeSetPresetLut(handle, preset.lut ?: "")
        }
        glView.requestRender()
    }

    /** Auto exposure / contrast / white balance, computed from the live frame. */
    fun setAutoEnabled(enabled: Boolean) {
        val handle = engineHandle
        if (handle == 0L) return
        glView.queueEvent { NativeBridge.nativeSetAutoEnabled(handle, enabled) }
        glView.requestRender()
    }

    /** Load a custom .cube LUT (e.g. downloaded from the Wave Lens CDN). */
    fun loadCubeLut(cubeFileContents: String) {
        val handle = engineHandle
        if (handle == 0L) return
        glView.queueEvent { NativeBridge.nativeLoadCubeLut(handle, cubeFileContents) }
        glView.requestRender()
    }

    /** Forward from Activity/Fragment onResume. */
    fun onResume() = glView.onResume()

    /** Forward from Activity/Fragment onPause. */
    fun onPause() = glView.onPause()

    private fun bindCameraIfReady() {
        val provider = cameraProvider ?: return
        val owner = lifecycleOwner ?: return
        if (!cameraRequested || surfaceTexture == null) return

        val preview = Preview.Builder().build()
        preview.setSurfaceProvider { request ->
            val st = surfaceTexture
            if (st == null) {
                request.willNotProvideSurface()
                return@setSurfaceProvider
            }
            st.setDefaultBufferSize(request.resolution.width, request.resolution.height)
            val surface = Surface(st)
            request.provideSurface(surface, ContextCompat.getMainExecutor(context)) {
                surface.release()
            }
        }

        val selector = CameraSelector.Builder().requireLensFacing(lensFacing).build()
        try {
            provider.unbindAll()
            provider.bindToLifecycle(owner, selector, preview)
        } catch (_: Exception) {
            // Requested lens not available on this device; try the other one once.
            val fallback = CameraSelector.Builder()
                .requireLensFacing(
                    if (lensFacing == CameraSelector.LENS_FACING_FRONT) {
                        CameraSelector.LENS_FACING_BACK
                    } else {
                        CameraSelector.LENS_FACING_FRONT
                    }
                )
                .build()
            runCatching { provider.bindToLifecycle(owner, fallback, preview) }
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        cameraProvider?.unbindAll()
        surfaceTexture?.release()
        surfaceTexture = null
        val handle = engineHandle
        engineHandle = 0L
        if (handle != 0L) NativeBridge.nativeDestroy(handle)
    }

    private inner class EngineRenderer : GLSurfaceView.Renderer {
        private val texMatrix = FloatArray(16)
        private var oesTextureId = 0

        override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
            val handle = engineHandle
            if (handle == 0L) return
            NativeBridge.nativeOnSurfaceCreated(handle)

            oesTextureId = createOesTexture()
            surfaceTexture?.release()
            val st = SurfaceTexture(oesTextureId)
            st.setOnFrameAvailableListener { glView.requestRender() }
            surfaceTexture = st

            // Camera must (re)bind to the new SurfaceTexture on the main thread.
            mainHandler.post { bindCameraIfReady() }
        }

        override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
            val handle = engineHandle
            if (handle != 0L) NativeBridge.nativeOnSurfaceChanged(handle, width, height)
        }

        override fun onDrawFrame(gl: GL10?) {
            val handle = engineHandle
            val st = surfaceTexture ?: return
            if (handle == 0L) return
            st.updateTexImage()
            st.getTransformMatrix(texMatrix)
            NativeBridge.nativeDraw(handle, oesTextureId, texMatrix)
        }

        private fun createOesTexture(): Int {
            val textures = IntArray(1)
            GLES20.glGenTextures(1, textures, 0)
            GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, textures[0])
            GLES20.glTexParameteri(
                GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
                GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR,
            )
            GLES20.glTexParameteri(
                GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
                GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR,
            )
            GLES20.glTexParameteri(
                GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
                GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE,
            )
            GLES20.glTexParameteri(
                GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
                GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE,
            )
            return textures[0]
        }
    }
}
