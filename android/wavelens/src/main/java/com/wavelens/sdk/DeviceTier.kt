package com.wavelens.sdk

import android.app.ActivityManager
import android.content.Context

/**
 * Coarse device capability bucket, used to tune tracking model precision / analysis
 * frequency on very low-end devices (Phase 3+). Detected once at init.
 */
enum class DeviceTier {
    LOW, MID, HIGH;

    companion object {
        fun detect(context: Context): DeviceTier {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memInfo = ActivityManager.MemoryInfo()
            am.getMemoryInfo(memInfo)
            val totalGb = memInfo.totalMem / (1024.0 * 1024.0 * 1024.0)
            val cores = Runtime.getRuntime().availableProcessors()
            return when {
                totalGb >= 6.0 && cores >= 8 -> HIGH
                totalGb >= 3.0 && cores >= 4 -> MID
                else -> LOW
            }
        }
    }
}
