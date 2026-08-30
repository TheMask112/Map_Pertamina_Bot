package com.mapbot.pertamina.util

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Environment
import android.widget.Toast
import org.json.JSONObject
import java.net.URL
import kotlin.concurrent.thread

object AutoUpdater {

    private const val UPDATE_JSON_URL = "https://map-pertamina-web.vercel.app/update.json"

    fun checkForUpdates(context: Context, currentVersionCode: Int, onUpdateResult: (Boolean, String?) -> Unit) {
        thread {
            try {
                val jsonStr = URL(UPDATE_JSON_URL).readText()
                val jsonObj = JSONObject(jsonStr)
                val remoteVersionCode = jsonObj.getInt("versionCode")
                val apkUrl = jsonObj.getString("apkUrl")
                
                if (remoteVersionCode > currentVersionCode) {
                    onUpdateResult(true, apkUrl)
                } else {
                    onUpdateResult(false, null)
                }
            } catch (e: Exception) {
                e.printStackTrace()
                onUpdateResult(false, null)
            }
        }
    }

    fun downloadAndInstallUpdate(context: Context, apkUrl: String) {
        val request = DownloadManager.Request(Uri.parse(apkUrl))
            .setTitle("MAP Pertamina Bot Update")
            .setDescription("Mengunduh versi terbaru...")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "MapPertaminaBot-Update.apk")
            .setAllowedOverMetered(true)

        val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val downloadId = manager.enqueue(request)

        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context?, intent: Intent?) {
                val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
                if (id == downloadId && c != null) {
                    installApk(c, manager, downloadId)
                    c.unregisterReceiver(this)
                }
            }
        }
        
        // Register receiver for Download Complete
        context.registerReceiver(
            receiver, 
            IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
            Context.RECEIVER_EXPORTED
        )
        
        Toast.makeText(context, "Mengunduh pembaruan di latar belakang...", Toast.LENGTH_LONG).show()
    }

    private fun installApk(context: Context, manager: DownloadManager, downloadId: Long) {
        val uri = manager.getUriForDownloadedFile(downloadId)
        if (uri != null) {
            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
            try {
                context.startActivity(installIntent)
            } catch (e: Exception) {
                e.printStackTrace()
                Toast.makeText(context, "Gagal memulai instalasi", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
