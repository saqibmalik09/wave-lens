package com.wavelens.sdk.internal

import android.util.Log
import com.wavelens.sdk.FilterParam
import com.wavelens.sdk.FilterPreset
import org.json.JSONArray

/**
 * Converts the license endpoint's `filter_configs` payload into [FilterPreset]s.
 *
 * This is what makes the catalog server-driven: new filters (or tuned values) added
 * in the backend become presets in already-installed apps at the next license
 * refresh — no app rebuild. Entries this SDK build cannot render (unknown sticker or
 * LUT from a newer engine) are skipped safely; unknown *params* are just ignored so
 * a preset still applies everything it can.
 *
 * Payload item shape:
 * { id, name, category, type, lut?, auto?, sticker?, params?: { brightness: 0.1, … } }
 */
internal object ServerCatalog {

    private val KNOWN_LUTS = setOf("", "identity", "bw", "sepia", "vintage", "film_warm", "film_cool")

    fun parse(raw: String?): List<FilterPreset> {
        if (raw.isNullOrBlank()) return emptyList()
        return try {
            val arr = JSONArray(raw)
            val out = ArrayList<FilterPreset>(arr.length())
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                val id = o.optString("id")
                if (id.isBlank() || o.optString("type", "discrete") != "discrete") continue

                val lut = o.optString("lut", "").takeIf { it.isNotBlank() }
                if (lut != null && lut !in KNOWN_LUTS) continue

                val sticker = o.optString("sticker", "").takeIf { it.isNotBlank() }
                if (sticker != null && !StickerFactory.isKnown(sticker)) continue

                val params = mutableMapOf<FilterParam, Float>()
                o.optJSONObject("params")?.let { p ->
                    for (key in p.keys()) {
                        val param = FilterParam.values().firstOrNull { it.name.equals(key, true) }
                            ?: continue // param from a newer engine — ignore
                        params[param] = p.optDouble(key, 0.0).toFloat()
                    }
                }

                out.add(
                    FilterPreset(
                        id = id,
                        displayName = o.optString("name", id),
                        category = o.optString("category", "effects"),
                        lut = lut,
                        params = params,
                        autoMode = o.optBoolean("auto", false),
                        faceSticker = sticker,
                    ),
                )
            }
            out
        } catch (e: Exception) {
            Log.w("WaveLens", "Bad filter_configs payload (${e.message}) — using built-ins")
            emptyList()
        }
    }
}
