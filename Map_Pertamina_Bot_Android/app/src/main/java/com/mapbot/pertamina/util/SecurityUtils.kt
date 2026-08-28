package com.mapbot.pertamina.util

import android.os.Build
import java.io.File

object SecurityUtils {

    /**
     * Cek apakah perangkat menjalankan emulator (Bluestacks, Nox, Android Studio Emulator, dll)
     */
    fun isEmulator(): Boolean {
        return (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"))
                || Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.startsWith("unknown")
                || Build.HARDWARE.contains("goldfish")
                || Build.HARDWARE.contains("ranchu")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.contains("Emulator")
                || Build.MODEL.contains("Android SDK built for x86")
                || Build.MANUFACTURER.contains("Genymotion")
                || Build.PRODUCT.contains("sdk_google")
                || Build.PRODUCT.contains("google_sdk")
                || Build.PRODUCT.contains("sdk")
                || Build.PRODUCT.contains("sdk_x86")
                || Build.PRODUCT.contains("vbox86p")
                || Build.PRODUCT.contains("emulator")
                || Build.PRODUCT.contains("simulator")
    }

    /**
     * Cek apakah perangkat sudah di-root
     */
    fun isRooted(): Boolean {
        val paths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su"
        )
        for (path in paths) {
            if (File(path).exists()) return true
        }
        return false
    }

    /**
     * Cek apakah signature aplikasi valid dan tidak dimodifikasi
     */
    fun isSignatureValid(context: android.content.Context): Boolean {
        try {
            val packageInfo = context.packageManager.getPackageInfo(
                context.packageName,
                android.content.pm.PackageManager.GET_SIGNATURES
            )
            val signatures = packageInfo.signatures ?: emptyArray()
            for (signature in signatures) {
                val md = java.security.MessageDigest.getInstance("SHA-256")
                md.update(signature.toByteArray())
                val hash = md.digest().joinToString("") { "%02X".format(it) }
                
                // EXPECTED HASH: Debug Keystore for now
                val expectedHash = "8C7BA39E2EAC041F2A087284B27749D0FE8373C40F7A05526C45118FE13CFAB6"
                if (hash == expectedHash) {
                    return true
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return false
    }

    /**
     * Cek apakah aplikasi dalam keadaan tidak aman
     */
    fun isDeviceSafe(context: android.content.Context): Boolean {
        return !isRooted() && !isEmulator() && isSignatureValid(context)
    }
}
