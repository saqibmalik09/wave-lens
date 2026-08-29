package com.wavelens.sdk

/**
 * A one-tap look: a LUT name (generated inside the engine) plus parameter values.
 * Applying a preset resets all params to the preset's values.
 *
 * [id] matches the filter id used by the license service catalog, so the tray can be
 * filtered by [WaveLens.enabledFilters].
 *
 * [category] groups presets for the tray UI: "auto", "beauty", "effects", "enhance", "face".
 * [autoMode] enables the engine's live auto exposure/contrast/white-balance analysis
 * on top of the preset's params.
 * [faceSticker] names a built-in 2D sticker (see StickerFactory) anchored to the tracked
 * face. Presets in the "face" category start runtime face tracking automatically; their
 * effects render only while a face is detected.
 */
data class FilterPreset(
    val id: String,
    val displayName: String,
    val category: String = "effects",
    val lut: String? = null,
    val params: Map<FilterParam, Float> = emptyMap(),
    val autoMode: Boolean = false,
    val faceSticker: String? = null,
) {
    companion object {
        // ---- Auto ----------------------------------------------------------------
        /** Live auto exposure / contrast / white balance — adapts to camera & lighting. */
        val AUTO = FilterPreset(
            "auto", "Auto", category = "auto", autoMode = true,
            params = mapOf(FilterParam.SHARPEN to 0.30f),
        )

        // ---- Beauty --------------------------------------------------------------
        val BEAUTY_SMOOTH = FilterPreset(
            "beauty_smooth", "Smooth", category = "beauty",
            params = mapOf(
                FilterParam.SMOOTHING to 0.85f,
                FilterParam.BRIGHTNESS to 0.08f,
                FilterParam.SATURATION to 0.10f,
            ),
        )
        val BEAUTY_NATURAL = FilterPreset(
            "beauty_natural", "Natural", category = "beauty", autoMode = true,
            params = mapOf(
                FilterParam.SMOOTHING to 0.55f,
                FilterParam.SATURATION to 0.13f,
                FilterParam.SHARPEN to 0.20f,
            ),
        )
        val BEAUTY_FAIR = FilterPreset(
            "beauty_fair", "Fair", category = "beauty",
            params = mapOf(
                FilterParam.SMOOTHING to 0.75f,
                FilterParam.BRIGHTNESS to 0.18f,
                FilterParam.TEMPERATURE to -0.10f,
                FilterParam.CONTRAST to -0.06f,
            ),
        )
        val BEAUTY_ROSY = FilterPreset(
            "beauty_rosy", "Rosy", category = "beauty",
            params = mapOf(
                FilterParam.SMOOTHING to 0.70f,
                FilterParam.BRIGHTNESS to 0.09f,
                FilterParam.TEMPERATURE to 0.20f,
                FilterParam.TINT to -0.28f,
                FilterParam.SATURATION to 0.16f,
            ),
        )
        val BEAUTY_GLAM = FilterPreset(
            "beauty_glam", "Glam", category = "beauty",
            params = mapOf(
                FilterParam.SMOOTHING to 0.80f,
                FilterParam.GLOW to 0.55f,
                FilterParam.BRIGHTNESS to 0.08f,
                FilterParam.SATURATION to 0.20f,
                FilterParam.VIGNETTE to 0.30f,
            ),
        )

        // ---- Enhance (video quality rescue) ---------------------------------------
        /** For weak/soft cameras: auto light + strong sharpen + color pop. */
        val HD_BOOST = FilterPreset(
            "enhance", "HD Boost", category = "enhance", autoMode = true,
            params = mapOf(
                FilterParam.SHARPEN to 0.80f,
                FilterParam.CONTRAST to 0.15f,
                FilterParam.SATURATION to 0.23f,
                FilterParam.SMOOTHING to 0.12f,
            ),
        )

        // ---- Face (AR — runtime face tracking, effects appear only on a detected face)
        /** Aesthetic dark sunglasses anchored to the eyes ("chasma"). */
        val SUNGLASSES = FilterPreset(
            "sunglasses", "Chasma", category = "face", faceSticker = "sunglasses",
        )
        val HEART_GLASSES = FilterPreset(
            "heart_glasses", "Hearts", category = "face", faceSticker = "heart_glasses",
        )
        val CAT_EARS = FilterPreset(
            "cat_ears", "Cat Ears", category = "face", faceSticker = "cat_ears",
        )
        /** Slight face bulge — subtle funny deform, tracks the face live. */
        val FUNNY_FACE = FilterPreset(
            "face_warp", "Funny Face", category = "face",
            params = mapOf(FilterParam.FACE_DEFORM to 0.6f),
        )

        // ---- Effects ---------------------------------------------------------------
        val ORIGINAL = FilterPreset("original", "Original", category = "effects")
        val BW = FilterPreset(
            "bw", "B&W", category = "effects", lut = "bw",
            params = mapOf(FilterParam.LUT_INTENSITY to 1f, FilterParam.CONTRAST to 0.13f),
        )
        val VINTAGE = FilterPreset(
            "vintage", "Vintage", category = "effects", lut = "vintage",
            params = mapOf(FilterParam.LUT_INTENSITY to 1f, FilterParam.VIGNETTE to 0.6f),
        )
        val SEPIA = FilterPreset(
            "sepia", "Sepia", category = "effects", lut = "sepia",
            params = mapOf(FilterParam.LUT_INTENSITY to 1f, FilterParam.VIGNETTE to 0.26f),
        )
        val WARM = FilterPreset(
            "warm", "Warm", category = "effects",
            params = mapOf(
                FilterParam.TEMPERATURE to 0.70f,
                FilterParam.SATURATION to 0.20f,
                FilterParam.BRIGHTNESS to 0.05f,
            ),
        )
        val COOL = FilterPreset(
            "cool", "Cool", category = "effects",
            params = mapOf(
                FilterParam.TEMPERATURE to -0.70f,
                FilterParam.SATURATION to 0.13f,
            ),
        )
        val GLOW = FilterPreset(
            "glow", "Glow", category = "effects",
            params = mapOf(
                FilterParam.GLOW to 1.0f,
                FilterParam.BRIGHTNESS to 0.10f,
                FilterParam.SATURATION to 0.13f,
            ),
        )
        val FILM_WARM = FilterPreset(
            "film_warm", "Film Warm", category = "effects", lut = "film_warm",
            params = mapOf(FilterParam.LUT_INTENSITY to 1f),
        )
        val FILM_COOL = FilterPreset(
            "film_cool", "Film Cool", category = "effects", lut = "film_cool",
            params = mapOf(FilterParam.LUT_INTENSITY to 1f),
        )

        /** All built-in presets, in tray order: Auto → Beauty → Enhance → Face → Effects. */
        val ALL: List<FilterPreset> = listOf(
            AUTO,
            BEAUTY_SMOOTH, BEAUTY_NATURAL, BEAUTY_FAIR, BEAUTY_ROSY, BEAUTY_GLAM,
            HD_BOOST,
            SUNGLASSES, HEART_GLASSES, CAT_EARS, FUNNY_FACE,
            ORIGINAL, BW, VINTAGE, SEPIA, WARM, COOL, GLOW, FILM_WARM, FILM_COOL,
        )

        /** Presets grouped by category, preserving tray order. */
        fun byCategory(): Map<String, List<FilterPreset>> = ALL.groupBy { it.category }
    }
}
