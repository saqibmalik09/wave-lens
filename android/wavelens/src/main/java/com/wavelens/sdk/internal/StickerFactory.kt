package com.wavelens.sdk.internal

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import java.nio.ByteBuffer

/**
 * Procedurally draws face stickers on a Canvas at runtime — no bundled image assets,
 * crisp at any size, ~50 KB of RAM per sticker.
 *
 * Geometry contract with the shader: the sticker texture is a square whose width maps
 * to `span` eye-distances centered on the eye midpoint (shifted `offset` eye-distances
 * toward the forehead). Eye centers therefore land at x = 0.5 ± 0.5/span (in UV).
 */
internal object StickerFactory {

    const val SIZE = 512

    data class Sticker(
        val rgba: ByteArray,
        val width: Int,
        val height: Int,
        /** Shift along the face "up" direction, in eye-distance units. */
        val offsetEyeDists: Float,
        /** Sticker width in eye-distance units. */
        val spanEyeDists: Float,
    )

    /** Sticker ids this SDK build can render (server may list newer ones). */
    fun isKnown(id: String): Boolean = id in setOf("sunglasses", "heart_glasses", "cat_ears")

    /** Returns null for unknown ids (e.g. catalog entries newer than this SDK). */
    fun create(id: String): Sticker? = when (id) {
        "sunglasses" -> render(span = 2.3f, offset = 0f) { drawSunglasses(it) }
        "heart_glasses" -> render(span = 2.4f, offset = 0f) { drawHeartGlasses(it) }
        "cat_ears" -> render(span = 2.8f, offset = 1.55f) { drawCatEars(it) }
        else -> null
    }

    private inline fun render(span: Float, offset: Float, draw: (Canvas) -> Unit): Sticker {
        val bmp = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
        draw(Canvas(bmp))
        val buf = ByteBuffer.allocate(SIZE * SIZE * 4)
        bmp.copyPixelsToBuffer(buf) // ARGB_8888 copies out as RGBA byte order
        bmp.recycle()
        return Sticker(buf.array(), SIZE, SIZE, offset, span)
    }

    // Eye anchor x-positions in UV for a given span (see contract above).
    private fun eyeX(span: Float, right: Boolean): Float =
        SIZE * (0.5f + (if (right) 1 else -1) * 0.5f / span)

    // ---- Chasma: aesthetic dark sunglasses --------------------------------------

    private fun drawSunglasses(c: Canvas) {
        val span = 2.3f
        val cy = SIZE * 0.5f
        val lensW = SIZE * 0.36f
        val lensH = SIZE * 0.30f
        val leftCx = eyeX(span, right = false)
        val rightCx = eyeX(span, right = true)

        val lensPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f, cy - lensH / 2f, 0f, cy + lensH / 2f,
                Color.argb(235, 20, 20, 28), Color.argb(200, 45, 45, 70),
                Shader.TileMode.CLAMP,
            )
        }
        val framePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = SIZE * 0.022f
            color = Color.argb(255, 15, 15, 18)
        }
        val shinePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(70, 255, 255, 255)
        }

        for (cx in floatArrayOf(leftCx, rightCx)) {
            val r = RectF(cx - lensW / 2f, cy - lensH / 2f, cx + lensW / 2f, cy + lensH / 2f)
            val corner = SIZE * 0.10f
            c.drawRoundRect(r, corner, corner, lensPaint)
            c.drawRoundRect(r, corner, corner, framePaint)
            // diagonal light streak
            c.save()
            c.clipRect(r)
            c.rotate(-20f, cx, cy)
            c.drawRect(cx - lensW * 0.32f, r.top, cx - lensW * 0.18f, r.bottom, shinePaint)
            c.drawRect(cx - lensW * 0.10f, r.top, cx - lensW * 0.04f, r.bottom, shinePaint)
            c.restore()
        }

        val barPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(255, 15, 15, 18) }
        // bridge between lenses
        c.drawRect(leftCx + lensW / 2f - 2f, cy - lensH * 0.18f,
            rightCx - lensW / 2f + 2f, cy - lensH * 0.02f, barPaint)
        // temple arms toward the edges
        c.drawRect(0f, cy - lensH * 0.16f, leftCx - lensW / 2f + 2f, cy - lensH * 0.02f, barPaint)
        c.drawRect(rightCx + lensW / 2f - 2f, cy - lensH * 0.16f, SIZE.toFloat(),
            cy - lensH * 0.02f, barPaint)
    }

    // ---- Heart glasses -----------------------------------------------------------

    private fun drawHeartGlasses(c: Canvas) {
        val span = 2.4f
        val cy = SIZE * 0.5f
        val s = SIZE * 0.21f // heart "radius"
        val leftCx = eyeX(span, right = false)
        val rightCx = eyeX(span, right = true)

        val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f, cy - s, 0f, cy + s,
                Color.argb(230, 255, 64, 129), Color.argb(210, 233, 30, 99),
                Shader.TileMode.CLAMP,
            )
        }
        val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = SIZE * 0.018f
            color = Color.argb(255, 173, 20, 87)
        }
        val shine = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.argb(90, 255, 255, 255)
        }

        for (cx in floatArrayOf(leftCx, rightCx)) {
            val path = heartPath(cx, cy, s)
            c.drawPath(path, fill)
            c.drawPath(path, stroke)
            c.drawCircle(cx - s * 0.38f, cy - s * 0.30f, s * 0.16f, shine)
        }

        val barPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(255, 173, 20, 87) }
        c.drawRect(leftCx + s * 0.85f, cy - s * 0.22f, rightCx - s * 0.85f, cy - s * 0.06f, barPaint)
        c.drawRect(0f, cy - s * 0.22f, leftCx - s * 0.85f, cy - s * 0.06f, barPaint)
        c.drawRect(rightCx + s * 0.85f, cy - s * 0.22f, SIZE.toFloat(), cy - s * 0.06f, barPaint)
    }

    private fun heartPath(cx: Float, cy: Float, s: Float): Path = Path().apply {
        moveTo(cx, cy + s)
        cubicTo(cx - s * 1.5f, cy + s * 0.1f, cx - s * 1.1f, cy - s * 1.05f, cx, cy - s * 0.35f)
        cubicTo(cx + s * 1.1f, cy - s * 1.05f, cx + s * 1.5f, cy + s * 0.1f, cx, cy + s)
        close()
    }

    // ---- Cat ears (anchored above the head) ---------------------------------------

    private fun drawCatEars(c: Canvas) {
        val baseY = SIZE * 0.82f
        val earW = SIZE * 0.30f
        val earH = SIZE * 0.52f
        val fur = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(245, 55, 45, 45) }
        val inner = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.argb(235, 244, 143, 177) }

        for (cx in floatArrayOf(SIZE * 0.26f, SIZE * 0.74f)) {
            val outer = Path().apply {
                moveTo(cx - earW / 2f, baseY)
                lineTo(cx, baseY - earH)
                lineTo(cx + earW / 2f, baseY)
                close()
            }
            c.drawPath(outer, fur)
            val innerPath = Path().apply {
                moveTo(cx - earW * 0.26f, baseY - earH * 0.06f)
                lineTo(cx, baseY - earH * 0.72f)
                lineTo(cx + earW * 0.26f, baseY - earH * 0.06f)
                close()
            }
            c.drawPath(innerPath, inner)
        }
    }
}
