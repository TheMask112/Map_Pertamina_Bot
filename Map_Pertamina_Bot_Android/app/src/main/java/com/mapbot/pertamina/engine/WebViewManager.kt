package com.mapbot.pertamina.engine

import android.content.Context
import android.net.http.SslError
import android.view.ViewGroup
import android.webkit.*
import com.mapbot.pertamina.util.Constants

class WebViewManager(private val context: Context) {
    private var webView: WebView? = null
    private lateinit var bridge: JavaScriptBridge

    fun initialize(): WebView {
        webView = WebView(context).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                userAgentString = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
            }

            CookieManager.getInstance().setAcceptCookie(true)
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

            bridge = JavaScriptBridge()
            addJavascriptInterface(bridge, "AndroidBot")

            webViewClient = BotWebViewClient()
        }
        return webView!!
    }

    fun getBridge(): JavaScriptBridge = bridge
    fun getWebView(): WebView? = webView

    fun loadMapUrl() {
        webView?.loadUrl(Constants.MAP_URL)
    }

    fun executeJs(script: String, callback: ((String) -> Unit)? = null) {
        webView?.evaluateJavascript(script) { result ->
            callback?.invoke(result ?: "null")
        }
    }

    fun clearSession() {
        CookieManager.getInstance().removeAllCookies(null)
        CookieManager.getInstance().flush()
        webView?.clearCache(true)
    }

    fun destroy() {
        webView?.destroy()
        webView = null
    }

    inner class BotWebViewClient : WebViewClient() {
        var onPageFinished: ((url: String) -> Unit)? = null

        override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
            super.onPageStarted(view, url, favicon)
            // Inject stealth JS to bypass bot detection + Intercept Live Pertamina Profile APIs
            view?.evaluateJavascript("""
                (function() {
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    window.chrome = { runtime: {} };
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => [1, 2, 3]
                    });
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['id-ID', 'id', 'en-US', 'en']
                    });

                    if (window._pertamina_interceptor_set) return;
                    window._pertamina_interceptor_set = true;

                    function handleData(url, data) {
                        try {
                            if (!data || !data.data) return;
                            if (url.includes('/users/profile') || url.includes('/products/user') || url.includes('/subuser/v1/login')) {
                                if (window.AndroidBot && window.AndroidBot.onMerchantInfo) {
                                    window.AndroidBot.onMerchantInfo(JSON.stringify(data.data));
                                }
                            }
                        } catch(e) {}
                    }

                    try {
                        const origFetch = window.fetch;
                        window.fetch = async function(...args) {
                            const response = await origFetch.apply(this, args);
                            try {
                                const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
                                if (url.includes('api-map.my-pertamina.id')) {
                                    const clone = response.clone();
                                    clone.json().then(function(d) { handleData(url, d); }).catch(function(){});
                                }
                            } catch(e) {}
                            return response;
                        };
                    } catch(e) {}

                    try {
                        const origOpen = XMLHttpRequest.prototype.open;
                        const origSend = XMLHttpRequest.prototype.send;
                        XMLHttpRequest.prototype.open = function(method, url) {
                            this._reqUrl = url;
                            return origOpen.apply(this, arguments);
                        };
                        XMLHttpRequest.prototype.send = function() {
                            this.addEventListener('load', function() {
                                try {
                                    if (this._reqUrl && this._reqUrl.includes('api-map.my-pertamina.id')) {
                                        const d = JSON.parse(this.responseText);
                                        handleData(this._reqUrl, d);
                                    }
                                } catch(e) {}
                            });
                            return origSend.apply(this, arguments);
                        };
                    } catch(e) {}
                })();
            """.trimIndent(), null)
        }

        override fun onPageFinished(view: WebView?, url: String?) {
            super.onPageFinished(view, url)
            url?.let { onPageFinished?.invoke(it) }
        }

        override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
            handler?.proceed()
        }

        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
            return false
        }
    }
}
