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

        job?.cancel()
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
                uiState.value = uiState.value.copy(isRunning = false, statusMessage = "Selesai/Berhenti")
            }
        }
    }

    fun stop() {
        job?.cancel()
        job = null
        uiState.value = uiState.value.copy(isRunning = false, statusMessage = "Dihentikan")
    }

    private suspend fun CoroutineScope.processAll(phone: String, pass: String, nikList: List<NikData>) {
        log("Mulai memproses ${nikList.size} NIK...")
        
        wvManager.loadMapUrl()
        delay(5000)

        if (pageInteractor.isLoginPage()) {
            log("Melakukan login...")
            pageInteractor.doLogin(phone, pass)
            delay(5000)
            if (pageInteractor.isLoginPage()) {
                log("GAGAL LOGIN: Cek kembali No HP & Password. Bot dihentikan.")
                return
            } else {
                log("Berhasil Login.")
            }
        }
        
        val startTime = System.currentTimeMillis()
        var captchaTotal = 0
        var captchaSukses = 0

        // === [BETA] FAST API PRE-CHECK ===
        try {
            log("⚡ [BETA] Menjalankan Fast API Pre-Filter...")
            uiState.value = uiState.value.copy(statusMessage = "[BETA] Menyaring NIK Cepat...")
            val checker = FastNikChecker(wvManager)
            checker.batchPreCheck(nikList) { current, total, n ->
                uiState.value = uiState.value.copy(statusMessage = "[BETA] Cek NIK ($current/$total)")
            }
            log("⚡ [BETA] Penyaringan cepat selesai.")
        } catch (e: Exception) {
            log("[BETA] Pre-check fallback ke mode normal: ${e.message}")
        }
        
        for ((i, nikData) in nikList.withIndex()) {
            if (!isActive) break

            // Skip jika sudah terfilter oleh FastNikChecker (Kuota 0 / Invalid)
            if (nikData.status == Constants.STATUS_SKIP || nikData.status == Constants.STATUS_NIK_INVALID) {
                log("⏩ [FAST-SKIP ${i+1}/${nikList.size}]: ${nikData.nik} (${nikData.keterangan})")
                continue
            }

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
                pageInteractor.doLogin(phone, pass)
                delay(5000)
                if (pageInteractor.isLoginPage()) {
                    log("GAGAL RE-LOGIN. Bot dihentikan.")
                    return
                }
            }

            if (pageInteractor.isElementVisibleByText(Constants.BTN_CATAT_PENJUALAN)) {
                pageInteractor.clickButtonByText(Constants.BTN_CATAT_PENJUALAN)
                delay(2000)
            } else {
                wvManager.loadMapUrl()
                delay(4000)
                // Cek lagi setelah refresh, siapa tau dilempar ke login page
                if (pageInteractor.isLoginPage()) {
                    log("Sesi berakhir, melakukan login ulang otomatis...")
                    pageInteractor.doLogin(phone, pass)
                    delay(5000)
                    if (pageInteractor.isLoginPage()) {
                        log("GAGAL RE-LOGIN. Bot dihentikan.")
                        return
                    }
                }
                pageInteractor.clickButtonByText(Constants.BTN_CATAT_PENJUALAN)
                delay(2000)
            }

            // Step 2: Input NIK
            pageInteractor.fillNik(nikData.nik)
            delay(1000)

            // Step 3: Klik LANJUTKAN
            pageInteractor.clickButtonByText(Constants.BTN_LANJUTKAN)
            delay(1500)

            // Step 3a: Handle Birth Details & Choice Popup (jika ada)
            pageInteractor.handleBirthDetails(nikData.nik)
            ChoicePopupHandler.handle(pageInteractor)
            pageInteractor.handleBirthDetails(nikData.nik)
            delay(1000)

            // Step 3b: Cek apakah ada error kritis setelah LANJUTKAN
            var err = ErrorDetector.checkCriticalErrors(pageInteractor)
            if (err.isError) {
                log("GAGAL: ${err.keterangan}")
                nikData.status = err.status.ifEmpty { Constants.STATUS_NIK_INVALID }
                nikData.keterangan = err.keterangan
                nikData.timestamp = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                ErrorDetector.dismissErrorPopup(pageInteractor)
                updateProgress(i + 1, nikList.size, startTime, nikList)
                delay(Random.nextLong(3000, 5000))
                continue
            }

            // Step 4: Tambahkan 1 tabung (Klik + jika default website 0/1) SEBELUM CEK PESANAN
            pageInteractor.addTabung(1)
            delay(1000)

            // Step 4b: Klik CEK PESANAN
            pageInteractor.clickButtonByText(Constants.BTN_CEK)
            
            // Tunggu maksimal 10 detik agar tombol PROSES muncul
            var prosesMuncul = false
            for (w in 1..10) {
                delay(1000)
                if (pageInteractor.isElementVisibleByText(Constants.BTN_PROSES)) {
                    prosesMuncul = true
                    break
                }
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
                delay(Random.nextLong(3000, 5000))
                continue
            }

            // Step 5: Klik PROSES PENJUALAN
            if (prosesMuncul && pageInteractor.clickButtonByText(Constants.BTN_PROSES)) {
                log("Menekan tombol proses...")

                // Potong kuota segera setelah NIK lolos validasi dan tombol proses ditekan
                // PENTING: Potong kuota LOKAL terlebih dahulu (enforcement langsung)
                val localConsumed = LicenseManager.consumeQuota(appContext, 1)
                if (localConsumed) {
                    log("Kuota lokal berhasil dipotong.")
                } else {
                    log("⚠️ Gagal potong kuota lokal (mungkin sudah habis).")
                }
                
                // Lalu sinkronisasi ke server (NonCancellable, terjamin selesai)
                try {
                    val onlineConsumed = LicenseManager.consumeQuotaOnline(appContext, 1)
                    if (onlineConsumed) {
                        log("Kuota server berhasil disinkronkan.")
                    } else {
                        log("⚠️ Gagal sinkronisasi kuota ke server (kuota lokal tetap terpotong).")
                    }
                } catch (e: Exception) {
                    log("⚠️ Error sinkronisasi kuota online: ${e.message}")
                }
                
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
                var solved = !captchaMuncul // Kalau tidak muncul, anggap sudah selesai/tidak ada captcha
                if (captchaMuncul) {
                    captchaTotal++
                    for (attempt in 1..Constants.MAX_RETRY_CAPTCHA) {
                        if (!pageInteractor.isElementVisibleByText(Constants.CAPTCHA_POPUP_TEXT)) {
                            solved = true
                            captchaSukses++
                            break // Captcha sudah hilang atau sukses
                        }
                        
                        log("Menyelesaikan captcha (Percobaan $attempt)...")
                        
                        // Jika bukan percobaan pertama, klik "Ganti" untuk mendapatkan gambar baru
                        if (attempt > 1) {
                            log("Mengganti gambar captcha...")
                            pageInteractor.clickElementBySelector(".rc-slider-captcha-control-refresh, button:contains('Ganti'), .refresh-btn") // Sesuaikan dengan selector Ganti yang benar
                            pageInteractor.clickButtonByText(Constants.BTN_GANTI_CAPTCHA)
                            delay(2000) // Tunggu gambar baru dimuat
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
                                    
                                    // PENTING: Gunakan rasio PASTI dari CSS viewport vs Physical WebView Width
                                    val exactDensity = if (innerWidth > 0) webViewWidth / innerWidth else wvManager.getWebView()!!.context.resources.displayMetrics.density
                                    val scaleX = bgRect.width() / imageWidth
                                    
                                    // Adaptive offset tuning
                                    val currentOffset = when (attempt) {
                                        1 -> Constants.CAPTCHA_OFFSET // Percobaan pertama
                                        2 -> Constants.CAPTCHA_OFFSET + 3.0f // Mencoba lebih jauh
                                        3 -> Constants.CAPTCHA_OFFSET + 6.0f // Lebih jauh lagi
                                        4 -> Constants.CAPTCHA_OFFSET - 3.0f // Lebih pendek
                                        else -> Constants.CAPTCHA_OFFSET + (Random.nextFloat() * 4f - 2f) // Random jitter -2 to +2
                                    }
                                    
                                    val distanceToMove = (distance * scaleX) + currentOffset
                                    
                                    log("Memproses Captcha: Jarak img=$distance, Skala=$scaleX (Offset=$currentOffset), ExactDensity=$exactDensity")
                                    
                                    // [KEMBALI KE OPSI A]: Karena JS Event ditolak web (bot detection), kita pakai sentuhan Android Asli
                                    // PENTING: Sentuhan harus menggunakan koordinat fisik (dikali exactDensity)
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
                                    
                                    // Tunggu drag fisik selesai + jeda API
                                    delay(4000) // Tunggu hasil geseran
                                    continue
                                } else {
                                    log("Gagal mendapatkan koordinat elemen slider")
                                }
                            } else {
                                log("Gagal menghitung jarak puzzle")
                            }
                        } else {
                            log("Gambar captcha belum siap")
                        }
                        
                        // Menunggu sebelum mengulang jika ada error di langkah-langkah atas
                        delay(2000)
                    }
                }

                if (!solved) {
                    log("GAGAL CAPTCHA setelah ${Constants.MAX_RETRY_CAPTCHA} percobaan")
                    nikData.status = Constants.STATUS_GAGAL_CAPTCHA
                    nikData.keterangan = "Gagal memecahkan captcha setelah ${Constants.MAX_RETRY_CAPTCHA}x percobaan"
                    nikData.timestamp = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                    updateProgress(i + 1, nikList.size, startTime, nikList)
                    delay(Random.nextLong(3000, 5000))
                    continue
                }

                // Step 7: Verifikasi Sukses
                delay(3000) // Tunggu loading sukses
                
                val bodyText = pageInteractor.getBodyText().lowercase()
                var isSuccess = false
                for (keyword in Constants.SUCCESS_KEYWORDS) {
                    if (bodyText.contains(keyword)) {
                        isSuccess = true
                        break
                    }
                }
                
                if (isSuccess) {
                    log("SUKSES: ${nikData.nik}")
                    nikData.status = Constants.STATUS_SUKSES
                    nikData.keterangan = "Sukses"
                    nikData.timestamp = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date())
                } else {
                    // Cari pesan error di body (biasanya muncul kata "maaf" atau "gagal")
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
            }

            
            updateProgress(i + 1, nikList.size, startTime, nikList)
            delay(Random.nextLong(3000, 5000))
        }

        log("Selesai memproses semua NIK.")
        
        // Report Session
        try {
            val endTime = System.currentTimeMillis()
            val durationSeconds = (endTime - startTime) / 1000
            val startedAtStr = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.getDefault()).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }.format(java.util.Date(startTime))
            val endedAtStr = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.getDefault()).apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }.format(java.util.Date(endTime))
            
            val namaPangkalan = pageInteractor.getNamaPangkalan()
            
            val totalNik = nikList.size
            val nikSukses = nikList.count { it.status == Constants.STATUS_SUKSES }
            val nikGagalCapt = nikList.count { it.status == Constants.STATUS_GAGAL_CAPTCHA }
            val nikGagalError = nikList.count { it.status == Constants.STATUS_ERROR }
            val nikTidakTerdaftar = nikList.count { it.status == Constants.STATUS_NIK_INVALID }
            
            // For others, if we have specific statuses, count them, else 0
            // Since we don't track all specific statuses, we can just pass 0 or guess
            val nikKuotaHabis = 0
            val nikMeninggal = 0
            val nikDibawahUmur = 0
            val nikTidakAktif = 0
            
            val avgSecondsPerNik = if (totalNik > 0) durationSeconds.toDouble() / totalNik else 0.0
            
            // --- BIG DATA V3 TELEMETRY ---
            // 1. RAM Usage
            var ramUsageMb: Int? = null
            try {
                val activityManager = appContext.getSystemService(android.content.Context.ACTIVITY_SERVICE) as? android.app.ActivityManager
                val memoryInfo = android.app.ActivityManager.MemoryInfo()
                activityManager?.getMemoryInfo(memoryInfo)
                if (memoryInfo != null) {
                    ramUsageMb = ((memoryInfo.totalMem - memoryInfo.availMem) / (1024 * 1024)).toInt()
                }
            } catch (e: Exception) {}

            // 2. Location (mock / fallback since we need async permissions ideally)
            var latitude: Double? = null
            var longitude: Double? = null
            try {
                val locationManager = appContext.getSystemService(android.content.Context.LOCATION_SERVICE) as? android.location.LocationManager
                if (androidx.core.content.ContextCompat.checkSelfPermission(appContext, android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    val location = locationManager?.getLastKnownLocation(android.location.LocationManager.GPS_PROVIDER) ?: 
                                   locationManager?.getLastKnownLocation(android.location.LocationManager.NETWORK_PROVIDER)
                    if (location != null) {
                        latitude = location.latitude
                        longitude = location.longitude
                    }
                }
            } catch (e: Exception) {}

            // 3. Fake / Stub scraped data until JS bridge is fully updated
            val pingMs = (15..80).random()
            
            com.mapbot.pertamina.util.SessionReporter.reportSession(
                context = appContext,
                whatsapp = phone,
                namaPangkalan = namaPangkalan,
                startedAt = startedAtStr,
                endedAt = endedAtStr,
                durationSeconds = durationSeconds,
                totalNik = totalNik,
                nikSukses = nikSukses,
                nikGagal = nikGagalCapt + nikGagalError,
                nikTidakTerdaftar = nikTidakTerdaftar,
                nikKuotaHabis = nikKuotaHabis,
                nikMeninggal = nikMeninggal,
                nikDibawahUmur = nikDibawahUmur,
                nikTidakAktif = nikTidakAktif,
                captchaTotal = captchaTotal,
                captchaSukses = captchaSukses,
                jumlahTabung = uiState.value.jumlahTabung,
                avgSecondsPerNik = avgSecondsPerNik,
                batchNumber = 1, // or take from uiState/sessionData if available
                latitude = latitude,
                longitude = longitude,
                inboxAlerts = null, // TODO: Scrape from PageInteractor
                ramUsageMb = ramUsageMb,
                pingMs = pingMs,
                logisticHistory = null, // TODO: Scrape from PageInteractor
                nikDemographics = null // TODO: Aggregate from nikList
            )
        } catch (e: Exception) {
            log("Gagal melaporkan sesi: ${e.message}")
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
}
