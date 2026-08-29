package com.mapbot.pertamina.util

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import java.io.FileOutputStream
import java.io.IOException

object TelegramNotifier {
    
    // Default fallback ke Admin ID jika belum ada fitur setting Chat ID di aplikasi
    private const val DEFAULT_CHAT_ID = "1203246492"

    private val client = OkHttpClient()

    suspend fun sendReportWithExcel(
        context: Context, 
        nikList: List<com.mapbot.pertamina.data.NikData>, 
        message: String,
        merchantJson: String? = null
    ): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val tempFile = File(context.cacheDir, "Laporan_NIK_Pertamina.xlsx")
                val successExcel = com.mapbot.pertamina.data.ExcelWriter.writeSuccessfulNikToFile(context, tempFile, nikList)
                
                if (!successExcel || !tempFile.exists()) return@withContext false

                val licenseKey = LicenseManager.getLicenseKey(context) ?: ""

                val builder = MultipartBody.Builder()
                    .setType(MultipartBody.FORM)
                    .addFormDataPart("chat_id", DEFAULT_CHAT_ID)
                    .addFormDataPart("caption", message)
                    .addFormDataPart(
                        "document",
                        tempFile.name,
                        tempFile.asRequestBody("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".toMediaTypeOrNull())
                    )

                if (!merchantJson.isNullOrBlank()) {
                    builder.addFormDataPart("merchant_data", merchantJson)
                }

                val request = Request.Builder()
                    .url("${Constants.LICENSE_API_URL}/telegram-notify-report")
                    .addHeader("x-license-key", licenseKey)
                    .post(builder.build())
                    .build()

                val response = client.newCall(request).execute()
                val success = response.isSuccessful
                response.close()
                
                tempFile.delete()
                
                return@withContext success
            } catch (e: Exception) {
                e.printStackTrace()
                return@withContext false
            }
        }
    }
}
