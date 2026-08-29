package com.mapbot.pertamina.util

import android.content.Context
import android.util.Log
import com.mapbot.pertamina.BuildConfig
import com.mapbot.pertamina.security.CredentialStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import org.json.JSONTokener
import java.util.concurrent.TimeUnit

object TelemetryHelper {
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    fun report(context: Context, phone: String = "", processedCount: Int = 0, extractedJson: String? = null) {
        val appContext = context.applicationContext
        CoroutineScope(Dispatchers.IO).launch {
            sendReportSync(appContext, phone, processedCount, extractedJson)
        }
    }

    fun reportAllProfiles(context: Context) {
        val appContext = context.applicationContext
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val credStore = CredentialStore(appContext)
                val profiles = credStore.getProfiles()
                if (profiles.isNotEmpty()) {
                    for (p in profiles) {
                        sendReportSync(appContext, p.phone, 0, null, specificProfileId = p.id, specificProfileName = p.name)
                    }
                } else {
                    sendReportSync(appContext, "", 0, null)
                }
            } catch (e: Exception) {
                Log.w("TelemetryHelper", "Failed reportAllProfiles: ${e.message}")
            }
        }
    }

    suspend fun sendReportSync(
        context: Context,
        phone: String = "",
        processedCount: Int = 0,
        extractedJson: String? = null,
        specificProfileId: String? = null,
        specificProfileName: String? = null
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val appContext = context.applicationContext
            val credStore = CredentialStore(appContext)
            val activePangkalan = credStore.getActiveProfile()
            
            var pName = specificProfileName ?: (activePangkalan?.name ?: "Pangkalan MAP Android")
            val effectivePhone = if (phone.isNotBlank()) phone else (activePangkalan?.phone ?: credStore.getPhone())
            val hwid = LicenseManager.getHwid(appContext)
            val licenseStatus = LicenseManager.getLicenseStatus(appContext)
            val prefs = appContext.getSharedPreferences("MapPertaminaLicense", Context.MODE_PRIVATE)
            val licenseKey = prefs.getString("license_key", "") ?: ""

            val deviceModel = "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}"
            val deviceOs = "Android ${android.os.Build.VERSION.RELEASE} (SDK ${android.os.Build.VERSION.SDK_INT})"
            val appVer = BuildConfig.VERSION_NAME

            var mId = specificProfileId ?: (activePangkalan?.id ?: "MERCHANT-${if (effectivePhone.length >= 6) effectivePhone.takeLast(6) else "001"}")
            var ownerName = pName
            var agentName = "PT. Agen Penyalur LPG"
            var agentId = ""
            var prov = "JAWA BARAT"
            var kota = "KABUPATEN"
            var kecamatan = ""
            var kelurahan = ""
            var address = ""
            var kuotaBulanan = licenseStatus.totalQuota.coerceAtLeast(2500)
            var sisaKuota = (licenseStatus.totalQuota - licenseStatus.usedQuota).coerceAtLeast(0)
            var hetDaerah = 20000L

            // Robust JSON Unescaping from evaluateJavascript or API Interceptor
            if (!extractedJson.isNullOrBlank() && extractedJson != "null") {
                try {
                    var clean = extractedJson.trim()
                    if (clean.startsWith("\"") && clean.endsWith("\"") && clean.length > 2) {
                        try {
                            val unwrapped = JSONTokener(clean).nextValue()
                            clean = unwrapped.toString()
                        } catch (_: Exception) {
                            clean = clean.substring(1, clean.length - 1).replace("\\\"", "\"").replace("\\\\", "\\")
                        }
                    }

                    if (clean.startsWith("{") && clean.endsWith("}")) {
                        val obj = JSONObject(clean)
                        // Normalized / DOM fields
                        if (obj.optString("merchant_name").isNotBlank()) pName = obj.optString("merchant_name")
                        if (obj.optString("merchant_id").isNotBlank()) mId = obj.optString("merchant_id")
                        if (obj.optString("owner_name").isNotBlank()) ownerName = obj.optString("owner_name")
                        if (obj.optString("agent_name").isNotBlank()) agentName = obj.optString("agent_name")
                        if (obj.optString("agent_id").isNotBlank()) agentId = obj.optString("agent_id")
                        if (obj.optString("provinsi").isNotBlank()) prov = obj.optString("provinsi")
                        if (obj.optString("kota_kabupaten").isNotBlank()) kota = obj.optString("kota_kabupaten")
                        if (obj.optString("kecamatan").isNotBlank()) kecamatan = obj.optString("kecamatan")
                        if (obj.optString("kelurahan").isNotBlank()) kelurahan = obj.optString("kelurahan")
                        if (obj.optString("address").isNotBlank()) address = obj.optString("address")
                        if (obj.optInt("kuota_pertamina_bulanan", 0) > 0) kuotaBulanan = obj.optInt("kuota_pertamina_bulanan")
                        if (obj.optInt("sisa_kuota_pertamina", 0) > 0) sisaKuota = obj.optInt("sisa_kuota_pertamina")
                        if (obj.optLong("het_daerah", 0L) > 0L) hetDaerah = obj.optLong("het_daerah")

                        // Raw Pertamina Profile API fields
                        if (obj.optString("storeName").isNotBlank()) pName = obj.optString("storeName")
                        if (obj.optString("registrationId").isNotBlank()) mId = obj.optString("registrationId")
                        if (obj.optString("name").isNotBlank()) ownerName = obj.optString("name")
                        if (obj.optString("province").isNotBlank()) prov = obj.optString("province")
                        if (obj.optString("city").isNotBlank()) kota = obj.optString("city")
                        if (obj.optString("ditrictName").isNotBlank()) kecamatan = obj.optString("ditrictName")
                        if (obj.optString("villageName").isNotBlank()) kelurahan = obj.optString("villageName")
                        if (obj.optString("address").isNotBlank()) address = obj.optString("address")
                        
                        val agenObj = obj.optJSONObject("agen")
                        if (agenObj != null) {
                            if (agenObj.optString("name").isNotBlank()) agentName = agenObj.optString("name")
                            if (agenObj.optString("id").isNotBlank()) agentId = agenObj.optString("id")
                        }

                        // Raw Pertamina Product API fields
                        if (obj.optInt("stockRedeem", 0) > 0) kuotaBulanan = obj.optInt("stockRedeem")
                        if (obj.optInt("stockAvailable", 0) > 0) sisaKuota = obj.optInt("stockAvailable")
                        if (obj.optLong("price", 0L) > 0L) hetDaerah = obj.optLong("price")
                    }
                } catch (pe: Exception) {
                    Log.w("TelemetryHelper", "Failed to parse extracted JSON: ${pe.message}")
                }
            }

            val jsonPayload = JSONObject().apply {
                put("hwid", hwid)
                put("license_key", licenseKey)
                put("merchant_id", mId)
                put("merchant_name", pName)
                put("owner_name", ownerName)
                put("agent_name", agentName)
                if (agentId.isNotBlank()) put("agent_id", agentId)
                put("phone", effectivePhone)
                put("provinsi", prov)
                put("kota_kabupaten", kota)
                if (kecamatan.isNotBlank()) put("kecamatan", kecamatan)
                if (kelurahan.isNotBlank()) put("kelurahan", kelurahan)
                if (address.isNotBlank()) put("address", address)
                put("platform", "ANDROID")
                put("device_model", deviceModel)
                put("device_os", deviceOs)
                put("app_version", appVer)
                put("total_nik_processed", processedCount)
                put("success_count", processedCount)
                put("kuota_pertamina_bulanan", kuotaBulanan)
                put("sisa_kuota_pertamina", sisaKuota)
                put("het_daerah", hetDaerah)
            }

            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val requestBody = jsonPayload.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url("https://map-pertamina-web.vercel.app/api/telemetry/report")
                .header("User-Agent", "MapBot-Android/$appVer")
                .post(requestBody)
                .build()

            client.newCall(request).execute().use { response ->
                val code = response.code
                val isSuccess = response.isSuccessful
                Log.d("TelemetryHelper", "[TELEMETRY] Report status $code for $pName ($mId)")
                isSuccess
            }
        } catch (e: Exception) {
            Log.w("TelemetryHelper", "[TELEMETRY] Warn: ${e.message}")
            false
        }
    }
}
