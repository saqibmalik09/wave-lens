package com.wavelens.sdk

/**
 * Continuous adjustment parameters. Ids must stay in sync with the Param enum in engine.h.
 * All values are centered on 0 (no effect); typical range -1..1 unless noted.
 */
enum class FilterParam(val id: Int) {
    BRIGHTNESS(0),
    CONTRAST(1),
    SATURATION(2),

    /** Positive = warmer, negative = cooler. */
    TEMPERATURE(3),
    TINT(4),

    /** 0..1 — edge darkening. */
    VIGNETTE(5),

    /** 0..1 — bloom/glow strength (enables the multi-pass glow pipeline when > 0). */
    GLOW(6),

    /** 0..1 — how strongly the current LUT look is applied. */
    LUT_INTENSITY(7),

    /** 0..1 — edge-preserving skin smoothing (beauty). Keeps eyes/lips/hair crisp. */
    SMOOTHING(8),

    /** 0..1 — unsharp-mask detail boost. Rescues soft/low-quality cameras. */
    SHARPEN(9),

    /** 0..1 — slight face bulge (funny). Only visible while a face is tracked. */
    FACE_DEFORM(10),
}
