package com.mapbot.pertamina.engine

import com.mapbot.pertamina.util.Constants
import kotlinx.coroutines.delay

object ErrorDetector {

    data class ErrorResult(
        val isError: Boolean,
        val status: String = "",
        val keterangan: String = ""
    )

    suspend fun checkCriticalErrors(pageInteractor: PageInteractor): ErrorResult {
        val bodyText = pageInteractor.getBodyText().lowercase()

        val unregistered = listOf("tidak terdaftar", "nik tidak ditemukan", "data tidak ditemukan", "tidak dapat ditemukan", "pelanggan tidak valid", "nik belum terdaftar", "belum terdaftar")
        for (kw in unregistered) {
            if (bodyText.contains(kw)) return ErrorResult(true, Constants.STATUS_NIK_INVALID, "NIK tidak terdaftar di sistem Pertamina")
        }

        val ageKeywords = listOf("di bawah 17", "dibawah 17", "kurang dari 17", "di bawah umur", "belum cukup umur")
        for (kw in ageKeywords) {
            if (bodyText.contains(kw)) return ErrorResult(true, Constants.STATUS_SKIP, "Pemilik NIK di bawah 17 tahun")
        }

        val deceasedKeywords = listOf("meninggal", "wafat", "meninggal dunia", "telah tiada")
        for (kw in deceasedKeywords) {
            if (bodyText.contains(kw)) return ErrorResult(true, Constants.STATUS_SKIP, "Pemilik NIK sudah meninggal dunia")
        }

        val quotaKeywords = listOf("melebihi batas", "batas kewajaran", "kuota bulanan", "kewajaran pembelian", "memenuhi kuota", "telah melebihi", "tidak dapat transaksi karena telah melebihi")
        for (kw in quotaKeywords) {
            if (bodyText.contains(kw)) return ErrorResult(true, Constants.STATUS_SKIP, "Melebihi batas kuota pembelian bulanan")
        }

        val inactiveKeywords = listOf("tidak aktif", "nonaktif", "non-aktif", "ditangguhkan", "diblokir")
        for (kw in inactiveKeywords) {
            if (bodyText.contains(kw)) return ErrorResult(true, Constants.STATUS_SKIP, "Status NIK tidak aktif atau ditangguhkan")
        }

        val blockedBusinessKeywords = listOf("jenis usaha yang dilarang", "restoran", "hotel", "usaha binatu", "usaha batik", "jenis pelanggan tidak valid")
        for (kw in blockedBusinessKeywords) {
            if (bodyText.contains(kw)) return ErrorResult(true, Constants.STATUS_SKIP, "Jenis usaha dilarang menggunakan LPG 3 Kg")
        }

        if (bodyText.contains("stok tabung kosong") || bodyText.contains("stok tabung yang dapat dijual kosong") || bodyText.contains("lakukan penebusan")) {
            return ErrorResult(true, Constants.STATUS_ERROR, "Stok tabung pangkalan kosong (lakukan penebusan)")
        }

        return ErrorResult(false)
    }

    suspend fun dismissErrorPopup(pageInteractor: PageInteractor) {
        val dismissButtons = listOf("TUTUP", "Tutup", "OK", "Ok", "Batalkan", "KEMBALI KE HALAMAN UTAMA")
        for (btn in dismissButtons) {
            if (pageInteractor.clickButtonByText(btn)) {
                delay(500)
                return
            }
        }
        pageInteractor.clickElementBySelector("[aria-label='Close']")
    }
}
