package com.mapbot.pertamina.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import com.mapbot.pertamina.engine.BotManager

class BotForegroundService : Service() {

    companion object {
        private var instance: BotForegroundService? = null

        fun detachWebView() {
            instance?.let { service ->
                val webView = BotManager.webViewManager?.getWebView()
                if (webView != null) {
                    try {
                        service.windowManager?.removeView(webView)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
            }
        }

        fun attachWebView() {
            instance?.attachFloatingWebView()
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var windowManager: WindowManager? = null
    private val CHANNEL_ID = "MapBotChannel"

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
        
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "MapBot::BackgroundExecution"
        )
        wakeLock?.acquire(10 * 60 * 1000L /*10 minutes*/)
        
        BotManager.initialize(this)
        attachFloatingWebView()
    }

    private fun attachFloatingWebView() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            return // Tidak ada izin
        }

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        val webView = BotManager.webViewManager?.getWebView() ?: return

        // Jika webview sudah punya parent, lepaskan dulu
        (webView.parent as? android.view.ViewGroup)?.removeView(webView)

        val params = WindowManager.LayoutParams(
            1, // Lebar 1 pixel (invisible)
            1, // Tinggi 1 pixel
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            else
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        )
        
        params.gravity = Gravity.TOP or Gravity.START
        params.x = 0
        params.y = 0

        try {
            windowManager?.addView(webView, params)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MAP Pertamina Bot")
            .setContentText("Mesin Ghoib (Floating Browser) aktif!")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        startForeground(1, notification)
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        if (instance == this) {
            instance = null
        }
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
        
        try {
            val webView = BotManager.webViewManager?.getWebView()
            if (webView != null && webView.parent != null) {
                windowManager?.removeView(webView)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Bot Running Status",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }
}
