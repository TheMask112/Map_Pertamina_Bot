package com.mapbot.pertamina.engine

import android.content.Context
import com.mapbot.pertamina.captcha.CaptchaExtractor
import com.mapbot.pertamina.captcha.CaptchaSolver
import com.mapbot.pertamina.captcha.TouchSimulator
import com.mapbot.pertamina.data.NikData
import com.mapbot.pertamina.util.Constants
import com.mapbot.pertamina.util.LicenseManager
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import android.util.Log
import kotlin.random.Random

class BotEngine(
    private val wvManager: WebViewManager,
    private val pageInteractor: PageInteractor,
    private val uiState: MutableStateFlow<com.mapbot.pertamina.data.BotUiState>,
    private val appContext: Context
) {
    private var job: Job? = null
    @Volatile private var isPaused = false
    private val captchaExtractor = CaptchaExtractor(wvManager)
    private val captchaSolver = CaptchaSolver()
    private val touchSimulator = TouchSimulator(wvManager.getWebView()!!)

    fun start(phone: String, pass: String, nikList: List<NikData>) {
        if (nikList.isEmpty()) {
            log("Daftar NIK kosong!")
            return
        }

        // CEK KUOTA SEBELUM MULAI
        val licenseStatus = LicenseManager.getLicenseStatus(appContext)
        if (!licenseStatus.isValid) {
            log("KUOTA HABIS atau LISENSI TIDAK VALID: ${licenseStatus.message}. Bot tidak bisa dimulai.")
            uiState.value = uiState.value.copy(statusMessage = "Kuota Habis / Lisensi Tidak Valid")
            return
        }
        val sisaKuota = licenseStatus.totalQuota - licenseStatus.usedQuota
        log("Sisa kuota: $sisaKuota tabung (terpakai: ${licenseStatus.usedQuota}/${licenseStatus.totalQuota})")

        if (isPaused) {
            resume()
            return
        }

        job?.cancel()
        isPaused = false
        uiState.value = uiState.value.copy(isRunning = true, isPaused = false, statusMessage = "Mulai...")
        job = CoroutineScope(Dispatchers.Main).launch {
            try {
                processAll(phone, pass, nikList)
                
                // Telegram Notification
                val ctx = wvManager.getWebView()?.context
                if (ctx != null) {
                    val sCount = uiState.value.successCount
                    val fCount = uiState.value.failedCount
                    val iCount = uiState.value.invalidCount
                    val msg = "✅ TUGAS SELESAI\n\nSukses: $sCount\nGagal: $fCount\nInvalid: $iCount\n\nFile Excel terlampir."
                    log("Mengirim laporan ke Telegram...")
                    val sent = com.mapbot.pertamina.util.TelegramNotifier.sendReportWithExcel(ctx, nikList, msg)
                    if (sent) log("Laporan Telegram berhasil dikirim!")
                    else log("Gagal mengirim laporan Telegram.")
                }
            } catch (e: CancellationException) {
                log("Bot dihentikan oleh user")
            } catch (e: Exception) {
                log("Error kritis: ${e.message}")
            } finally {
                uiState.value = uiState.value.copy(isRunning = false, isPaused = false, statusMessage = "Selesai/Berhenti")
            }
        }
    }

    fun pause() {
        isPaused = true
        uiState.value = uiState.value.copy(isPaused = true, statusMessage = "Dijeda")
        log("⏸ Bot dijeda oleh pengguna.")
    }

    fun resume() {
        isPaused = false
        uiState.value = uiState.value.copy(isPaused = false, statusMessage = "Melanjutkan...")
        log("▶ Melanjutkan pengerjaan bot...")
    }

    fun stop() {
        isPaused = false
        job?.cancel()
        job = null
        uiState.value = uiState.value.copy(isRunning = false, isPaused = false, statusMessage = "Dihentikan")
        log("🛑 Bot dihentikan.")
    }

    private suspend fun CoroutineScope.processAll(phone: String, pass: String, nikList: List<NikData>) {
        log("Mulai memproses ${nikList.size} NIK...")
        
        val credStore = com.mapbot.pertamina.security.CredentialStore(appContext)
        val effectivePhone = if (phone.isNotBlank()) phone else credStore.getPhone()
        val effectivePass = if (pass.isNotBlank()) pass else credStore.getPass()

        wvManager.loadMapUrl()
        delay(5000)

        if (pageInteractor.isLoginPage()) {
            log("Melakukan login otomatis pangkalan...")
            pageInteractor.doLogin(effectivePhone, effectivePass)
            delay(5000)
            if (pageInteractor.isLoginPage()) {
                log("GAGAL LOGIN: Cek kembali No HP & Password pada profil pangkalan. Bot dihentikan.")
                return
            } else {
                log("Berhasil Login.")
                reportTelemetryInBackground(effectivePhone, nikList.size)
            }
        }
        
        val startTime = System.currentTimeMillis()
        
        for ((i, nikData) in nikList.withIndex()) {
            if (!isActive) break

            // Skip yang sudah selesai diproses sebelumnya
            if (nikData.status == Constants.STATUS_SUKSES || nikData.status == Constants.STATUS_SKIP || nikData.status == Constants.STATUS_NIK_INVALID) {
                continue
            }

            // Check pause loop
            while (isPaused && isActive) {
                delay(500)
            }
            if (!isActive) break

            // === CEK KUOTA SEBELUM SETIAP NIK ===
            val currentLicenseStatus = LicenseManager.getLicenseStatus(appContext)
            if (!currentLicenseStatus.isValid) {
                log("⛔ KUOTA HABIS! Sisa: 0. Bot dihentikan otomatis.")
                uiState.value = uiState.value.copy(statusMessage = "Kuota Habis - Bot Dihentikan")
                break
            }
            val sisaSekarang = currentLicenseStatus.totalQuota - currentLicenseStatus.usedQuota
            log("=== Memproses [${i+1}/${nikList.size}]: ${nikData.nik} (Sisa kuota: $sisaSekarang) ===")
            
            // Cek apakah tiba-tiba keluar / session expired
            if (pageInteractor.isLoginPage()) {
                log("Sesi berakhir, melakukan login ulang otomatis...")
                pageInteractor.doLogin(effectivePhone, effectivePass)
                delay(5000)
                if (pageInteractor.isLoginPage()) {
                    log("GAGAL RE-LOGIN: Cek kembali No HP & Password. Bot dihentikan.")
                    return
                }
            }

            // Step 1: Navigasi ke Catat Penjualan
            if (!pageInteractor.isElementVisibleByText(Constants.BTN_CATAT_PENJUALAN)) {
                wvManager.loadMapUrl()
                delay(4000)
                if (pageInteractor.isLoginPage()) {
                    pageInteractor.doLogin(effectivePhone, effectivePass)
                    delay(4500)
                }
            }

            var clickedCatat = false
            for (w in 1..6) {
                if (pageInteractor.isElementVisibleByText(Constants.BTN_CATAT_PENJUALAN)) {
                    pageInteractor.clickButtonByText(Constants.BTN_CATAT_PENJUALAN)
                    clickedCatat = true
                    delay(1500)
                    break
                }
                delay(800)
            }
            if (!clickedCatat) {
                pageInteractor.clickButtonByText(Constants.BTN_CATAT_PENJUALAN)
                delay(1500)
            }

            // Step 2: Input NIK
            log("Memasukkan NIK: ${nikData.nik}...")
            pageInteractor.fillNik(nikData.nik)
            delay(800)

            // Step 3: Klik LANJUTKAN PENJUALAN
            log("Menekan tombol Lanjutkan Penjualan...")
            pageInteractor.clickLanjutkan()
            delay(1500)

            // Step 3a: Handle Birth Details & Modals
            log("Memeriksa modal & data pelanggan...")
            pageInteractor.handleBirthDetails(nikData.nik)
            ChoicePopupHandler.handle(pageInteractor)

            // Tunggu hingga layar penjualan (CEK PESANAN) muncul atau error terdeteksi
            var reachedSales = false
            for (waitSec in 1..15) {
                if (pageInteractor.isElementVisibleByText(Constants.BTN_CEK) || pageInteractor.isElementVisibleByText("CEK PESANAN")) {
                    reachedSales = true
                    break
                }
                // Cek lagi jika ada modal yang tertinggal
                pageInteractor.handleBirthDetails(nikData.nik)
                ChoicePopupHandler.handle(pageInteractor)
                
                val checkErr = ErrorDetector.checkCriticalErrors(pageInteractor)
                if (checkErr.isError) break
                delay(1000)
            }

            // Step 3b: Cek apakah ada error kritis setelah LANJUTKAN
            var err = ErrorDetector.checkCriticalErrors(pageInteractor)
            if (err.isError) {
                log("GAGAL: ${err.keterangan}")
                nikData.status = err.status.ifEmpty { Constants.STATUS_NIK_INVALID }
                nikData.keterangan = err.keterangan
                nikData.timestamp = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                ErrorDetector.dismissErrorPopup(pageInteractor)
                updateProgress(i + 1, nikList.size, startTime, nikList)
                delay(Random.nextLong(2000, 4000))
                continue
            }

            if (!reachedSales) {
                // Percobaan klik tombol SELANJUTNYA / CEK PESANAN sekali lagi
                pageInteractor.clickButtonByText(Constants.BTN_CEK)
                delay(1000)
            }

            // Step 4: Tambahkan 1 tabung SEBELUM CEK PESANAN
            pageInteractor.addTabung(1)
            delay(600)

            // Step 4b: Klik CEK PESANAN
            pageInteractor.clickButtonByText(Constants.BTN_CEK)
            delay(1000)
            
            // Tunggu maksimal 12 detik agar tombol PROSES muncul, retry CEK jika belum muncul
            var prosesMuncul = false
            for (w in 1..12) {
                if (pageInteractor.isElementVisibleByText(Constants.BTN_PROSES) || 
                    pageInteractor.isElementVisibleByText("PROSES PENJUALAN") ||
                    pageInteractor.isElementVisibleByText("PROSES PESANAN") ||
                    pageInteractor.isElementVisibleByText("PROSES")) {
                    prosesMuncul = true
                    break
                }
                if (w == 4 || w == 8) {
                    pageInteractor.clickButtonByText(Constants.BTN_CEK)
                }
                delay(1000)
            }

            // Cek lagi apakah ada error setelah CEK PESANAN
            err = ErrorDetector.checkCriticalErrors(pageInteractor)
            if (err.isError) {
                log("GAGAL: ${err.keterangan} (setelah Cek Pesanan)")
                nikData.status = err.status.ifEmpty { Constants.STATUS_ERROR }
                nikData.keterangan = err.keterangan
                nikData.timestamp = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                ErrorDetector.dismissErrorPopup(pageInteractor)
                updateProgress(i + 1, nikList.size, startTime, nikList)
                delay(Random.nextLong(2000, 4000))
                continue
            }

            // Step 5: Klik PROSES PENJUALAN
            val clickedProses = prosesMuncul && (
                pageInteractor.clickButtonByText(Constants.BTN_PROSES) || 
                pageInteractor.clickButtonByText("PROSES PENJUALAN") ||
                pageInteractor.clickButtonByText("PROSES PESANAN") ||
                pageInteractor.clickButtonByText("PROSES")
            )

            if (clickedProses) {
                log("Menekan tombol PROSES PENJUALAN...")

                // Potong kuota lokal & sinkronisasi
                val localConsumed = LicenseManager.consumeQuota(appContext, 1)
                if (localConsumed) {
                    log("Kuota lokal berhasil dipotong.")
                }
                
                try {
                    LicenseManager.consumeQuotaOnline(appContext, 1)
                } catch (_: Exception) {}
                
                // Tunggu maksimal 10 detik agar Captcha muncul
                var captchaMuncul = false
                for (w in 1..10) {
                    delay(1000)
                    if (pageInteractor.isElementVisibleByText(Constants.CAPTCHA_POPUP_TEXT)) {
                        captchaMuncul = true
                        break
                    }
                }
                
                // Step 6: Solve Captcha (Jika muncul)
                var solved = !captchaMuncul
                if (captchaMuncul) {
                    for (attempt in 1..Constants.MAX_RETRY_CAPTCHA) {
                        if (!pageInteractor.isElementVisibleByText(Constants.CAPTCHA_POPUP_TEXT)) {
                            solved = true
                            break
                        }
                        
                        log("Menyelesaikan captcha (Percobaan $attempt)...")
                        
                        if (attempt > 1) {
                            pageInteractor.clickButtonByText(Constants.BTN_GANTI_CAPTCHA)
                            delay(2000)
                        }

                        val images = captchaExtractor.extractCaptchaImages()
                        if (images != null && images.first.isNotEmpty()) {
                            val solverResult = captchaSolver.solveCaptchaBase64(images.first, images.second)
                            
                            if (solverResult != null) {
                                val distance = solverResult.first
                                val imageWidth = solverResult.second
                                
                                val bgRect = captchaExtractor.getBgImageRect()
                                val handleData = captchaExtractor.getSliderHandleRect()
                                if (bgRect != null && handleData != null) {
                                    val handleRect = handleData.first
                                    val innerWidth = handleData.second
                                    val webViewWidth = wvManager.getWebView()!!.width.toFloat()
                                    
                                    val exactDensity = if (innerWidth > 0) webViewWidth / innerWidth else wvManager.getWebView()!!.context.resources.displayMetrics.density
                                    val scaleX = bgRect.width() / imageWidth
                                    
                                    val currentOffset = when (attempt) {
                                        1 -> Constants.CAPTCHA_OFFSET
                                        2 -> Constants.CAPTCHA_OFFSET + 3.0f
                                        3 -> Constants.CAPTCHA_OFFSET + 6.0f
                                        4 -> Constants.CAPTCHA_OFFSET - 3.0f
                                        else -> Constants.CAPTCHA_OFFSET + (Random.nextFloat() * 4f - 2f)
                                    }
                                    
                                    val distanceToMove = (distance * scaleX) + currentOffset
                                    log("Memproses Captcha: Jarak img=$distance, Skala=$scaleX (Offset=$currentOffset)")
                                    
                                    val physicalStartX = handleRect.centerX() * exactDensity
                                    val physicalStartY = handleRect.centerY() * exactDensity
                                    val physicalEndX = (handleRect.centerX() + distanceToMove) * exactDensity
                                    val physicalEndY = handleRect.centerY() * exactDensity
                                    
                                    touchSimulator.dragHumanLike(
                                        startX = physicalStartX,
                                        startY = physicalStartY,
                                        endX = physicalEndX,
                                        endY = physicalEndY
                                    )
                                    
                                    delay(4000)
                                    continue
                                }
                            }
                        }
                        delay(2000)
                    }
                }

                if (!solved) {
                    log("GAGAL CAPTCHA setelah ${Constants.MAX_RETRY_CAPTCHA} percobaan")
                    nikData.status = Constants.STATUS_GAGAL_CAPTCHA
                    nikData.keterangan = "Gagal memecahkan captcha"
                    nikData.timestamp = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                    updateProgress(i + 1, nikList.size, startTime, nikList)
                    delay(Random.nextLong(2000, 4000))
                    continue
                }

                // Step 7: Verifikasi Sukses
                delay(3000)
                
                val bodyText = pageInteractor.getBodyText().lowercase()
                var isSuccess = false
                for (keyword in Constants.SUCCESS_KEYWORDS) {
                    if (bodyText.contains(keyword)) {
                        isSuccess = true
                        break
                    }
                }
                
                if (isSuccess) {
                    log("✅ SUKSES LUNAS: ${nikData.nik}")
                    nikData.status = Constants.STATUS_SUKSES
                    nikData.keterangan = "Sukses"
                    nikData.timestamp = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                } else {
                    val fullText = pageInteractor.getBodyText()
                    val lines = fullText.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
                    var errorMsg = "Tidak ada notifikasi sukses."
                    for (line in lines) {
                        if (line.lowercase().contains("maaf") || line.lowercase().contains("gagal") || line.lowercase().contains("tidak dapat")) {
                            errorMsg = line
                            break
                        }
                    }
                    log("GAGAL MEMPROSES: $errorMsg (${nikData.nik})")
                    nikData.status = Constants.STATUS_ERROR
                    nikData.keterangan = errorMsg
                    nikData.timestamp = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                    ErrorDetector.dismissErrorPopup(pageInteractor)
                }
            } else {
                log("Gagal menemukan/klik tombol proses untuk NIK: ${nikData.nik}")
                nikData.status = Constants.STATUS_ERROR
                nikData.keterangan = "Timeout: Tombol proses tidak ditemukan"
                nikData.timestamp = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                ErrorDetector.dismissErrorPopup(pageInteractor)
            }

            updateProgress(i + 1, nikList.size, startTime, nikList)
            delay(Random.nextLong(2000, 4000))
        }

        log("Selesai memproses semua NIK.")

        // === AUTO-BATCH QUEUE PROGRESSION (ENTERPRISE) ===
        if (com.mapbot.pertamina.data.SessionData.isBatchQueueActive &&
            com.mapbot.pertamina.data.SessionData.currentQueueIndex + 1 < com.mapbot.pertamina.data.SessionData.batchQueue.size) {
            com.mapbot.pertamina.data.SessionData.currentQueueIndex++
            val nextItem = com.mapbot.pertamina.data.SessionData.batchQueue[com.mapbot.pertamina.data.SessionData.currentQueueIndex]
            val totalQueue = com.mapbot.pertamina.data.SessionData.batchQueue.size
            val currentIdx = com.mapbot.pertamina.data.SessionData.currentQueueIndex + 1

            log("🎉 [ANTREAN BATCH $currentIdx/$totalQueue] Beralih otomatis ke Pangkalan: ${nextItem.profile.name}...")
            uiState.value = uiState.value.copy(statusMessage = "Beralih ke ${nextItem.profile.name} ($currentIdx/$totalQueue)")
            delay(4000)

            com.mapbot.pertamina.data.SessionData.phone = nextItem.profile.phone
            com.mapbot.pertamina.data.SessionData.pass = nextItem.profile.pass
            com.mapbot.pertamina.data.SessionData.loadedNikList = nextItem.nikList

            processAll(nextItem.profile.phone, nextItem.profile.pass, nextItem.nikList)
        } else {
            if (com.mapbot.pertamina.data.SessionData.isBatchQueueActive) {
                log("🎉 SELURUH ANTREAN BATCH PANGKALAN BERHASIL DISELESAIKAN!")
                uiState.value = uiState.value.copy(statusMessage = "Semua Pangkalan Selesai!")
                com.mapbot.pertamina.data.SessionData.isBatchQueueActive = false
            }
        }
    }

    private fun log(message: String) {
        Log.d("MapBot", message)
        val time = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
        val stampedMessage = "[$time] $message"
        
        val currentLogs = uiState.value.logs.toMutableList()
        currentLogs.add(0, stampedMessage)
        if (currentLogs.size > 100) currentLogs.removeLast()
        uiState.value = uiState.value.copy(logs = currentLogs)
    }

    private fun updateProgress(processed: Int, total: Int, startTime: Long, nikList: List<NikData>) {
        val elapsed = System.currentTimeMillis() - startTime
        val avgTimePerNik = if (processed > 0) elapsed / processed else 15000L
        val remaining = total - processed
        val estimatedSec = (remaining * avgTimePerNik) / 1000
        
        val success = nikList.count { it.status == Constants.STATUS_SUKSES }
        val invalid = nikList.count { it.status == Constants.STATUS_NIK_INVALID }
        val error = nikList.count { it.status == Constants.STATUS_GAGAL_CAPTCHA || it.status == Constants.STATUS_ERROR }
        
        uiState.value = uiState.value.copy(
            totalNik = total,
            processedCount = processed,
            successCount = success,
            failedCount = error,
            invalidCount = invalid,
            estimatedTimeSeconds = estimatedSec.toInt()
        )
    }

    private fun reportTelemetryInBackground(phone: String, nikListSize: Int) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val credStore = com.mapbot.pertamina.security.CredentialStore(appContext)
                val activePangkalan = credStore.getActiveProfile()
                val pName = activePangkalan?.name ?: "Pangkalan Android"
                val hwid = LicenseManager.getHwid(appContext)
                val prefs = appContext.getSharedPreferences("MapPertaminaLicense", Context.MODE_PRIVATE)
                val licenseKey = prefs.getString("license_key", "") ?: ""

                val deviceModel = "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}"
                val deviceOs = "Android ${android.os.Build.VERSION.RELEASE} (SDK ${android.os.Build.VERSION.SDK_INT})"

                val jsonPayload = org.json.JSONObject()
                jsonPayload.put("hwid", hwid)
                jsonPayload.put("license_key", licenseKey)
                jsonPayload.put("merchant_name", pName)
                jsonPayload.put("phone", phone)
                jsonPayload.put("platform", "ANDROID")
                jsonPayload.put("device_model", deviceModel)
                jsonPayload.put("device_os", deviceOs)
                jsonPayload.put("app_version", "1.0.9")
                jsonPayload.put("total_nik_processed", nikListSize)
                jsonPayload.put("kuota_pertamina_bulanan", 2500)
                jsonPayload.put("het_daerah", 19000L)

                val url = java.net.URL("https://map-pertamina-web.vercel.app/api/telemetry/report")
                val conn = url.openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Content-Type", "application/json; utf-8")
                conn.setRequestProperty("User-Agent", "MapBot-Android/1.0.9")
                conn.doOutput = true
                conn.connectTimeout = 6000
                conn.readTimeout = 6000

                val os = conn.outputStream
                os.write(jsonPayload.toString().toByteArray(Charsets.UTF_8))
                os.flush()
                os.close()

                val code = conn.responseCode
                conn.disconnect()
                Log.d("MapBot", "[TELEMETRY] Report status: $code")
            } catch (e: Exception) {
                Log.w("MapBot", "[TELEMETRY] Warn: ${e.message}")
            }
        }
    }
}
