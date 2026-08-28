package com.mapbot.pertamina

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import android.app.AlertDialog
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.mapbot.pertamina.service.BotForegroundService
import com.mapbot.pertamina.ui.navigation.AppNavigation
import com.mapbot.pertamina.ui.theme.MapPertaminaBotTheme
import com.mapbot.pertamina.util.AutoUpdater
import com.mapbot.pertamina.util.SecurityUtils

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        if (!SecurityUtils.isDeviceSafe(this)) {
            Toast.makeText(this, "Aplikasi dibajak, atau berjalan di Emulator/Root", Toast.LENGTH_LONG).show()
            setContent {
                MapPertaminaBotTheme {
                    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("Akses Ditolak: Environment Tidak Aman", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
            return
        }
        
        // Cek Izin Floating Window
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            AlertDialog.Builder(this)
                .setTitle("Izin Diperlukan")
                .setMessage("Bot ini menggunakan Mesin Ghoib (Floating Browser) agar bisa berjalan di latar belakang (misal sambil buka TikTok). Mohon izinkan 'Tampil di atas aplikasi lain'.")
                .setPositiveButton("Buka Pengaturan") { _, _ ->
                    val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
                    startActivityForResult(intent, 1001)
                }
                .setCancelable(false)
                .show()
        } else {
            startBotService()
        }

        // Cek Pembaruan Otomatis
        AutoUpdater.checkForUpdates(this, BuildConfig.VERSION_CODE) { hasUpdate, apkUrl ->
            if (hasUpdate && apkUrl != null) {
                runOnUiThread {
                    AlertDialog.Builder(this)
                        .setTitle("Pembaruan Tersedia")
                        .setMessage("Versi terbaru bot telah tersedia. Ingin mengunduh dan memperbarui sekarang?")
                        .setPositiveButton("Ya, Perbarui") { _, _ ->
                            AutoUpdater.downloadAndInstallUpdate(this, apkUrl)
                        }
                        .setNegativeButton("Nanti", null)
                        .show()
                }
            }
        }

        setContent {
            MapPertaminaBotTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1001) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                startBotService()
            } else {
                Toast.makeText(this, "Izin ditolak. Bot mungkin akan tertidur jika di-minimize.", Toast.LENGTH_LONG).show()
                startBotService() // Tetap jalankan
            }
        }
    }
    
    private fun startBotService() {
        val intent = Intent(this, BotForegroundService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 101)
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }


}
