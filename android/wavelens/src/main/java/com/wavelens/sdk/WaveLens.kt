package com.wavelens.sdk

import android.content.Context
import android.util.Log
import com.wavelens.sdk.internal.LicenseClient

/**
 * Wave Lens SDK entry point. Complete integration:
 *
 * ```
 * WaveLens.init(context, clientId = "...", clientSecret = "...")
 * ```
 *
 * then put a [WaveLensView] in a layout. That's it.
 *
 * The license check runs in the background and NEVER blocks app start, camera start,
 * or a live stream. On network failure the last cached entitlement is used (fail-open).
 * License changes made in the dashboard apply on the next check-in / next stream start.
 */
object WaveLens {

    const val ENGINE_VERSION = 1

    @Volatile
    private var license: LicenseClient? = null

    @Volatile
    var deviceTier: DeviceTier = DeviceTier.MID
        private set

    /**
     * Initialize once at app startup (e.g. in Application.onCreate).
     *
     * @param baseUrl your Wave Lens license server, e.g. "https://lens-api.example.com"
     */
    @JvmStatic
    @JvmOverloads
    fun init(
        context: Context,
        clientId: String,
        clientSecret: String,
        baseUrl: String = DEFAULT_BASE_URL,
    ) {
        if (license != null) {
            Log.w(TAG, "WaveLens.init called more than once — ignoring")
            return
        }
        deviceTier = DeviceTier.detect(context)
        license = LicenseClient(context, clientId, clientSecret, baseUrl).also { client ->
            synchronized(pendingStatusListeners) {
                pendingStatusListeners.forEach { client.addStatusListener(it) }
                pendingStatusListeners.clear()
            }
            client.start()
        }
        Log.i(TAG, "WaveLens initialized (deviceTier=$deviceTier)")
    }

    /** Master tenant switch as last reported by the server (cached, fail-open true). */
    @JvmStatic
    val isActive: Boolean
        get() = license?.active ?: true

    /**
     * Filter ids currently enabled for this tenant (entitled AND enabled, resolved
     * server-side). Empty before the first successful check — treat "empty and never
     * synced" as "show built-in presets" so a first launch offline still works.
     */
    @JvmStatic
    val enabledFilters: List<String>
        get() = license?.filters ?: emptyList()

    /** True once at least one license response has ever been received on this device. */
    @JvmStatic
    val hasSyncedOnce: Boolean
        get() = license?.hasServerResult ?: false

    /**
     * Presets to show in the tray.
     *
     * When the server delivers `filter_configs` (backend ≥ v0.3) the tray is fully
     * **server-driven**: filters added or re-tuned in Studio/backend appear here at
     * the next license refresh with no app rebuild. Entries this SDK build cannot
     * render (e.g. a sticker from a newer engine) are skipped automatically.
     *
     * Fallbacks: built-in presets filtered by the enabled list (older backend), or
     * all built-ins before the first successful sync (fail-open offline).
     */
    @JvmStatic
    fun availablePresets(): List<FilterPreset> {
        if (!isActive) return emptyList()
        if (!hasSyncedOnce) return FilterPreset.ALL

        val server = license?.serverPresets ?: emptyList()
        if (server.isNotEmpty()) {
            val withOriginal = listOf(FilterPreset.ORIGINAL) + server.filter { it.id != "original" }
            return withOriginal.sortedBy { categoryRank(it.category) } // stable sort
        }

        val enabled = enabledFilters.toSet()
        return FilterPreset.ALL.filter { it.id == "original" || it.id in enabled }
    }

    private val CATEGORY_ORDER = listOf("auto", "beauty", "enhance", "face", "effects")

    private fun categoryRank(category: String): Int {
        val i = CATEGORY_ORDER.indexOf(category)
        return if (i < 0) CATEGORY_ORDER.size else i
    }

    /**
     * Presets grouped by category in tray order ("auto", "beauty", "enhance",
     * "effects"), already filtered by the tenant's enabled list. Use this to build
     * a category-tabbed filter tray.
     */
    @JvmStatic
    fun presetsByCategory(): Map<String, List<FilterPreset>> =
        availablePresets().groupBy { it.category }

    /** Notifies when a license refresh completes (main thread). */
    @JvmStatic
    fun addLicenseListener(listener: (active: Boolean, filters: List<String>) -> Unit) {
        license?.addListener(listener)
    }

    private val pendingStatusListeners = mutableListOf<(Boolean, String) -> Unit>()

    /**
     * Notifies (main thread) with a human-readable message when something notable
     * changes: the tenant account was deactivated/reactivated, or the filter lineup
     * changed in Studio. Fires at most once per change — including on app startup
     * if the account is already deactivated. [WaveLensView] also shows these as a
     * built-in banner; use this to surface them in your own UI instead.
     */
    @JvmStatic
    fun addStatusListener(listener: (active: Boolean, message: String) -> Unit) {
        val client = license
        if (client != null) {
            client.addStatusListener(listener)
        } else {
            synchronized(pendingStatusListeners) { pendingStatusListeners.add(listener) }
        }
    }

    @JvmStatic
    fun removeStatusListener(listener: (active: Boolean, message: String) -> Unit) {
        license?.removeStatusListener(listener)
        synchronized(pendingStatusListeners) { pendingStatusListeners.remove(listener) }
    }

    /** Force a license re-check (e.g. right before a stream starts). Non-blocking. */
    @JvmStatic
    fun refreshLicense() {
        license?.refresh()
    }

    private const val TAG = "WaveLens"
    private const val DEFAULT_BASE_URL = "https://lens-api.wavelens.dev"
}
