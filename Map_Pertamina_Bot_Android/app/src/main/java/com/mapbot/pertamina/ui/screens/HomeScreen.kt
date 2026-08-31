package com.mapbot.pertamina.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mapbot.pertamina.data.ExcelReader
import com.mapbot.pertamina.data.SessionData
import com.mapbot.pertamina.util.LicenseManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun HomeScreen(onNavigateToBot: () -> Unit, onNavigateToSettings: () -> Unit) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var isReadingFile by remember { mutableStateOf(false) }
    var fileSummary by remember { mutableStateOf(
        if (SessionData.loadedNikList.isNotEmpty()) "Dimuat: ${SessionData.loadedNikList.size} NIK" else "Belum ada file Excel yang dipilih"
    ) }

    var licenseStatus by remember { mutableStateOf(LicenseManager.getLicenseStatus(context)) }

    LaunchedEffect(Unit) {
        licenseStatus = LicenseManager.getLicenseStatus(context)
        coroutineScope.launch {
            val synced = LicenseManager.syncLicenseStatusOnline(context)
            if (synced) {
                licenseStatus = LicenseManager.getLicenseStatus(context)
            }
        }
    }

    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            isReadingFile = true
            fileSummary = "Membaca file..."
            coroutineScope.launch {
                val list = withContext(Dispatchers.IO) {
                    ExcelReader.readNikFromExcel(context, it)
                }
                SessionData.loadedNikList = list
                fileSummary = "Berhasil memuat ${list.size} NIK"
                isReadingFile = false
            }
        }
    }

    val bgBrush = Brush.verticalGradient(
        colors = listOf(Color(0xFF0F172A), Color(0xFF020617))
    )
    val accentBrush = Brush.horizontalGradient(
        colors = listOf(Color(0xFFEAB308), Color(0xFFF59E0B))
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgBrush)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            
            Text(
                "MAP BOT PRO",
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.ExtraBold, letterSpacing = 2.sp),
                color = Color.White
            )
            
            // License Info Card
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp, bottom = 32.dp)
                    .clip(RoundedCornerShape(16.dp)),
                color = Color.White.copy(alpha = 0.05f),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("STATUS LISENSI", fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(licenseStatus.paket, color = Color(0xFFEAB308), fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        Text("${licenseStatus.usedQuota} / ${licenseStatus.totalQuota} Tabung", color = Color.White, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            // File Picker Button
            OutlinedButton(
                onClick = { filePickerLauncher.launch("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.List, contentDescription = null, tint = Color.Gray)
                Spacer(modifier = Modifier.width(8.dp))
                Text(if (isReadingFile) "Memproses..." else "Pilih File Excel NIK")
            }
            
            AnimatedVisibility(visible = fileSummary.isNotEmpty(), enter = fadeIn(), exit = fadeOut()) {
                Text(
                    text = fileSummary,
                    color = if (SessionData.loadedNikList.isNotEmpty()) Color(0xFF10B981) else Color.Gray,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Start Bot Button
            Button(
                onClick = onNavigateToBot,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(accentBrush),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                contentPadding = PaddingValues()
            ) {
                Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color(0xFF0F172A))
                Spacer(modifier = Modifier.width(8.dp))
                Text("BUKA LAYAR BOT", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Settings Button
            TextButton(
                onClick = onNavigateToSettings,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Settings, contentDescription = null, tint = Color.Gray)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Pengaturan", color = Color.Gray)
            }
        }
    }
}
