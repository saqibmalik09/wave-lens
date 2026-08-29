package com.wavelens.sdk.internal

import android.annotation.SuppressLint
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.face.FaceLandmark
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.hypot
import kotlin.math.max

/**
 * Runtime face tracking via ML Kit (on-device, FAST mode). Feeds normalized face
 * geometry to the render engine.
 *
 * Load control:
 * - KEEP_ONLY_LATEST backpressure + a busy flag: at most one frame in flight, frames
 *   arriving while the detector works are dropped (never queued).
 * - Analysis runs at low resolution (480p class) — FAST mode takes ~5–15 ms on
 *   mid-range devices, on its own executor, never touching the GL thread.
 *
 * Output coords are screen-normalized: x right, y up, 0..1 (front camera mirrored to
 * match the on-screen preview).
 */
internal class FaceTracker(
    private val onFace: (FaceResult?) -> Unit,
) {

    /** All fields in screen-normalized space (y up). */
    data class FaceResult(
        val eyeLx: Float, val eyeLy: Float,
        val eyeRx: Float, val eyeRy: Float,
        val upX: Float, val upY: Float,
        val centerX: Float, val centerY: Float,
        val radius: Float,
    )

    var mirrored: Boolean = true // front camera

    private val detector = FaceDetection.getClient(
        FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
            .setContourMode(FaceDetectorOptions.CONTOUR_MODE_NONE)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
            .setMinFaceSize(0.15f)
            .build(),
    )

    private val busy = AtomicBoolean(false)
    private var lastFaceAtMs = 0L

    val analyzer = ImageAnalysis.Analyzer { proxy -> analyze(proxy) }

    @SuppressLint("UnsafeOptInUsageError")
    private fun analyze(proxy: ImageProxy) {
        if (!busy.compareAndSet(false, true)) {
            proxy.close()
            return
        }
        val media = proxy.image
        if (media == null) {
            busy.set(false)
            proxy.close()
            return
        }
        val rotation = proxy.imageInfo.rotationDegrees
        // Dimensions of the upright (rotated) image ML Kit reports coordinates in.
        val w = if (rotation == 90 || rotation == 270) proxy.height else proxy.width
        val h = if (rotation == 90 || rotation == 270) proxy.width else proxy.height

        detector.process(InputImage.fromMediaImage(media, rotation))
            .addOnSuccessListener { faces -> emit(pickBiggest(faces), w, h) }
            .addOnFailureListener { emit(null, w, h) }
            .addOnCompleteListener {
                proxy.close()
                busy.set(false)
            }
    }

    private fun pickBiggest(faces: List<Face>): Face? =
        faces.maxByOrNull { it.boundingBox.width() * it.boundingBox.height() }

    private fun emit(face: Face?, w: Int, h: Int) {
        if (face == null) {
            // Debounce loss: single missed detections (blink of the tracker) are ignored
            // for 350 ms so the effect doesn't flicker.
            if (System.currentTimeMillis() - lastFaceAtMs > 350) onFace(null)
            return
        }
        lastFaceAtMs = System.currentTimeMillis()

        val box = face.boundingBox
        // ML Kit "LEFT_EYE" is the subject's left, which appears on the image's right.
        val eyeA = face.getLandmark(FaceLandmark.RIGHT_EYE)?.position
        val eyeB = face.getLandmark(FaceLandmark.LEFT_EYE)?.position
        val nose = face.getLandmark(FaceLandmark.NOSE_BASE)?.position

        val exA = eyeA?.x ?: (box.left + box.width() * 0.30f)
        val eyA = eyeA?.y ?: (box.top + box.height() * 0.40f)
        val exB = eyeB?.x ?: (box.left + box.width() * 0.70f)
        val eyB = eyeB?.y ?: (box.top + box.height() * 0.40f)
        val nx = nose?.x ?: ((exA + exB) / 2f)
        val ny = nose?.y ?: (box.top + box.height() * 0.62f)

        // image space (y down) -> screen space (y up); mirror x for the front camera
        fun sx(x: Float): Float {
            val v = x / w
            return if (mirrored) 1f - v else v
        }
        fun sy(y: Float): Float = 1f - y / h

        val aX = sx(exA); val aY = sy(eyA)
        val bX = sx(exB); val bY = sy(eyB)
        // Keep a consistent left/right order in screen space.
        val leftFirst = aX <= bX
        val lx = if (leftFirst) aX else bX
        val ly = if (leftFirst) aY else bY
        val rx = if (leftFirst) bX else aX
        val ry = if (leftFirst) bY else aY

        val midX = (lx + rx) / 2f
        val midY = (ly + ry) / 2f
        var upX = midX - sx(nx)
        var upY = midY - sy(ny)
        val upLen = max(hypot(upX.toDouble(), upY.toDouble()).toFloat(), 1e-4f)
        upX /= upLen
        upY /= upLen

        val radius = max(box.width() / w.toFloat(), box.height() / h.toFloat()) * 0.62f

        onFace(
            FaceResult(
                lx, ly, rx, ry, upX, upY,
                sx(box.exactCenterX()), sy(box.exactCenterY()),
                radius,
            ),
        )
    }

    fun close() {
        detector.close()
    }

    companion object {
        fun buildAnalysis(): ImageAnalysis =
            ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
    }
}
