package com.mapbot.pertamina.util

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

object SessionReporter {

    suspend fun reportSession(
        context: Context,
        whatsapp: String,
        namaPangkalan: String,
        startedAt: String,
        endedAt: String,
        durationSeconds: Long,
        totalNik: Int,
        nikSukses: Int,
        nikGagal: Int,
        nikTidakTerdaftar: Int,
        nikKuotaHabis: Int,
        nikMeninggal: Int,
        nikDibawahUmur: Int,
        nikTidakAktif: Int,
        captchaTotal: Int,
        captchaSukses: Int,
        jumlahTabung: Int,
        avgSecondsPerNik: Double,
        batchNumber: Int,
        // BIG DATA V3 FIELDS
        latitude: Double?,
        longitude: Double?,
        inboxAlerts: String?,
        ramUsageMb: Int?,
        pingMs: Int?,
        logisticHistory: String?,
        nikDemographics: String?
    ) = withContext(Dispatchers.IO + NonCancellable) {
        try {
            val licenseKey = LicenseManager.getLicenseKey(context) ?: return@withContext
            val hwid = LicenseManager.getHwid(context)

            val json = JSONObject().apply {
                put("whatsapp", whatsapp)
                put("nama_pangkalan", namaPangkalan)
                put("platform", "ANDROID")
                put("app_version", "1.2.0")
                put("started_at", startedAt)
                put("ended_at", endedAt)
                put("duration_seconds", durationSeconds)
                put("total_nik", totalNik)
                put("nik_sukses", nikSukses)
                put("nik_gagal", nikGagal)
                put("nik_tidak_terdaftar", nikTidakTerdaftar)
                put("nik_kuota_habis", nikKuotaHabis)
                put("nik_meninggal", nikMeninggal)
                put("nik_dibawah_umur", nikDibawahUmur)
                put("nik_tidak_aktif", nikTidakAktif)
                put("captcha_total", captchaTotal)
                put("captcha_sukses", captchaSukses)
                put("jumlah_tabung", jumlahTabung)
                put("avg_seconds_per_nik", avgSecondsPerNik)
                put("batch_number", batchNumber)
                put("hwid", hwid)
                // BIG DATA V3 FIELDS
                put("latitude", latitude)
                put("longitude", longitude)
                put("inbox_alerts", inboxAlerts)
                put("ram_usage_mb", ramUsageMb)
                put("ping_ms", pingMs)
                if (logisticHistory != null) put("logistic_history", JSONObject(logisticHistory))
                if (nikDemographics != null) put("nik_demographics", JSONObject(nikDemographics))
            }

            val client = OkHttpClient()
            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val body = json.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url("https://map-pertamina-web.vercel.app/api/report-session")
                .header("x-license-key", licenseKey)
                .post(body)
                .build()

            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    Log.d("SessionReporter", "Berhasil melaporkan sesi")
                } else {
                    Log.d("SessionReporter", "Gagal melaporkan sesi: ${response.message}")
                }
            }
        } catch (e: Exception) {
            Log.e("SessionReporter", "Error saat melaporkan sesi", e)
        }
    }
}
