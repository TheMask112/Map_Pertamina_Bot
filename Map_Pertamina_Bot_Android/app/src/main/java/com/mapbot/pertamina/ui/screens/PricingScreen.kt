package com.mapbot.pertamina.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.mapbot.pertamina.util.LicenseManager
import com.mapbot.pertamina.util.PaymentHelper
import kotlinx.coroutines.launch

// Admin Telegram ID — digunakan di Help Dialog bantuan
private const val SUPPORT_TELEGRAM_ID = "1203246492"
private const val SUPPORT_TELEGRAM_USERNAME = "@MapPertaminaSupport"

@Composable
fun PricingScreen(
    onLicenseActivated: () -> Unit,
    onNavigateToLicense: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val lifecycleOwner = LocalLifecycleOwner.current

    var showPhoneDialog by remember { mutableStateOf(false) }
    var showHelpDialog by remember { mutableStateOf(false) }
    var selectedPaket by remember { mutableStateOf("") }
    var whatsappNumber by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var loadingMessage by remember { mutableStateOf("Memproses...") }
    var currentOrderId by remember { mutableStateOf("") }
    var isWaitingForPayment by remember { mutableStateOf(false) }

    // Cek lisensi aktif saat layar dibuka
    LaunchedEffect(Unit) {
        val status = LicenseManager.getLicenseStatus(context)
        if (status.isValid) {
            onLicenseActivated()
        }
    }

    // Lifecycle observer — saat user kembali dari browser (onResume), mulai polling
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME && isWaitingForPayment && currentOrderId.isNotEmpty()) {
                isWaitingForPayment = false
                isLoading = true
                loadingMessage = "Memverifikasi pembayaran & mengaktifkan lisensi..."

                coroutineScope.launch {
                    val redeemResult = PaymentHelper.pollOrderForLicense(currentOrderId, context)
                    isLoading = false

                    if (redeemResult.success && !redeemResult.licenseKey.isNullOrEmpty()) {
                        // Aktifkan lisensi secara lokal
                        val activateResult = LicenseManager.activateFromKey(context, redeemResult.licenseKey)
                        if (activateResult.first) {
                            Toast.makeText(context, "✅ Lisensi berhasil diaktifkan!", Toast.LENGTH_LONG).show()
                            onLicenseActivated()
                        } else {
                            val retryCount = LicenseManager.incrementRetry(context)
                            if (retryCount >= 3) {
                                showHelpDialog = true
                            } else {
                                Toast.makeText(
                                    context,
                                    "Gagal aktivasi ($retryCount/3): ${activateResult.second}",
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        }
                    } else {
                        val retryCount = LicenseManager.incrementRetry(context)
                        if (retryCount >= 3) {
                            showHelpDialog = true
                        } else {
                            Toast.makeText(
                                context,
                                "Gagal aktivasi ($retryCount/3): ${redeemResult.errorMessage ?: "Coba lagi"}",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val scrollState = rememberScrollState()

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
                    .verticalScroll(scrollState),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(32.dp))

                Text(
                    text = "Pilih Paket Lisensi",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Aktifkan MAP Pertamina Bot untuk otomatisasi pencatatan penjualan Anda",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 24.dp)
                )

                Spacer(modifier = Modifier.height(24.dp))

                PricingCard(
                    title = "Paket Starter",
                    price = "Rp 75.000",
                    description = "Kuota 500 Tabung",
                    features = listOf(
                        "Masa Aktif Lifetime (Tanpa Batas)",
                        "Bypass Captcha Otomatis",
                        "Dukungan Multi-Batch Excel",
                        "Lisensi Terkunci per HWID"
                    ),
                    buttonText = "Beli Starter",
                    onBuyClick = {
                        selectedPaket = "starter"
                        showPhoneDialog = true
                    }
                )

                PricingCard(
                    title = "Paket Pro",
                    price = "Rp 250.000",
                    description = "Kuota 2.000 Tabung",
                    features = listOf(
                        "Masa Aktif Lifetime (Tanpa Batas)",
                        "Bypass Captcha Otomatis",
                        "Dukungan Multi-Batch Excel",
                        "Lisensi Terkunci per HWID",
                        "Prioritas Pemrosesan & Update"
                    ),
                    buttonText = "Beli Pro",
                    isPopular = true,
                    onBuyClick = {
                        selectedPaket = "pro"
                        showPhoneDialog = true
                    }
                )

                PricingCard(
                    title = "Paket Enterprise",
                    price = "Rp 500.000",
                    description = "Kuota 5.000 Tabung",
                    features = listOf(
                        "Masa Aktif Lifetime (Tanpa Batas)",
                        "Bypass Captcha Otomatis",
                        "Dukungan Multi-Batch Excel",
                        "Lisensi Terkunci per HWID",
                        "Dukungan Teknis Prioritas 24/7"
                    ),
                    buttonText = "Beli Enterprise",
                    onBuyClick = {
                        selectedPaket = "enterprise"
                        showPhoneDialog = true
                    }
                )

                Spacer(modifier = Modifier.height(24.dp))
                HorizontalDivider()
                Spacer(modifier = Modifier.height(16.dp))

                // Tombol aktivasi manual untuk memasukkan license key teks
                Button(
                    onClick = onNavigateToLicense,
                    modifier = Modifier.fillMaxWidth().height(48.dp).padding(horizontal = 16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer)
                ) {
                    Text("Sudah Punya Lisensi? Aktivasi Manual", color = MaterialTheme.colorScheme.onSecondaryContainer)
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Tombol bantuan manual — juga bisa digunakan jika sudah beli tapi gagal aktif
                TextButton(onClick = { showHelpDialog = true }) {
                    Text(
                        "Butuh bantuan aktivasi?",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.outline
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))
            }

            // Loading overlay
            if (isLoading) {
                Surface(
                    color = MaterialTheme.colorScheme.scrim.copy(alpha = 0.65f),
                    modifier = Modifier.fillMaxSize()
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.Center,
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator()
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = loadingMessage,
                            color = MaterialTheme.colorScheme.onBackground,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(horizontal = 32.dp)
                        )
                    }
                }
            }

            // Dialog nomor WhatsApp
            if (showPhoneDialog) {
                AlertDialog(
                    onDismissRequest = { showPhoneDialog = false },
                    title = { Text("Nomor WhatsApp") },
                    text = {
                        Column {
                            Text("Masukkan nomor WhatsApp untuk notifikasi & backup lisensi Anda.")
                            Spacer(modifier = Modifier.height(16.dp))
                            OutlinedTextField(
                                value = whatsappNumber,
                                onValueChange = { whatsappNumber = it },
                                label = { Text("Contoh: 08123456789") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                if (whatsappNumber.isNotBlank()) {
                                    showPhoneDialog = false
                                    isLoading = true
                                    loadingMessage = "Membuat pesanan..."
                                    coroutineScope.launch {
                                        val response = PaymentHelper.createOrder(
                                            selectedPaket,
                                            whatsappNumber,
                                            context
                                        )
                                        isLoading = false
                                        if (response.snapToken.isNotEmpty()) {
                                            currentOrderId = response.orderId
                                            isWaitingForPayment = true
                                            // Buka halaman pembayaran di Chrome Custom Tabs
                                            PaymentHelper.openPaymentPage(
                                                context = context,
                                                redirectUrl = response.redirectUrl,
                                                snapToken = response.snapToken
                                            )
                                        } else {
                                            Toast.makeText(
                                                context,
                                                response.errorMessage ?: "Gagal membuat pesanan",
                                                Toast.LENGTH_LONG
                                            ).show()
                                        }
                                    }
                                } else {
                                    Toast.makeText(context, "Nomor WhatsApp harus diisi", Toast.LENGTH_SHORT).show()
                                }
                            }
                        ) {
                            Text("Lanjutkan Pembayaran")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showPhoneDialog = false }) {
                            Text("Batal")
                        }
                    }
                )
            }

            // Help Dialog — muncul setelah 3x gagal ATAU saat user klik tombol bantuan
            if (showHelpDialog) {
                AlertDialog(
                    onDismissRequest = { showHelpDialog = false },
                    title = { Text("Bantuan Aktivasi Lisensi") },
                    text = {
                        Column {
                            Text(
                                "Aktivasi otomatis gagal atau Anda ingin membeli lisensi secara manual.",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                "Hubungi admin kami via Telegram:",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Surface(
                                color = MaterialTheme.colorScheme.surfaceVariant,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        text = SUPPORT_TELEGRAM_USERNAME,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Text(
                                        text = "ID: $SUPPORT_TELEGRAM_ID",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                "Sertakan HWID perangkat Anda saat menghubungi admin:\n${LicenseManager.getHwid(context)}",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    },
                    confirmButton = {
                        Button(
                            onClick = {
                                // Buka Telegram langsung ke profil admin
                                try {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tg://user?id=$SUPPORT_TELEGRAM_ID"))
                                    context.startActivity(intent)
                                } catch (e: Exception) {
                                    // Fallback ke web Telegram jika app tidak terinstall
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://t.me/$SUPPORT_TELEGRAM_ID"))
                                    context.startActivity(intent)
                                }
                            }
                        ) {
                            Text("Buka Telegram")
                        }
                    },
                    dismissButton = {
                        Row {
                            TextButton(
                                onClick = {
                                    // Salin HWID ke clipboard
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    clipboard.setPrimaryClip(ClipData.newPlainText("HWID", LicenseManager.getHwid(context)))
                                    Toast.makeText(context, "HWID disalin!", Toast.LENGTH_SHORT).show()
                                }
                            ) {
                                Text("Salin HWID")
                            }
                            TextButton(onClick = { showHelpDialog = false }) {
                                Text("Tutup")
                            }
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun PricingCard(
    title: String,
    price: String,
    description: String,
    features: List<String>,
    buttonText: String,
    isPopular: Boolean = false,
    onBuyClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isPopular) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant
        ),
        border = if (isPopular) BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null,
        elevation = CardDefaults.cardElevation(defaultElevation = if (isPopular) 8.dp else 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            if (isPopular) {
                Surface(
                    color = MaterialTheme.colorScheme.primary,
                    shape = RoundedCornerShape(percent = 50),
                    modifier = Modifier.padding(bottom = 16.dp)
                ) {
                    Text(
                        text = "PALING LAKU",
                        color = MaterialTheme.colorScheme.onPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )
                }
            }

            Text(text = title, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = price, fontSize = 32.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = description, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

            Spacer(modifier = Modifier.height(16.dp))
            features.forEach { feature ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("✅ ", fontSize = 14.sp)
                    Text(text = feature, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = onBuyClick,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isPopular) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.secondary
                )
            ) {
                Text(buttonText)
            }
        }
    }
}
