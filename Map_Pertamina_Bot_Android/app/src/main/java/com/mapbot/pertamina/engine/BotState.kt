package com.mapbot.pertamina.engine

enum class BotState {
    IDLE,
    LOGIN,
    HOME,
    CHOOSING_PELANGGAN,
    FILLING_NIK,
    CAPTCHA,
    VERIFYING,
    ERROR,
    FINISHED
}
