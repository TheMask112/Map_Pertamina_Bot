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

    fun setOnCaptchaImagesReady(cb: (String, String) -> Unit) { onCaptchaImagesReady = cb }
    fun setOnPageTextReady(cb: (String) -> Unit) { onPageTextReady = cb }
    fun setOnElementFound(cb: (Boolean) -> Unit) { onElementFound = cb }
}
