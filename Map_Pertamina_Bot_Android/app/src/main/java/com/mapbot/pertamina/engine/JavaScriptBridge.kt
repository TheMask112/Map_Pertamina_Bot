package com.mapbot.pertamina.engine

import android.webkit.JavascriptInterface
import android.util.Log

class JavaScriptBridge {
    private var onCaptchaImagesReady: ((bgBase64: String, sliderBase64: String) -> Unit)? = null
    private var onPageTextReady: ((text: String) -> Unit)? = null
    private var onElementFound: ((found: Boolean) -> Unit)? = null

    @JavascriptInterface
    fun onCaptchaImages(bgBase64: String, sliderBase64: String) {
        onCaptchaImagesReady?.invoke(bgBase64, sliderBase64)
    }

    @JavascriptInterface
    fun onPageText(text: String) {
        onPageTextReady?.invoke(text)
    }

    @JavascriptInterface
    fun onElementStatus(found: Boolean) {
        onElementFound?.invoke(found)
    }

    @JavascriptInterface
    fun log(message: String) {
        Log.d("JSBridge", message)
    }

    private var onMerchantInfoReady: ((json: String) -> Unit)? = null
    private var onInboxAlertsReady: ((json: String) -> Unit)? = null
    private var onLogisticDataReady: ((json: String) -> Unit)? = null
    private var onTransactionHistoryReady: ((json: String) -> Unit)? = null

    @JavascriptInterface
    fun onMerchantInfo(jsonStr: String) {
        Log.d("JSBridge", "Live Merchant Info Intercepted: $jsonStr")
        onMerchantInfoReady?.invoke(jsonStr)
    }

    @JavascriptInterface
    fun onInboxAlerts(jsonStr: String) {
        Log.d("JSBridge", "Live Inbox/Alerts Intercepted: $jsonStr")
        onInboxAlertsReady?.invoke(jsonStr)
    }

    @JavascriptInterface
    fun onLogisticData(jsonStr: String) {
        Log.d("JSBridge", "Live Logistic Data Intercepted: $jsonStr")
        onLogisticDataReady?.invoke(jsonStr)
    }

    @JavascriptInterface
    fun onTransactionHistory(jsonStr: String) {
        Log.d("JSBridge", "Live Transaction History Intercepted: $jsonStr")
        onTransactionHistoryReady?.invoke(jsonStr)
    }

    fun setOnMerchantInfoReady(cb: (String) -> Unit) { onMerchantInfoReady = cb }
    fun setOnInboxAlertsReady(cb: (String) -> Unit) { onInboxAlertsReady = cb }
    fun setOnLogisticDataReady(cb: (String) -> Unit) { onLogisticDataReady = cb }
    fun setOnTransactionHistoryReady(cb: (String) -> Unit) { onTransactionHistoryReady = cb }
    fun setOnCaptchaImagesReady(cb: (String, String) -> Unit) { onCaptchaImagesReady = cb }
    fun setOnPageTextReady(cb: (String) -> Unit) { onPageTextReady = cb }
    fun setOnElementFound(cb: (Boolean) -> Unit) { onElementFound = cb }
}
