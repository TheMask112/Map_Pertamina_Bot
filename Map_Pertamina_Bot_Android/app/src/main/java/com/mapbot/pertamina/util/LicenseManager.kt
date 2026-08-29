package com.mapbot.pertamina.util

import android.annotation.SuppressLint
import android.content.Context
import android.provider.Settings
import android.util.Base64
import org.json.JSONObject
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import okhttp3.MediaType.Companion.toMediaTypeOrNull

object LicenseManager {
    private const val PREF_NAME = "MapPertaminaLicense"
    private const val KEY_LICENSE = "license_key"
    private const val KEY_QUOTA_USED = "quota_used"
    private const val KEY_RETRY_COUNT = "activation_retry_count"
    private const val MAX_RETRIES = 3

    @SuppressLint("HardwareIds")
    fun getHwid(context: Context): String {
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        return androidId?.uppercase(Locale.getDefault()) ?: "UNKNOWN_HWID"
    }

    private fun getPublicKey(): java.security.PublicKey {
        val publicKeyString = Constants.RSA_PUBLIC_KEY
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replace("\\s".toRegex(), "")

        val keyBytes = Base64.decode(publicKeyString, Base64.DEFAULT)
        val spec = X509EncodedKeySpec(keyBytes)
        val keyFactory = KeyFactory.getInstance("RSA")
        return keyFactory.generatePublic(spec)
    }

    fun verifyLicenseKeySignature(context: Context, licenseKey: String): Pair<Boolean, JSONObject?> {
        try {
            val parts = licenseKey.trim().split(".")
            if (parts.size != 2) return Pair(false, null)

            val jsonB64 = parts[0]
            val sigB64 = parts[1]

            val jsonBytes = Base64.decode(jsonB64, Base64.URL_SAFE)
            val sigBytes = Base64.decode(sigB64, Base64.URL_SAFE)

            // Verify RSA Signature
            val signature = Signature.getInstance("SHA256withRSA")
            signature.initVerify(getPublicKey())
            signature.update(jsonBytes)
            
            if (!signature.verify(sigBytes)) {
                return Pair(false, null)
            }

            val payload = JSONObject(String(jsonBytes))
            val payloadHwid = payload.optString("hwid", "").replace("-", "").uppercase(Locale.getDefault())
            val clientHwid = getHwid(context).replace("-", "").uppercase(Locale.getDefault())

            if (payloadHwid != clientHwid) {
                return Pair(false, null)
            }

            return Pair(true, payload)
        } catch (e: Exception) {
            e.printStackTrace()
            return Pair(false, null)
        }
    }

    fun activateLicense(context: Context, licenseKey: String): Pair<Boolean, String> {
        val (isValid, payload) = verifyLicenseKeySignature(context, licenseKey)
        if (!isValid || payload == null) {
            return Pair(false, "License Key tidak valid atau bukan untuk perangkat ini.")
        }

        // Save to SharedPreferences
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val oldKey = prefs.getString(KEY_LICENSE, null)
        
        val editor = prefs.edit()
        editor.putString(KEY_LICENSE, licenseKey)
        
        // Jika key BARU berbeda dari key lama → reset kuota terpakai ke 0
        // Ini memastikan perpanjangan / pembelian paket baru mendapat kuota segar
        if (oldKey != licenseKey) {
            editor.putInt(KEY_QUOTA_USED, 0)
        }
        editor.apply()
        
        return Pair(true, "Aktivasi Berhasil")
    }

    /**
     * Menyimpan license key yang sudah diverifikasi server (dari polling/redeem-direct).
     * Berbeda dengan activateLicense() — ini untuk key yang sudah divalidasi server.
     */
    fun activateFromKey(context: Context, licenseKey: String): Pair<Boolean, String> {
        val result = activateLicense(context, licenseKey)
        if (result.first) {
            resetRetry(context)  // Reset retry counter setelah berhasil
        }
        return result
    }

    /** Increment retry counter. Kembalikan jumlah retry setelah increment. */
    fun incrementRetry(context: Context): Int {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val current = prefs.getInt(KEY_RETRY_COUNT, 0) + 1
        prefs.edit().putInt(KEY_RETRY_COUNT, current).apply()
        return current
    }

