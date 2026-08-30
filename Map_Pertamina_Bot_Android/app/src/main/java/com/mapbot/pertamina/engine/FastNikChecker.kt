package com.mapbot.pertamina.engine

import android.util.Log
import com.mapbot.pertamina.data.NikData
import com.mapbot.pertamina.util.Constants
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONObject
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

/**
 * FastNikChecker (Beta Experimental)
 * Melakukan verifikasi NIK dan kuota secara cepat di background
 * tanpa perlu rendering / klik UI satu-per-satu.
 */
class FastNikChecker(private val wvManager: WebViewManager) {

    suspend fun batchPreCheck(
        nikList: List<NikData>,
        onProgress: (current: Int, total: Int, nik: NikData) -> Unit
    ): List<NikData> = withContext(Dispatchers.Main) {
        val total = nikList.size
        Log.d("FastNikChecker", "[BETA] Memulai Fast Pre-Check untuk $total NIK...")

        nikList.forEachIndexed { index, nikData ->
            val cleanNik = nikData.nik.filter { it.isDigit() }
            if (cleanNik.length != 16) {
                nikData.status = Constants.STATUS_NIK_INVALID
                nikData.keterangan = "[BETA] NIK tidak 16 digit"
            } else {
                // Eksekusi cek ringan via JS fetch di sesi WebView aktif
                val resultJson = executeDirectNikCheck(cleanNik)
                parseCheckResult(nikData, resultJson)
            }
            onProgress(index + 1, total, nikData)
            delay(100) // Delay proteksi anti-throttling
        }

        Log.d("FastNikChecker", "[BETA] Fast Pre-Check selesai.")
        nikList
    }

    private suspend fun executeDirectNikCheck(nik: String): String = suspendCoroutine { cont ->
        val jsCode = """
            (async function() {
                try {
                    // Cari token dari storage atau state browser
                    var token = localStorage.getItem('token') || 
                                sessionStorage.getItem('token') || 
                                localStorage.getItem('access_token');
                    
                    var headers = { 'Content-Type': 'application/json' };
                    if (token) {
                        headers['Authorization'] = 'Bearer ' + token;
                    }

                    // Coba endpoint verifikasi subsiditepat
                    var endpoints = [
                        '/api/v1/consumer/check?nik=' + '$nik',
                        '/api/lpg/cek-nik?nik=' + '$nik',
                        '/api/merchant/verify-nik'
                    ];

                    var res = await fetch(endpoints[0], { 
                        method: 'GET',
                        headers: headers 
                    }).catch(() => null);

                    if (res && res.ok) {
                        var json = await res.json();
                        return JSON.stringify(json);
                    }
                    
                    return JSON.stringify({ status: 'FALLBACK_UI', nik: '$nik' });
                } catch(e) {
                    return JSON.stringify({ status: 'FALLBACK_UI', error: e.message });
                }
            })()
        """.trimIndent()

        wvManager.executeJs(jsCode) { rawResult ->
            val cleaned = rawResult.trim().trim('"').replace("\\\"", "\"")
            cont.resume(cleaned)
        }
    }

    private fun parseCheckResult(nikData: NikData, rawJson: String) {
        try {
            if (rawJson.contains("FALLBACK_UI")) {
                // Jika endpoint belum match, biarkan lolos untuk diproses UI biasa
                nikData.keterangan = "Siap Diproses"
                return
            }

            val json = JSONObject(rawJson)
            val dataObj = json.optJSONObject("data") ?: json

            val statusSubsidi = dataObj.optString("status_subsidi", "").uppercase()
            val sisaKuota = dataObj.optInt("sisa_kuota_bulan_ini", -1)
            val nama = dataObj.optString("nama", "")
            val tipe = dataObj.optString("tipe_konsumen", "")

            if (statusSubsidi.contains("TIDAK") || statusSubsidi.contains("INVALID")) {
                nikData.status = Constants.STATUS_NIK_INVALID
                nikData.keterangan = "[BETA] Tidak terdaftar"
            } else if (sisaKuota == 0) {
                nikData.status = Constants.STATUS_SKIP
                nikData.keterangan = "[BETA] Kuota bulanan 0 (Habis)"
            } else if (sisaKuota > 0) {
                nikData.keterangan = "[BETA] Siap (Sisa: $sisaKuota tabung | $tipe | $nama)"
            }
        } catch (e: Exception) {
            nikData.keterangan = "Siap Diproses (Normal)"
        }
    }
}
