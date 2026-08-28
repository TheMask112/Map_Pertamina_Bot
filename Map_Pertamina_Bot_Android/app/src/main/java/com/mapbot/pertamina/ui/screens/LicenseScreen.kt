package com.mapbot.pertamina.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mapbot.pertamina.util.LicenseManager
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LicenseScreen(onLicenseValid: () -> Unit) {
    val context = LocalContext.current
    var licenseKey by remember { mutableStateOf("") }
    var statusMessage by remember { mutableStateOf("") }
    var isError by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    val hwid = remember { LicenseManager.getHwid(context) }

    // Cek lisensi saat ini
    LaunchedEffect(Unit) {
        val status = LicenseManager.getLicenseStatus(context)
        if (status.isValid) {
            onLicenseValid()
        }
    }

    // Premium Background Brush
    val bgBrush = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF0F172A), // Slate 900
            Color(0xFF020617)  // Slate 950
        )
    )
    
    val accentBrush = Brush.horizontalGradient(
        colors = listOf(
            Color(0xFFEAB308), // Yellow/Gold
            Color(0xFFF59E0B)  // Amber
        )
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
            
            // Icon Bouncing Animation
            val infiniteTransition = rememberInfiniteTransition(label = "bounce")
            val yOffset by infiniteTransition.animateFloat(
                initialValue = -10f,
                targetValue = 10f,
                animationSpec = infiniteRepeatable(
                    animation = tween(1500, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse
                ), label = "icon_bounce"
            )

            Icon(
                imageVector = Icons.Default.Lock,
                contentDescription = "Security",
                tint = Color(0xFFEAB308),
                modifier = Modifier
                    .size(72.dp)
                    .offset(y = yOffset.dp)
            )
            
            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = "Premium Access",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 2.sp
                ),
                color = Color.White
            )
            
            Text(
                text = "Masukkan License Key untuk mengaktifkan Map Bot",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Gray,
                modifier = Modifier.padding(top = 8.dp, bottom = 32.dp)
            )

            // HWID Copy Section
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .clickable {
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("HWID", hwid))
                    },
                color = Color.White.copy(alpha = 0.05f),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text("Hardware ID (HWID)", color = Color.Gray, fontSize = 12.sp)
                        Text(hwid, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    }
                    Icon(Icons.Default.Info, contentDescription = "Copy HWID", tint = Color.Gray, modifier = Modifier.size(20.dp))
                }
            }
            
            Spacer(modifier = Modifier.height(24.dp))

            OutlinedTextField(
                value = licenseKey,
                onValueChange = { licenseKey = it; isError = false; statusMessage = "" },
                label = { Text("License Key", color = Color.Gray) },
                leadingIcon = { Icon(Icons.Default.Lock, tint = Color(0xFFEAB308), contentDescription = null) },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Color(0xFFEAB308),
                    unfocusedBorderColor = Color.White.copy(alpha = 0.2f),
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    cursorColor = Color(0xFFEAB308)
                ),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = {
                    if (licenseKey.isBlank()) {
                        isError = true
                        statusMessage = "License Key tidak boleh kosong!"
                        return@Button
                    }
                    isLoading = true
                    
                    // Simulate processing for visual effect
                    val result = LicenseManager.activateLicense(context, licenseKey)
                    
                    if (result.first) {
                        isError = false
                        statusMessage = "Aktivasi Berhasil! Mengalihkan..."
                        onLicenseValid()
                    } else {
                        isError = true
                        statusMessage = result.second
                        isLoading = false
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(accentBrush),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                contentPadding = PaddingValues() // Prevent inner padding override
            ) {
                if (isLoading) {
                    CircularProgressIndicator(color = Color(0xFF0F172A), modifier = Modifier.size(24.dp), strokeWidth = 2.dp)
                } else {
                    Text("AKTIVASI SEKARANG", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                }
            }

            AnimatedVisibility(
                visible = statusMessage.isNotEmpty(),
                enter = fadeIn() + expandVertically(),
                exit = fadeOut() + shrinkVertically()
            ) {
                Row(
                    modifier = Modifier.padding(top = 16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isError) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                    }
                    Text(
                        text = statusMessage,
                        color = if (isError) Color(0xFFEF4444) else Color(0xFF10B981),
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}
