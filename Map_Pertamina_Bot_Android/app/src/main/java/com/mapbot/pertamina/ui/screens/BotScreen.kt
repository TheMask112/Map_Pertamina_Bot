package com.mapbot.pertamina.ui.screens

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.border
import com.mapbot.pertamina.ui.theme.*
import com.mapbot.pertamina.data.BotUiState
import com.mapbot.pertamina.data.ExcelWriter
import com.mapbot.pertamina.data.SessionData
import com.mapbot.pertamina.engine.BotEngine
import com.mapbot.pertamina.engine.PageInteractor
import com.mapbot.pertamina.engine.WebViewManager
import kotlinx.coroutines.flow.MutableStateFlow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BotScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    
    // Initialize Singleton
    LaunchedEffect(Unit) {
        com.mapbot.pertamina.engine.BotManager.initialize(context)
    }
    
    val uiState by com.mapbot.pertamina.engine.BotManager.uiStateFlow.collectAsState()
    
    val createDocLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    ) { uri ->
        uri?.let {
            val success = ExcelWriter.writeSuccessfulNik(context, it, SessionData.loadedNikList)
            if (success) {
                Toast.makeText(context, "Berhasil menyimpan daftar NIK ke Excel", Toast.LENGTH_LONG).show()
            } else {
                Toast.makeText(context, "Gagal menyimpan file Excel", Toast.LENGTH_SHORT).show()
            }
        }
    }

    DisposableEffect(Unit) {
        // Lepas WebView dari WindowManager (Service) agar bisa dipakai di screen ini
        com.mapbot.pertamina.service.BotForegroundService.detachWebView()
        onDispose {
            // Pasang kembali WebView ke WindowManager (Service) saat keluar dari screen
            com.mapbot.pertamina.service.BotForegroundService.attachWebView()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Kontrol Bot") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            
            AndroidView(
                factory = { ctx ->
                    val wv = com.mapbot.pertamina.engine.BotManager.webViewManager?.getWebView()
                    if (wv != null) {
                        // Bersihkan parent ViewGroup jika ada
                        (wv.parent as? android.view.ViewGroup)?.removeView(wv)
                        // Bersihkan dari WindowManager jika masih tertempel
                        try {
                            val wm = ctx.getSystemService(android.content.Context.WINDOW_SERVICE) as android.view.WindowManager
                            wm.removeViewImmediate(wv)
                        } catch (e: Exception) {
                            // Abaikan
                        }
                        wv
                    } else {
                        android.webkit.WebView(ctx)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.5f)
                    .align(Alignment.TopCenter)
            )
            
            // Overlay Log & Control Panel (Translucent) di bagian bawah
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.5f)
                    .align(Alignment.BottomCenter),
                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f),
                shadowElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier.fillMaxSize().padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "Status: ${if (uiState.isRunning) "BERJALAN" else "SIAP"} | Estimasi: ${if (uiState.estimatedTimeSeconds >= 0) uiState.estimatedTimeSeconds.toString() + " dtk" else "-"}", 
                        style = MaterialTheme.typography.titleSmall
                    )
                    Text("Progres NIK: ${uiState.processedCount} / ${uiState.totalNik}", style = MaterialTheme.typography.bodySmall)
                    Text("✅ Sukses: ${uiState.successCount} | ❌ Gagal: ${uiState.failedCount} | ⚠️ Invalid: ${uiState.invalidCount}", style = MaterialTheme.typography.bodySmall)
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                if (SessionData.loadedNikList.isNotEmpty()) {
                                    com.mapbot.pertamina.engine.BotManager.botEngine?.start(
                                        SessionData.phone,
                                        SessionData.pass,
                                        SessionData.loadedNikList
                                    )
                                }
                            },
                            modifier = Modifier.height(36.dp)
                        ) {
                            Text("Mulai", style = MaterialTheme.typography.labelSmall)
                        }
                        Button(
                            onClick = { com.mapbot.pertamina.engine.BotManager.botEngine?.stop() },
                            modifier = Modifier.height(36.dp)
                        ) {
                            Text("Jeda", style = MaterialTheme.typography.labelSmall)
                        }
                        if (!uiState.isRunning && uiState.successCount > 0) {
                            OutlinedButton(
                                onClick = { createDocLauncher.launch("NIK_Berhasil_${System.currentTimeMillis()}.xlsx") },
                                modifier = Modifier.height(36.dp)
                            ) {
                                Text("Simpan Excel", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    // Log viewer
                    androidx.compose.foundation.lazy.LazyColumn(
                        modifier = Modifier.fillMaxWidth().weight(1f)
                    ) {
                        items(uiState.logs.size) { index ->
                            Text(uiState.logs[index], style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}
