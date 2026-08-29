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

    /**
     * Presets built from the server's `filter_configs` (cached across launches).
     * Non-empty means the tray is fully server-driven: filters added/tuned in the
     * backend appear here after a refresh — no app rebuild.
     */
    @Volatile
    var serverPresets: List<com.wavelens.sdk.FilterPreset> =
        ServerCatalog.parse(prefs.getString(KEY_CONFIGS, null))
        private set

    /** True once at least one successful server response has ever been cached. */
    val hasServerResult: Boolean get() = prefs.contains(KEY_ACTIVE)

    fun addListener(listener: (active: Boolean, filters: List<String>) -> Unit) {
        synchronized(listeners) { listeners.add(listener) }
    }

    // Human-readable status events ("account deactivated", "filters updated", ...)
    // delivered on the main thread — only when something notable happens.
    private val statusListeners = mutableListOf<(active: Boolean, message: String) -> Unit>()
    private var statusEmittedOnce = false

    fun addStatusListener(listener: (active: Boolean, message: String) -> Unit) {
        synchronized(statusListeners) { statusListeners.add(listener) }
    }

    fun removeStatusListener(listener: (active: Boolean, message: String) -> Unit) {
        synchronized(statusListeners) { statusListeners.remove(listener) }
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
            val serverMessage = json.optString("message", "").takeIf { it.isNotBlank() }
            val filtersJson = json.optJSONArray("filters") ?: JSONArray()
            val newFilters = ArrayList<String>(filtersJson.length())
            for (i in 0 until filtersJson.length()) {
                newFilters.add(filtersJson.getString(i))
            }
            val configsJson = json.optJSONArray("filter_configs")

            val prevActive = active
            val prevFilters = filters.toSet()
            val hadSynced = hasServerResult

            active = newActive
            filters = newFilters
            serverPresets = ServerCatalog.parse(configsJson?.toString())
            prefs.edit()
                .putBoolean(KEY_ACTIVE, newActive)
                .putString(KEY_FILTERS, filtersJson.toString())
                .putString(KEY_CONFIGS, configsJson?.toString())
                .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
                .apply()

            val statusMessage = when {
                // Deactivated (or app started while deactivated): tell the host once.
                !newActive && (prevActive || !statusEmittedOnce) ->
                    serverMessage ?: "Wave Lens filters are turned off for this account. Please contact your provider."
                // Reactivated.
                newActive && !prevActive && hadSynced ->
                    "Wave Lens filters are active again."
                // Filter lineup changed while active (added/removed in Studio).
                newActive && hadSynced && prevFilters != newFilters.toSet() ->
                    "Filters updated — your tray has changed."
                else -> null
            }
            statusEmittedOnce = true

            val snapshot = synchronized(listeners) { listeners.toList() }
            val statusSnapshot = synchronized(statusListeners) { statusListeners.toList() }
            mainHandler.post {
                snapshot.forEach { it(newActive, newFilters) }
                if (statusMessage != null) {
                    statusSnapshot.forEach { it(newActive, statusMessage) }
                }
            }
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
        const val KEY_CONFIGS = "filter_configs"
        const val KEY_UPDATED_AT = "updated_at"
        // Short enough that Studio changes (enable/disable filters, deactivation)
        // reach live apps almost immediately; the payload is ~1-2 KB so even at
        // 2 minutes the traffic is negligible. Call WaveLens.refreshLicense()
        // before going live for instant pickup.
        const val REFRESH_INTERVAL_MS = 2L * 60 * 1000  // 2 minutes
    }
}
