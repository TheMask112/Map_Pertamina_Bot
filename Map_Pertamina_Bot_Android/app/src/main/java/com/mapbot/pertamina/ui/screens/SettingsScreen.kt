package com.mapbot.pertamina.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mapbot.pertamina.MainActivity
import com.mapbot.pertamina.util.LicenseManager

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    var showResetDialog by remember { mutableStateOf(false) }
    
    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = { showResetDialog = false },
            title = { Text("Konfirmasi Reset Lisensi") },
            text = { Text("Apakah Anda yakin ingin me-reset lisensi? Anda akan diminta untuk memasukkan kode rahasia baru setelah ini.") },
            confirmButton = {
                TextButton(onClick = {
                    showResetDialog = false
                    LicenseManager.resetLicense(context)
                    val intent = Intent(context, MainActivity::class.java).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                    }
                    context.startActivity(intent)
                }) {
                    Text("Ya, Reset", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showResetDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pengaturan & Bantuan") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Kembali")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(scrollState),
            horizontalAlignment = Alignment.Start
        ) {
            Text("Pengaturan Lisensi", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            Text("Jika kuota tabung sudah habis, Anda harus mereset lisensi untuk memasukkan kode baru.", style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = { showResetDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
            ) {
                Text("Reset Lisensi")
            }

            Spacer(modifier = Modifier.height(32.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(32.dp))

            Text("FAQ (Tanya Jawab)", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(16.dp))
            
            FaqItem("Q: Apakah aplikasi bisa berjalan di latar belakang?", "A: Ya, setelah Anda menekan tombol Mulai, Anda bisa menekan tombol Home (Minimize) dan bot akan terus bekerja seperti 'Mesin Ghoib'.")
            FaqItem("Q: Mengapa saya mendapatkan status 'Timeout'?", "A: Koneksi internet atau server target sedang lambat. Bot akan otomatis mencoba ulang (retry) hingga 3x jika gagal.")
            FaqItem("Q: Bagaimana jika lisensi saya habis?", "A: Silakan tekan tombol 'Reset Lisensi' di atas, lalu minta kode baru melalui Telegram.")
            
            Spacer(modifier = Modifier.height(32.dp))
            
            Button(
                onClick = { 
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://t.me/Dadilan"))
                        context.startActivity(intent)
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Hubungi Bantuan (@Dadilan)")
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
fun FaqItem(question: String, answer: String) {
    Column(modifier = Modifier.padding(bottom = 16.dp)) {
        Text(question, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyLarge)
        Spacer(modifier = Modifier.height(4.dp))
        Text(answer, style = MaterialTheme.typography.bodyMedium)
    }
}
