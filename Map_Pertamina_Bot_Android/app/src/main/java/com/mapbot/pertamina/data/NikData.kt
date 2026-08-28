package com.mapbot.pertamina.data

import com.mapbot.pertamina.util.Constants

data class NikData(
    val index: Int,
    val nik: String,
    var status: String = Constants.STATUS_BELUM,
    var keterangan: String = "",
    var timestamp: String = "",
    var batch: String = ""
)

data class BotUiState(
    val isRunning: Boolean = false,
    val isPaused: Boolean = false,
    val nikList: List<NikData> = emptyList(),
    val currentNikIndex: Int = -1,
    val totalNik: Int = 0,
    val processedCount: Int = 0,
    val successCount: Int = 0,
    val failedCount: Int = 0,
    val invalidCount: Int = 0,
    val estimatedTimeSeconds: Int = -1,
    val logs: List<String> = emptyList(),
    val statusMessage: String = "Siap",
    val jumlahTabung: Int = 1,
    val isLoggedIn: Boolean = false,
    val licenseValid: Boolean = false,
    val remainingQuota: Int = 0,
    val showWebView: Boolean = true
)
