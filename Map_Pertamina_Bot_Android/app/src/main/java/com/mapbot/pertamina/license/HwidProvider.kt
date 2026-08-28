package com.mapbot.pertamina.license

import android.content.Context
import android.media.MediaDrm
import android.os.Build
import android.provider.Settings
import java.security.MessageDigest
import java.util.UUID

object HwidProvider {
    fun getHwid(context: Context): String {
        val parts = mutableListOf<String>()

        val androidId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "unknown"
        parts.add(androidId)

        try {
            val widevineUuid = UUID(-0x121074568629b532L, -0x6739e8b4567a4321L)
            val drm = MediaDrm(widevineUuid)
            val drmId = drm.getPropertyByteArray(MediaDrm.PROPERTY_DEVICE_UNIQUE_ID)
            parts.add(drmId.joinToString("") { "%02x".format(it) })
            drm.release()
        } catch (e: Exception) {
            parts.add(Build.BOARD + Build.BRAND + Build.DEVICE + Build.HARDWARE)
        }

        val combined = parts.joinToString("|")
        val md = MessageDigest.getInstance("SHA-256")
        val hash = md.digest(combined.toByteArray())
        return hash.joinToString("") { "%02x".format(it) }
            .substring(0, 32).uppercase()
    }
}
