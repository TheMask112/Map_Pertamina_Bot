package com.mapbot.pertamina.util

object Constants {
    // === Website URLs ===
    const val MAP_URL = "https://subsiditepatlpg.mypertamina.id/merchant/app"
    const val LOGIN_URL = "https://subsiditepatlpg.mypertamina.id/merchant-login"

    // === CSS Selectors ===
    const val BTN_CATAT_PENJUALAN = "Catat Penjualan"
    const val INPUT_NIK = "input[placeholder='Masukkan 16 digit NIK Pelanggan']"
    const val BTN_LANJUTKAN = "LANJUTKAN PENJUALAN"
    const val BTN_CEK = "CEK PESANAN"
    const val BTN_PROSES = "PROSES PENJUALAN"

    // === Captcha Selectors ===
    const val CAPTCHA_POPUP_TEXT = "Cocokan Gambar untuk Proses Keamanan Penjualan"
    const val SLIDER_HANDLE = ".rc-slider-captcha-control-button"
    const val CAPTCHA_BG_IMG = ".rc-slider-captcha-jigsaw-bg"
    const val CAPTCHA_SLIDER_IMG = ".rc-slider-captcha-jigsaw-puzzle"
    const val BTN_GANTI_CAPTCHA = "Ganti"

    // === Success Keywords ===
    val SUCCESS_KEYWORDS = listOf("lunas", "berhasil", "penjualan berhasil", "sukses", "selesai")

    // === Timing ===
    const val MAX_RETRY = 3
    const val MAX_RETRY_CAPTCHA = 999
    const val CAPTCHA_OFFSET = 8.0f
    const val NIK_TIMEOUT_SEC = 60
    const val INTER_NIK_DELAY_MIN = 5
    const val INTER_NIK_DELAY_MAX = 15

    // === Status Constants ===
    const val STATUS_SUKSES = "SUKSES"
    const val STATUS_NIK_INVALID = "NIK TIDAK TERDAFTAR"
    const val STATUS_GAGAL_CAPTCHA = "GAGAL CAPTCHA"
    const val STATUS_ERROR = "ERROR SYSTEM"
    const val STATUS_BELUM = "BELUM"
    const val STATUS_SKIP = "DILEWATI"

    // === License ===
    const val LICENSE_API_URL = "https://map-pertamina-web.vercel.app/api"
    const val RSA_PUBLIC_KEY = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmXr6f7yQnssy07PjPxSV
sYiNMSYikhp6xtpSw4LLInqM2XruUO9ULZin6q5ZxKf+5p1JT+c8JagyjnfTO9XE
CVIgFQG4co2dDwur1Ax7kmcGOEmvpsweIHikUOU4qE3SHq/6qX/i6Eri/EdOpS3B
gEdOUokHqXm54g7abfoAZw8N6tttKl+xeqORXokz/n7n+CkZkEnFqgEknCXaHBJg
90wzoe+b67VQreSyEgw3RlfE0OXUi3HU6DfdL8I/KuI14RbXi9F9SkbEFs65xAIH
ccjKJoS7E4s/lmHS2hbZcPxr1XRMKObynZ1CpmTlu0VBkgfITwdAOFuYsr9y7KK8
OwIDAQAB
-----END PUBLIC KEY-----"""
}
