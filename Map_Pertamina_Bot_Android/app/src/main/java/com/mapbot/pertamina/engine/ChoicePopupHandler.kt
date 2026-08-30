package com.mapbot.pertamina.engine

import android.util.Log
import kotlinx.coroutines.delay

object ChoicePopupHandler {
    suspend fun handle(pageInteractor: PageInteractor) {
        // 1. Pastikan BUKAN modal update data pelanggan sebelum menangani popup NIB
        val isUpdateModal = pageInteractor.isElementVisibleByText("UPDATE DATA PELANGGAN") || 
                            pageInteractor.isElementVisibleByText("UPDATE DATA") ||
                            pageInteractor.isElementVisibleByText("PERBARUI DATA PELANGGAN") ||
                            pageInteractor.pageContainsText("data pelanggan belum lengkap") ||
                            pageInteractor.pageContainsText("lengkapi data pelanggan")

        if (!isUpdateModal) {
            val isNibModal = pageInteractor.pageContainsText("Segera Lengkapi NIB") || 
                             pageInteractor.pageContainsText("Lengkapi NIB") ||
                             pageInteractor.isElementVisibleByText("NANTI SAJA, LANJUT PENJUALAN") ||
                             pageInteractor.isElementVisibleByText("NANTI SAJA, LANJUTKAN PENJUALAN")

            if (isNibModal) {
                Log.d("ChoicePopup", "Modal 'Segera Lengkapi NIB' terdeteksi. Mengklik NANTI SAJA, LANJUT PENJUALAN...")
                pageInteractor.dismissKeyboard()
                val clicked = pageInteractor.clickButtonByText("NANTI SAJA, LANJUT PENJUALAN") ||
                              pageInteractor.clickButtonByText("NANTI SAJA, LANJUTKAN PENJUALAN")
                if (clicked) {
                    delay(1200)
                }
            }
        }

        // 2. Cek Modal "Pelanggan Terdaftar" / Pilihan Jenis Pelanggan
        val popupTexts = listOf("Pelanggan Terdaftar", "pilihan jenis pelanggan", "TEKAN pilihan jenis")
        var isPopup = false

        for (text in popupTexts) {
            if (pageInteractor.pageContainsText(text)) {
                isPopup = true
                break
            }
        }

        if (isPopup) {
            Log.d("ChoicePopup", "Popup jenis pelanggan terdeteksi")

            var chosenType = ""
            for (opt in listOf("Rumah Tangga", "Usaha Mikro")) {
                if (pageInteractor.clickButtonByText(opt)) {
                    chosenType = opt
                    Log.d("ChoicePopup", "Memilih: $opt")
                    delay(800)
                    break
                }
            }

            if (chosenType == "Usaha Mikro") {
                val nibSelectors = listOf("input[placeholder*='NIB']", "input[placeholder*='Pilih NIB']", "input[placeholder*='Pilih Usaha']", "div[class*='select']")
                for (sel in nibSelectors) {
                    if (pageInteractor.isElementVisible(sel)) {
                        pageInteractor.clickElementBySelector(sel)
                        delay(800)
                        val optionSelectors = listOf("div[role='option']", "li[role='option']", "[class*='option']")
                        for (optSel in optionSelectors) {
                            if (pageInteractor.clickElementBySelector(optSel)) {
                                delay(500)
                                break
                            }
                        }
                        break
                    }
                }
            }

            for (btn in listOf("LANJUTKAN TRANSAKSI", "LANJUTKAN PENJUALAN", "Lanjutkan")) {
                if (pageInteractor.clickButtonByText(btn)) {
                    delay(500)
                    break
                }
            }
        }
    }
}
