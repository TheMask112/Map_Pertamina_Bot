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

                    // Endpoint verifikasi resmi Pertamina MAP
                    var endpoints = [
                        'https://api-map.my-pertamina.id/general/customer-service/v1/verify-nik?nationalityId=' + '$nik',
                        '/general/customer-service/v1/verify-nik?nationalityId=' + '$nik'
                    ];

                    var res = null;
                    for (var u of endpoints) {
                        try {
                            res = await fetch(u, { method: 'GET', headers: headers });
                            if (res && res.ok) break;
                        } catch(e) {}
                    }

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
                nikData.keterangan = "Siap Diproses"
                return
            }

            val json = JSONObject(rawJson)
            val dataObj = json.optJSONObject("data") ?: json

            val nama = dataObj.optString("name", "")
            val customerTypesArr = dataObj.optJSONArray("customerTypes")
            var kategori = "Rumah Tangga"
            if (customerTypesArr != null) {
                for (j in 0 until customerTypesArr.length()) {
                    val t = customerTypesArr.optJSONObject(j)?.optString("name", "") ?: ""
                    if (t.contains("Usaha", ignoreCase = true) || t.contains("Mikro", ignoreCase = true)) {
                        kategori = "Usaha Mikro"
                        break
                    }
                }
            }
            nikData.kategori = kategori

            val statusCode = json.optInt("status", 200)
            if (statusCode == 404 || rawJson.contains("tidak ditemukan", ignoreCase = true)) {
                nikData.status = Constants.STATUS_NIK_INVALID
                nikData.keterangan = "[BETA] Belum terdaftar"
            } else {
                nikData.keterangan = "[BETA] Terdaftar: $nama ($kategori)"
            }
        } catch (e: Exception) {
            nikData.keterangan = "Siap Diproses"
        }
    }
}
