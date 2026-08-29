package com.wavelens.sdk.internal

import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.concurrent.Executors

/**
 * Fail-open license client.
 *
 * - Reads the last cached result synchronously at construction — the SDK is usable
 *   immediately, even fully offline.
 * - Refreshes in the background on init and every [REFRESH_INTERVAL_MS] while alive.
 * - On any network/server failure the cache is kept as-is (never downgrades access
 *   because of a bad connection — spec section 7, "fail-open").
 *
 * Payload is a tiny JSON (~1 KB): { "active": bool, "filters": ["bw", "glow", ...] }.
 */
internal class LicenseClient(
    context: Context,
    private val clientId: String,
    private val clientSecret: String,
    private val baseUrl: String,
) {
    private val appContext = context.applicationContext
    private val prefs: SharedPreferences =
        appContext.getSharedPreferences("wavelens_license", Context.MODE_PRIVATE)
    private val executor = Executors.newSingleThreadExecutor { r -> Thread(r, "WaveLensLicense") }
    private val mainHandler = Handler(Looper.getMainLooper())
    private val listeners = mutableListOf<(Boolean, List<String>) -> Unit>()

    @Volatile
    var active: Boolean = prefs.getBoolean(KEY_ACTIVE, true)
        private set

    @Volatile
    var filters: List<String> = readCachedFilters()
        private set

    /** True once at least one successful server response has ever been cached. */
    val hasServerResult: Boolean get() = prefs.contains(KEY_ACTIVE)

    fun addListener(listener: (active: Boolean, filters: List<String>) -> Unit) {
        synchronized(listeners) { listeners.add(listener) }
    }

    fun start() {
        refresh()
        scheduleNextRefresh()
    }

    fun refresh() {
        executor.execute { doRefresh() }
    }

    private fun scheduleNextRefresh() {
        mainHandler.postDelayed({
            refresh()
            scheduleNextRefresh()
        }, REFRESH_INTERVAL_MS)
    }

    private fun doRefresh() {
        var connection: HttpURLConnection? = null
        try {
            val bundleId = appContext.packageName
            val url = URL(
                baseUrl.trimEnd('/') +
                    "/v1/license/status" +
                    "?client_id=" + URLEncoder.encode(clientId, "UTF-8") +
                    "&client_secret=" + URLEncoder.encode(clientSecret, "UTF-8") +
                    "&bundle_id=" + URLEncoder.encode(bundleId, "UTF-8")
            )
            connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 10_000
            connection.readTimeout = 10_000
            connection.requestMethod = "GET"

            if (connection.responseCode != 200) {
                Log.w(TAG, "License check HTTP ${connection.responseCode} — keeping cached state")
                return
            }

            val body = connection.inputStream.bufferedReader().use(BufferedReader::readText)
            val json = JSONObject(body)
            val newActive = json.optBoolean("active", false)
            val filtersJson = json.optJSONArray("filters") ?: JSONArray()
            val newFilters = ArrayList<String>(filtersJson.length())
            for (i in 0 until filtersJson.length()) {
                newFilters.add(filtersJson.getString(i))
            }

            active = newActive
            filters = newFilters
            prefs.edit()
                .putBoolean(KEY_ACTIVE, newActive)
                .putString(KEY_FILTERS, filtersJson.toString())
                .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
                .apply()

            val snapshot = synchronized(listeners) { listeners.toList() }
            mainHandler.post { snapshot.forEach { it(newActive, newFilters) } }
        } catch (e: Exception) {
            // Fail-open: network problems never reduce access. Cached state stays in effect.
            Log.w(TAG, "License check failed (${e.message}) — keeping cached state")
        } finally {
            connection?.disconnect()
        }
    }

    private fun readCachedFilters(): List<String> {
        val raw = prefs.getString(KEY_FILTERS, null) ?: return emptyList()
        return try {
            val arr = JSONArray(raw)
            List(arr.length()) { arr.getString(it) }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private companion object {
        const val TAG = "WaveLens"
        const val KEY_ACTIVE = "active"
        const val KEY_FILTERS = "filters"
        const val KEY_UPDATED_AT = "updated_at"
        const val REFRESH_INTERVAL_MS = 4L * 60 * 60 * 1000  // 4 hours
    }
}
