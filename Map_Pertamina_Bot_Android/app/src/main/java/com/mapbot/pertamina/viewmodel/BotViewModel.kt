package com.mapbot.pertamina.viewmodel

import androidx.lifecycle.ViewModel
import com.mapbot.pertamina.data.BotUiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class BotViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(BotUiState())
    val uiState: StateFlow<BotUiState> = _uiState.asStateFlow()

    fun startBot() {
        _uiState.value = _uiState.value.copy(
            isRunning = true,
            isPaused = false,
            statusMessage = "Memulai bot..."
        )
    }

    fun pauseBot() {
        _uiState.value = _uiState.value.copy(
            isPaused = true,
            statusMessage = "Bot dijeda."
        )
    }

    fun stopBot() {
        _uiState.value = _uiState.value.copy(
            isRunning = false,
            isPaused = false,
            statusMessage = "Bot dihentikan."
        )
    }

    fun log(message: String) {
        val currentLogs = _uiState.value.logs.toMutableList()
        currentLogs.add(message)
        _uiState.value = _uiState.value.copy(logs = currentLogs)
    }
}
