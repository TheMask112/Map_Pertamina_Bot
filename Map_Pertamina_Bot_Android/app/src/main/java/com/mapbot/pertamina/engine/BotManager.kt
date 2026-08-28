package com.mapbot.pertamina.engine

import android.content.Context
import com.mapbot.pertamina.data.BotUiState
import kotlinx.coroutines.flow.MutableStateFlow

object BotManager {
    var webViewManager: WebViewManager? = null
        private set
    var pageInteractor: PageInteractor? = null
        private set
    var botEngine: BotEngine? = null
        private set
        
    val uiStateFlow = MutableStateFlow(BotUiState())

    fun initialize(context: Context) {
        if (webViewManager == null) {
            // Gunakan applicationContext agar WebView tidak terkait ke satu Activity yang bisa dihancurkan
            val appContext = context.applicationContext
            webViewManager = WebViewManager(appContext).apply { initialize() }
            pageInteractor = PageInteractor(webViewManager!!)
            botEngine = BotEngine(webViewManager!!, pageInteractor!!, uiStateFlow, appContext)
        }
    }
}
