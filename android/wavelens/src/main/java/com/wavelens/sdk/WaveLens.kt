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
        license = LicenseClient(context, clientId, clientSecret, baseUrl).also { it.start() }
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
     * Presets to show in the tray: built-in presets filtered by the tenant's enabled
     * list. Before the first successful sync all built-ins are shown (fail-open).
     */
    @JvmStatic
    fun availablePresets(): List<FilterPreset> {
        if (!isActive) return emptyList()
        if (!hasSyncedOnce) return FilterPreset.ALL
        val enabled = enabledFilters.toSet()
        return FilterPreset.ALL.filter { it.id == "original" || it.id in enabled }
    }

    /** Notifies when a license refresh completes (main thread). */
    @JvmStatic
    fun addLicenseListener(listener: (active: Boolean, filters: List<String>) -> Unit) {
        license?.addListener(listener)
    }

    /** Force a license re-check (e.g. right before a stream starts). Non-blocking. */
    @JvmStatic
    fun refreshLicense() {
        license?.refresh()
    }

    private const val TAG = "WaveLens"
    private const val DEFAULT_BASE_URL = "https://lens-api.wavelens.dev"
}
