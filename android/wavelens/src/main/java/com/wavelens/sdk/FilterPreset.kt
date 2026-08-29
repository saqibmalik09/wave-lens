package com.wavelens.sdk

/**
 * A one-tap look: a LUT name (generated inside the engine) plus parameter values.
 * Applying a preset resets all params to the preset's values.
 *
 * [id] matches the filter id used by the license service catalog, so the tray can be
 * filtered by [WaveLens.enabledFilters].
 */
data class FilterPreset(
    val id: String,
    val displayName: String,
    val lut: String? = null,
    val params: Map<FilterParam, Float> = emptyMap(),
) {
    companion object {
        val ORIGINAL = FilterPreset("original", "Original")
        val BW = FilterPreset("bw", "B&W", lut = "bw", params = mapOf(FilterParam.LUT_INTENSITY to 1f))
        val VINTAGE = FilterPreset(
            "vintage", "Vintage", lut = "vintage",
            params = mapOf(FilterParam.LUT_INTENSITY to 1f, FilterParam.VIGNETTE to 0.35f),
        )
        val SEPIA = FilterPreset("sepia", "Sepia", lut = "sepia", params = mapOf(FilterParam.LUT_INTENSITY to 1f))
        val WARM = FilterPreset("warm", "Warm", params = mapOf(FilterParam.TEMPERATURE to 0.35f))
        val COOL = FilterPreset("cool", "Cool", params = mapOf(FilterParam.TEMPERATURE to -0.35f))
        val GLOW = FilterPreset(
            "glow", "Glow",
            params = mapOf(FilterParam.GLOW to 0.6f, FilterParam.BRIGHTNESS to 0.05f),
        )
        val FILM_WARM = FilterPreset(
            "film_warm", "Film Warm", lut = "film_warm",
            params = mapOf(FilterParam.LUT_INTENSITY to 1f),
        )
        val FILM_COOL = FilterPreset(
            "film_cool", "Film Cool", lut = "film_cool",
            params = mapOf(FilterParam.LUT_INTENSITY to 1f),
        )

        /** All built-in color presets, in tray order. */
        val ALL: List<FilterPreset> =
            listOf(ORIGINAL, BW, VINTAGE, SEPIA, WARM, COOL, GLOW, FILM_WARM, FILM_COOL)
    }
}
