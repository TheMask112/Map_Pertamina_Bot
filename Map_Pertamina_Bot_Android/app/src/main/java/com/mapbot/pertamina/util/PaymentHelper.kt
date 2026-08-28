package com.mapbot.pertamina.util

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.browser.customtabs.CustomTabsIntent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

object PaymentHelper {
    private val client = OkHttpClient()
    private const val BASE_URL = Constants.LICENSE_API_URL

    data class OrderResponse(
        val snapToken: String = "",
        val clientKey: String = "",
        val orderId: String = "",
        val redirectUrl: String = "",
        val errorMessage: String? = null
    )

    data class RedeemResult(
        val success: Boolean,
        val licenseKey: String? = null,
        val errorMessage: String? = null
    )

    /**
     * Membuat order baru di server.
     * Mengirim hwid perangkat agar webhook Midtrans bisa auto-generate lisensi setelah bayar.
     */
    suspend fun createOrder(paket: String, whatsapp: String, context: Context): OrderResponse =
        withContext(Dispatchers.IO) {
            try {
                val hwid = LicenseManager.getHwid(context)
                val json = JSONObject().apply {
                    put("paket", paket)
                    put("whatsapp", whatsapp)
                    put("hwid", hwid)  // Dikirim agar bisa auto-aktivasi lisensi setelah pembayaran
                }

                val body = json.toString().toRequestBody("application/json".toMediaType())
                val request = Request.Builder()
                    .url("$BASE_URL/orders")
                    .post(body)
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string()

                if (!response.isSuccessful) {
                    val errorMsg = if (responseBody != null) {
                        JSONObject(responseBody).optString("error", "Gagal membuat pesanan")
                    } else "Unknown error"
                    return@withContext OrderResponse(errorMessage = errorMsg)
                }

                if (responseBody != null) {
                    val data = JSONObject(responseBody)
                    val snapToken = data.optString("snapToken")
                    val clientKey = data.optString("clientKey")
                    val orderId = data.optString("orderId")
                    val redirectUrl = data.optString("redirectUrl", "")

                    if (snapToken.isNotEmpty() && clientKey.isNotEmpty()) {
                        return@withContext OrderResponse(
                            snapToken = snapToken,
                            clientKey = clientKey,
                            orderId = orderId,
                            redirectUrl = redirectUrl
                        )
                    }
                }
                return@withContext OrderResponse(errorMessage = "Response tidak valid dari server")
            } catch (e: Exception) {
                Log.e("PaymentHelper", "Error creating order", e)
                return@withContext OrderResponse(errorMessage = e.message)
            }
        }

    /**
     * Buka halaman pembayaran Midtrans di Chrome Custom Tabs.
     * Jauh lebih reliable daripada Midtrans UiKit SDK — tidak ada masalah
     * "Couldn't find your transaction record" lagi.
     */
    fun openPaymentPage(context: Context, redirectUrl: String, snapToken: String) {
        // Gunakan redirectUrl dari Midtrans jika tersedia, fallback ke URL snap
        val paymentUrl = if (redirectUrl.isNotEmpty()) {
            redirectUrl
        } else {
            // Fallback: buat redirect URL dari snap token (format Midtrans production)
            "https://app.midtrans.com/snap/v4/redirection/$snapToken"
        }

        Log.d("PaymentHelper", "Opening payment URL: $paymentUrl")

        try {
            // Coba Chrome Custom Tabs dulu (lebih bagus UX-nya)
            val customTabsIntent = CustomTabsIntent.Builder()
                .setShowTitle(true)
                .build()
            customTabsIntent.launchUrl(context, Uri.parse(paymentUrl))
        } catch (e: Exception) {
            // Fallback ke browser biasa jika Custom Tabs tidak tersedia
            Log.w("PaymentHelper", "Custom Tabs failed, using browser fallback", e)
            try {
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(paymentUrl))
                context.startActivity(browserIntent)
            } catch (e2: Exception) {
                Log.e("PaymentHelper", "Cannot open payment URL", e2)
            }
        }
    }

    /**
     * Polling status order ke server hingga REDEEMED atau EXPIRED (max 10 menit).
     * Server webhook Midtrans akan auto-generate license_key setelah pembayaran berhasil.
     * Jika belum REDEEMED setelah 10 menit → fallback ke redeemDirect().
     */
    suspend fun pollOrderForLicense(orderId: String, context: Context): RedeemResult =
        withContext(Dispatchers.IO) {
            val maxWaitMs = 10 * 60 * 1000L  // 10 menit
            val pollIntervalMs = 4000L        // Cek setiap 4 detik
            val startTime = System.currentTimeMillis()

            while (System.currentTimeMillis() - startTime < maxWaitMs) {
                try {
                    val request = Request.Builder()
                        .url("$BASE_URL/orders/$orderId/status")
                        .get()
                        .build()

                    val response = client.newCall(request).execute()
                    val responseBody = response.body?.string()

                    if (response.isSuccessful && responseBody != null) {
                        val data = JSONObject(responseBody)
                        val status = data.optString("status")
                        val licenseKey = data.optString("licenseKey", "")

                        when {
                            status == "REDEEMED" && licenseKey.isNotEmpty() -> {
                                // Lisensi sudah di-generate otomatis oleh webhook
                                return@withContext RedeemResult(true, licenseKey)
                            }
                            status == "PAID" -> {
                                // Bayar tapi belum REDEEMED — fallback manual redeem
                                val voucherCode = data.optString("voucherCode", "")
                                if (voucherCode.isNotEmpty()) {
                                    return@withContext redeemDirect(voucherCode, context)
                                }
                            }
                            status == "EXPIRED" || status == "FAILED" -> {
                                return@withContext RedeemResult(false, errorMessage = "Transaksi kadaluarsa atau gagal.")
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.w("PaymentHelper", "Polling error (akan retry): ${e.message}")
                }
                delay(pollIntervalMs)
            }
            // Timeout — kembalikan pesan error
            return@withContext RedeemResult(false, errorMessage = "Waktu tunggu habis. Coba buka aplikasi ulang atau hubungi bantuan.")
        }

    /**
     * Fallback: Panggil /api/redeem-direct dengan voucherCode + hwid.
     * Digunakan jika polling order tidak mendapat licenseKey setelah bayar.
     */
    suspend fun redeemDirect(voucherCode: String, context: Context): RedeemResult =
        withContext(Dispatchers.IO) {
            try {
                val hwid = LicenseManager.getHwid(context)
                val json = JSONObject().apply {
                    put("voucherCode", voucherCode)
                    put("hwid", hwid)
                }

                val body = json.toString().toRequestBody("application/json".toMediaType())
                val request = Request.Builder()
                    .url("$BASE_URL/redeem-direct")
                    .post(body)
                    .build()

                val response = client.newCall(request).execute()
                val responseBody = response.body?.string()

                if (response.isSuccessful && responseBody != null) {
                    val data = JSONObject(responseBody)
                    val licenseKey = data.optString("licenseKey", "")
                    if (licenseKey.isNotEmpty()) {
                        return@withContext RedeemResult(true, licenseKey)
                    }
                }

                val errorMsg = if (responseBody != null) {
                    JSONObject(responseBody).optString("error", "Gagal meredeem voucher")
                } else "Tidak ada respons dari server"
                return@withContext RedeemResult(false, errorMessage = errorMsg)

            } catch (e: Exception) {
                Log.e("PaymentHelper", "redeemDirect error", e)
                return@withContext RedeemResult(false, errorMessage = e.message)
            }
        }
}
