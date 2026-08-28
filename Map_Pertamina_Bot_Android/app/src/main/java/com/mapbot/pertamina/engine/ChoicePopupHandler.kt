package com.mapbot.pertamina.engine

import android.util.Log
import kotlinx.coroutines.delay

object ChoicePopupHandler {
    suspend fun handle(pageInteractor: PageInteractor) {
        val popupTexts = listOf("Pelanggan Terdaftar", "pilihan jenis pelanggan", "TEKAN pilihan jenis")
        var isPopup = false

        for (text in popupTexts) {
            if (pageInteractor.pageContainsText(text)) {
                isPopup = true
                break
            }
        }

        if (!isPopup) return

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
