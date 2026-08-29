package com.wavelens.sdk

import android.content.Context
import android.graphics.Color
import android.graphics.SurfaceTexture
import android.graphics.drawable.GradientDrawable
import android.opengl.GLES11Ext
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.util.TypedValue
import android.view.Gravity
import android.view.Surface
import android.widget.FrameLayout
import android.widget.TextView
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.core.UseCase
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.wavelens.sdk.internal.FaceTracker
import com.wavelens.sdk.internal.NativeBridge
import com.wavelens.sdk.internal.StickerFactory
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
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

    // Face tracking (only running while a face preset is active)
    private var faceTrackingEnabled = false
    private var faceTracker: FaceTracker? = null
    private var analysisExecutor: ExecutorService? = null
    private var faceVisible = false
    private var faceLostAtMs = 0L
    private var hintLastShownAtMs = 0L
    private val faceHintView = TextView(context)
    private val hideHintRunnable = Runnable { faceHintView.visibility = GONE }

    // Built-in status banner: "account deactivated" / "filters updated" messages
    // pushed by the license service — shown to the host without any app code.
    private val statusBanner = TextView(context)
    private val hideBannerRunnable = Runnable { statusBanner.visibility = GONE }
    private val statusListener: (Boolean, String) -> Unit = { active, message ->
        statusBanner.text = message
        statusBanner.visibility = VISIBLE
        mainHandler.removeCallbacks(hideBannerRunnable)
        // Deactivation stays on screen; informational messages hide after 5 s.
        if (active) mainHandler.postDelayed(hideBannerRunnable, STATUS_BANNER_DURATION_MS)
    }

    /**
     * Hint shown for [FACE_HINT_DURATION_MS] when a face effect is selected and no
     * face is in front of the camera (re-shown briefly if the face stays lost).
     */
    var faceHintText: CharSequence = "Find A face"
        set(value) {
            field = value
            faceHintView.text = value
        }

    init {
        glView.setEGLContextClientVersion(3)
        glView.preserveEGLContextOnPause = true
        glView.setRenderer(EngineRenderer())
        glView.renderMode = GLSurfaceView.RENDERMODE_WHEN_DIRTY
        addView(glView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

        faceHintView.apply {
            text = faceHintText
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
            val pad = (16 * resources.displayMetrics.density).toInt()
            setPadding(pad, pad / 2, pad, pad / 2)
            background = GradientDrawable().apply {
                setColor(0x99000000.toInt())
                cornerRadius = 24 * resources.displayMetrics.density
            }
            visibility = GONE
        }
        addView(
            faceHintView,
            LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply {
                gravity = Gravity.CENTER
            },
        )

        statusBanner.apply {
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            val pad = (14 * resources.displayMetrics.density).toInt()
            setPadding(pad, pad / 2, pad, pad / 2)
            background = GradientDrawable().apply {
                setColor(0xCC1A1A2E.toInt())
                cornerRadius = 20 * resources.displayMetrics.density
            }
            visibility = GONE
        }
        addView(
            statusBanner,
            LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT).apply {
                gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
                topMargin = (24 * resources.displayMetrics.density).toInt()
            },
        )
        WaveLens.addStatusListener(statusListener)
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

    /**
     * Apply a one-tap look. Resets all params to the preset's values and switches the
     * engine's auto mode to the preset's [FilterPreset.autoMode] (e.g. the "auto" and
     * "enhance" presets analyze the live camera and adapt exposure/contrast/WB).
     *
     * Face presets (category "face") additionally start ML Kit face tracking: the
     * sticker/deform renders only while a face is detected and follows it in real
     * time; a "[faceHintText]" hint shows when no face is in front of the camera.
     */
    fun applyPreset(preset: FilterPreset) {
        val handle = engineHandle
        if (handle == 0L) return

        val needsFace = preset.category == "face" ||
            preset.faceSticker != null ||
            (preset.params[FilterParam.FACE_DEFORM] ?: 0f) > 0f
        val sticker = preset.faceSticker?.let { StickerFactory.create(it) }

        glView.queueEvent {
            for (param in FilterParam.values()) {
                NativeBridge.nativeSetParam(handle, param.id, preset.params[param] ?: 0f)
            }
            NativeBridge.nativeSetPresetLut(handle, preset.lut ?: "")
            NativeBridge.nativeSetAutoEnabled(handle, preset.autoMode)
            if (sticker != null) {
                NativeBridge.nativeSetSticker(
                    handle, sticker.rgba, sticker.width, sticker.height,
                    sticker.offsetEyeDists, sticker.spanEyeDists,
                )
            } else {
                NativeBridge.nativeClearSticker(handle)
            }
        }
        setFaceTrackingEnabled(needsFace)
        glView.requestRender()
    }

    /** Starts/stops the ML Kit analysis stream. No cost at all while disabled. */
    private fun setFaceTrackingEnabled(enabled: Boolean) {
        if (faceTrackingEnabled == enabled) return
        faceTrackingEnabled = enabled
        if (enabled) {
            if (faceTracker == null) {
                faceTracker = FaceTracker { result -> onFaceResult(result) }
                analysisExecutor = Executors.newSingleThreadExecutor()
            }
            faceVisible = false
            faceLostAtMs = System.currentTimeMillis()
            showHintBriefly()
        } else {
            faceVisible = false
            mainHandler.removeCallbacks(hideHintRunnable)
            faceHintView.visibility = GONE
            val handle = engineHandle
            if (handle != 0L) {
                glView.queueEvent {
                    NativeBridge.nativeSetFaceState(handle, false, 0f, 0f, 0f, 0f, 0f, 1f, 0f, 0f, 0f)
                }
            }
        }
        bindCameraIfReady()
    }

    /** ML Kit callback (main thread): forward geometry to the engine + toggle hint. */
    private fun onFaceResult(result: FaceTracker.FaceResult?) {
        if (!faceTrackingEnabled) return
        val handle = engineHandle
        if (handle == 0L) return

        val detected = result != null
        val now = System.currentTimeMillis()
        if (detected != faceVisible) {
            faceVisible = detected
            if (detected) {
                mainHandler.removeCallbacks(hideHintRunnable)
                faceHintView.visibility = GONE
            } else {
                faceLostAtMs = now
            }
        }
        // Face has been gone for a while → remind briefly again ("Find A face"),
        // at most once every FACE_HINT_REPEAT_MS so it never nags.
        if (!detected &&
            now - faceLostAtMs > FACE_HINT_LOST_TRIGGER_MS &&
            now - hintLastShownAtMs > FACE_HINT_REPEAT_MS
        ) {
            showHintBriefly()
        }
        glView.queueEvent {
            if (result != null) {
                NativeBridge.nativeSetFaceState(
                    handle, true,
                    result.eyeLx, result.eyeLy, result.eyeRx, result.eyeRy,
                    result.upX, result.upY, result.centerX, result.centerY, result.radius,
                )
            } else {
                NativeBridge.nativeSetFaceState(handle, false, 0f, 0f, 0f, 0f, 0f, 1f, 0f, 0f, 0f)
            }
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

    /** Shows the face hint for 2 seconds, then hides it automatically. */
    private fun showHintBriefly() {
        hintLastShownAtMs = System.currentTimeMillis()
        faceHintView.visibility = VISIBLE
        mainHandler.removeCallbacks(hideHintRunnable)
        mainHandler.postDelayed(hideHintRunnable, FACE_HINT_DURATION_MS)
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

        val useCases = mutableListOf<UseCase>(preview)
        val tracker = faceTracker
        val executor = analysisExecutor
        if (faceTrackingEnabled && tracker != null && executor != null) {
            tracker.mirrored = lensFacing == CameraSelector.LENS_FACING_FRONT
            val analysis: ImageAnalysis = FaceTracker.buildAnalysis()
            analysis.setAnalyzer(executor, tracker.analyzer)
            useCases.add(analysis)
        }

        val selector = CameraSelector.Builder().requireLensFacing(lensFacing).build()
        try {
            provider.unbindAll()
            provider.bindToLifecycle(owner, selector, *useCases.toTypedArray())
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
            runCatching { provider.bindToLifecycle(owner, fallback, *useCases.toTypedArray()) }
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        WaveLens.removeStatusListener(statusListener)
        mainHandler.removeCallbacks(hideBannerRunnable)
        mainHandler.removeCallbacks(hideHintRunnable)
        cameraProvider?.unbindAll()
        faceTracker?.close()
        faceTracker = null
        analysisExecutor?.shutdown()
        analysisExecutor = null
        surfaceTexture?.release()
        surfaceTexture = null
        val handle = engineHandle
        engineHandle = 0L
        if (handle != 0L) NativeBridge.nativeDestroy(handle)
    }

    private companion object {
        const val FACE_HINT_DURATION_MS = 2_000L
        const val FACE_HINT_LOST_TRIGGER_MS = 4_000L
        const val FACE_HINT_REPEAT_MS = 8_000L
        const val STATUS_BANNER_DURATION_MS = 5_000L
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
