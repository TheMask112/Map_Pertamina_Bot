package com.mapbot.pertamina.ui.screens

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.foundation.shape.RoundedCornerShape
import com.mapbot.pertamina.data.ExcelWriter
import com.mapbot.pertamina.data.SessionData

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BotScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    var isFullscreen by remember { mutableStateOf(false) }
    
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
                title = { Text(if (isFullscreen) "Layar Penuh" else "Kontrol Bot") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Kembali")
                    }
                },
                actions = {
                    TextButton(onClick = { isFullscreen = !isFullscreen }) {
                        Text(
                            if (isFullscreen) "Minimize" else "Full Screen",
                            color = MaterialTheme.colorScheme.primary,
                            style = MaterialTheme.typography.labelMedium
                        )
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
                        (wv.parent as? android.view.ViewGroup)?.removeView(wv)
                        try {
                            val wm = ctx.getSystemService(android.content.Context.WINDOW_SERVICE) as android.view.WindowManager
                            wm.removeViewImmediate(wv)
                        } catch (_: Exception) {}
                        wv
                    } else {
                        android.webkit.WebView(ctx)
                    }
                },
                modifier = if (isFullscreen) {
                    Modifier.fillMaxSize()
                } else {
                    Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.52f)
                        .align(Alignment.TopCenter)
                }
            )
            
            if (isFullscreen) {
                // Floating Bar di Bawah saat Layar Penuh
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .padding(8.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
                    shadowElevation = 8.dp
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Status: ${if (uiState.isRunning) (if (uiState.isPaused) "DIJEDA" else "BERJALAN") else "SIAP"}",
                                style = MaterialTheme.typography.labelMedium
                            )
                            Text(
                                "NIK: ${uiState.processedCount}/${uiState.totalNik} | ✅ ${uiState.successCount} | ❌ ${uiState.failedCount}",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            // Tombol Mulai / Stop
                            if (!uiState.isRunning) {
                                Button(
                                    onClick = {
                                        if (SessionData.loadedNikList.isNotEmpty()) {
                                            val credStore = com.mapbot.pertamina.security.CredentialStore(context)
                                            val phoneToUse = SessionData.phone.ifBlank { credStore.getPhone() }
                                            val passToUse = SessionData.pass.ifBlank { credStore.getPass() }
                                            
                                            com.mapbot.pertamina.engine.BotManager.botEngine?.start(
                                                phoneToUse,
                                                passToUse,
                                                SessionData.loadedNikList
                                            )
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                                    modifier = Modifier.height(36.dp)
                                ) {
                                    Text("Mulai", style = MaterialTheme.typography.labelSmall)
                                }
                            } else {
                                Button(
                                    onClick = { com.mapbot.pertamina.engine.BotManager.botEngine?.stop() },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828)),
                                    modifier = Modifier.height(36.dp)
                                ) {
                                    Text("Stop", style = MaterialTheme.typography.labelSmall)
                                }
                            }

                            // Tombol Jeda / Lanjutkan
                            if (uiState.isRunning) {
                                if (uiState.isPaused) {
                                    Button(
                                        onClick = { com.mapbot.pertamina.engine.BotManager.botEngine?.resume() },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0)),
                                        modifier = Modifier.height(36.dp)
                                    ) {
                                        Text("Lanjutkan", style = MaterialTheme.typography.labelSmall)
                                    }
                                } else {
                                    Button(
                                        onClick = { com.mapbot.pertamina.engine.BotManager.botEngine?.pause() },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF57F17)),
                                        modifier = Modifier.height(36.dp)
                                    ) {
                                        Text("Jeda", style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }

                            OutlinedButton(
                                onClick = { isFullscreen = false },
                                modifier = Modifier.height(36.dp)
                            ) {
                                Text("Minimize", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            } else {
                // Control Panel & Logs (Split View Normal)
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.48f)
                        .align(Alignment.BottomCenter),
                    color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
                    shadowElevation = 8.dp
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            "Status: ${if (uiState.isRunning) (if (uiState.isPaused) "DIJEDA" else "BERJALAN") else "SIAP"} | Estimasi: ${if (uiState.estimatedTimeSeconds >= 0) uiState.estimatedTimeSeconds.toString() + " dtk" else "-"}", 
                            style = MaterialTheme.typography.titleSmall
                        )
                        Text("Progres NIK: ${uiState.processedCount} / ${uiState.totalNik}", style = MaterialTheme.typography.bodySmall)
                        Text("✅ Sukses: ${uiState.successCount} | ❌ Gagal: ${uiState.failedCount} | ⚠️ Invalid: ${uiState.invalidCount}", style = MaterialTheme.typography.bodySmall)
                        
                        Spacer(modifier = Modifier.height(6.dp))

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            // Tombol Mulai / Stop Dinamis
                            if (!uiState.isRunning) {
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
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32)),
                                    modifier = Modifier.height(36.dp)
                                ) {
                                    Text("Mulai Bot", style = MaterialTheme.typography.labelSmall)
                                }
                            } else {
                                Button(
                                    onClick = { com.mapbot.pertamina.engine.BotManager.botEngine?.stop() },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828)),
                                    modifier = Modifier.height(36.dp)
                                ) {
                                    Text("Stop Bot", style = MaterialTheme.typography.labelSmall)
                                }
                            }

                            // Tombol Jeda / Lanjutkan Dinamis
                            if (uiState.isRunning) {
                                if (uiState.isPaused) {
                                    Button(
                                        onClick = { com.mapbot.pertamina.engine.BotManager.botEngine?.resume() },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0)),
                                        modifier = Modifier.height(36.dp)
                                    ) {
                                        Text("Lanjutkan", style = MaterialTheme.typography.labelSmall)
                                    }
                                } else {
                                    Button(
                                        onClick = { com.mapbot.pertamina.engine.BotManager.botEngine?.pause() },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF57F17)),
                                        modifier = Modifier.height(36.dp)
                                    ) {
                                        Text("Jeda", style = MaterialTheme.typography.labelSmall)
                                    }
                                }
                            }

                            // Tombol Layar Penuh
                            OutlinedButton(
                                onClick = { isFullscreen = true },
                                modifier = Modifier.height(36.dp)
                            ) {
                                Text("Layar Penuh", style = MaterialTheme.typography.labelSmall)
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
                        
                        Spacer(modifier = Modifier.height(6.dp))
                        
                        // Log viewer
                        LazyColumn(
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
}