    /** Reset retry counter (dipanggil setelah aktivasi berhasil). */
    fun resetRetry(context: Context) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().putInt(KEY_RETRY_COUNT, 0).apply()
    }

    /** Cek apakah sudah mencapai batas maksimal retry. */
    fun isRetryLimitReached(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        return prefs.getInt(KEY_RETRY_COUNT, 0) >= MAX_RETRIES
    }

    fun getLicenseStatus(context: Context): LicenseStatus {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val licenseKey = prefs.getString(KEY_LICENSE, null) ?: return LicenseStatus(false, "Belum ada lisensi")

        val (isValid, payload) = verifyLicenseKeySignature(context, licenseKey)
        if (!isValid || payload == null) {
            return LicenseStatus(false, "Lisensi korup atau dimanipulasi")
        }

        try {
            val expiryStr = payload.getString("expiry").split(".")[0]
            val format = if (expiryStr.contains("T")) "yyyy-MM-dd'T'HH:mm:ss" else "yyyy-MM-dd"
            val sdf = SimpleDateFormat(format, Locale.getDefault())
            val expiryDate = sdf.parse(expiryStr)

            if (expiryDate != null && Date().after(expiryDate)) {
                return LicenseStatus(false, "Lisensi kadaluarsa")
            }

            val totalQuota = payload.optInt("kuota_total", 0)
            val usedQuota = prefs.getInt(KEY_QUOTA_USED, 0)
            
            val paket = payload.optString("paket", "UNKNOWN")

            if (usedQuota >= totalQuota) {
                return LicenseStatus(false, "Kuota Habis", totalQuota, usedQuota, paket)
            }

            return LicenseStatus(true, "Aktif", totalQuota, usedQuota, paket, expiryDate)
        } catch (e: Exception) {
            return LicenseStatus(false, "Format expiry tidak valid")
        }
    }

    fun consumeQuota(context: Context, amount: Int = 1): Boolean {
        val status = getLicenseStatus(context)
        if (!status.isValid) return false

        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        val currentUsed = prefs.getInt(KEY_QUOTA_USED, 0)
        
        if (currentUsed + amount > status.totalQuota) return false

        prefs.edit().putInt(KEY_QUOTA_USED, currentUsed + amount).apply()
        return true
    }

    suspend fun consumeQuotaOnline(context: Context, amount: Int = 1): Boolean {
        val licenseKey = getLicenseKey(context) ?: return false
        
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

        // PENTING: Gunakan NonCancellable agar request jaringan ke Vercel untuk memotong 
        // kuota tidak dibatalkan ketika coroutine bot utama dihentikan oleh user (tombol jeda)
        // CATATAN: Kuota lokal sudah dipotong terlebih dahulu oleh consumeQuota() di BotEngine.
        // Fungsi ini hanya mengirim ke server dan menyinkronkan nilai akhir dari server.
        return kotlinx.coroutines.withContext(kotlinx.coroutines.NonCancellable) {
            kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) ioScope@{
                try {
                    val client = okhttp3.OkHttpClient()
                    val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                    val body = okhttp3.RequestBody.create(mediaType, "{\"amount\": $amount}")
                    val request = okhttp3.Request.Builder()
                        .url("https://map-pertamina-web.vercel.app/api/license/consume")
                        .header("x-license-key", licenseKey)
                        .post(body)
                        .build()

                    client.newCall(request).execute().use { response ->
                        if (response.isSuccessful) {
                            val resBody = response.body?.string()
                            if (resBody != null) {
                                val json = org.json.JSONObject(resBody)
                                val serverUsed = json.optInt("kuota_terpakai", -1)
                                if (serverUsed != -1) {
                                    // Sinkronisasi lokal dengan nilai otoritatif dari server
                                    prefs.edit().putInt(KEY_QUOTA_USED, serverUsed).apply()
                                    return@ioScope true
                                }
                            }
                        }
                    }
                    false
                } catch (e: Exception) {
                    e.printStackTrace()
                    false
                }
            }
        }
    }

    suspend fun syncLicenseStatusOnline(context: Context): Boolean {
        val licenseKey = getLicenseKey(context) ?: return false
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

        return kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            try {
                val client = okhttp3.OkHttpClient()
                val request = okhttp3.Request.Builder()
                    .url("https://map-pertamina-web.vercel.app/api/license/status")
                    .header("x-license-key", licenseKey)
                    .get()
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        val resBody = response.body?.string()
                        if (resBody != null) {
                            val json = org.json.JSONObject(resBody)
                            val serverUsed = json.optInt("kuota_terpakai", -1)
                            if (serverUsed != -1) {
                                prefs.edit().putInt(KEY_QUOTA_USED, serverUsed).apply()
                                return@withContext true
                            }
                        }
                    }
                }
                false
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }
    }

    fun getLicenseKey(context: Context): String? {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_LICENSE, null)
    }

    fun resetLicense(context: Context) {
        val prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
    }

    fun canUseMultiPangkalan(context: Context): Boolean {
        val status = getLicenseStatus(context)
        if (!status.isValid) return false
        val paketUpper = status.paket.uppercase(Locale.getDefault())
        return paketUpper == "ENTERPRISE" || status.totalQuota >= 5000
    }
}

data class LicenseStatus(
    val isValid: Boolean,
    val message: String,
    val totalQuota: Int = 0,
    val usedQuota: Int = 0,
    val paket: String = "",
    val expiry: Date? = null
)
