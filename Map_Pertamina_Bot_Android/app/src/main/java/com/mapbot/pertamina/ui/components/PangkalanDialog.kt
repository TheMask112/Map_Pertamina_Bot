package com.mapbot.pertamina.ui.components

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mapbot.pertamina.security.CredentialStore
import com.mapbot.pertamina.security.PangkalanProfile
import com.mapbot.pertamina.util.LicenseManager
import com.mapbot.pertamina.data.ExcelReader
import com.mapbot.pertamina.data.NikData
import com.mapbot.pertamina.data.QueuePangkalanItem
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

@Composable
fun PangkalanSelectorDialog(
    context: Context,
    onDismiss: () -> Unit,
    onProfileChanged: () -> Unit
) {
    val credStore = remember { CredentialStore(context) }
    var profiles by remember { mutableStateOf(credStore.getProfiles()) }
    var activeProfile by remember { mutableStateOf(credStore.getActiveProfile()) }
    val isEnterprise = remember { LicenseManager.canUseMultiPangkalan(context) }
    val licenseStatus = remember { LicenseManager.getLicenseStatus(context) }

    var showAddEditDialog by remember { mutableStateOf(false) }
    var editingProfile by remember { mutableStateOf<PangkalanProfile?>(null) }

    if (showAddEditDialog) {
        AddEditPangkalanDialog(
            profile = editingProfile,
            onDismiss = {
                showAddEditDialog = false
                editingProfile = null
            },
            onSave = { savedProfile ->
                credStore.saveProfile(savedProfile)
                profiles = credStore.getProfiles()
                activeProfile = credStore.getActiveProfile()
                showAddEditDialog = false
                editingProfile = null
                onProfileChanged()
                com.mapbot.pertamina.util.TelemetryHelper.reportAllProfiles(context)
                Toast.makeText(context, "Profil pangkalan berhasil disimpan", Toast.LENGTH_SHORT).show()
            }
        )
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Kelola Pangkalan", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                if (isEnterprise) {
                    Surface(
                        color = Color(0xFFEAB308).copy(alpha = 0.2f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            "ENTERPRISE",
                            color = Color(0xFFEAB308),
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    "Pilih akun pangkalan yang ingin aktif digunakan saat login MAP Pertamina:",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray
                )
                Spacer(modifier = Modifier.height(12.dp))

                if (profiles.isEmpty()) {
                    Text(
                        "Belum ada akun pangkalan tersimpan. Klik Tambah di bawah untuk menambahkan data login.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.Gray
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 280.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(profiles) { item ->
                            val isSelected = activeProfile?.id == item.id
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable {
                                        credStore.setActiveProfile(item.id)
                                        activeProfile = credStore.getActiveProfile()
                                        onProfileChanged()
                                    },
                                color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else Color.White.copy(alpha = 0.05f),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            item.name,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer else Color.White
                                        )
                                        Text(
                                            item.phone.ifBlank { "No HP belum diisi" },
                                            style = MaterialTheme.typography.bodySmall,
                                            color = if (isSelected) MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f) else Color.Gray
                                        )
                                    }

                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        if (isSelected) {
                                            Icon(
                                                Icons.Default.Check,
                                                contentDescription = "Aktif",
                                                tint = MaterialTheme.colorScheme.primary,
                                                modifier = Modifier.size(20.dp)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                        }

                                        IconButton(
                                            onClick = {
                                                editingProfile = item
                                                showAddEditDialog = true
                                            },
                                            modifier = Modifier.size(32.dp)
                                        ) {
                                            Icon(Icons.Default.Edit, contentDescription = "Edit", modifier = Modifier.size(16.dp))
                                        }

                                        if (profiles.size > 1) {
                                            IconButton(
                                                onClick = {
                                                    credStore.deleteProfile(item.id)
                                                    profiles = credStore.getProfiles()
                                                    activeProfile = credStore.getActiveProfile()
                                                    onProfileChanged()
                                                },
                                                modifier = Modifier.size(32.dp)
                                            ) {
                                                Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                OutlinedButton(
                    onClick = {
                        editingProfile = null
                        showAddEditDialog = true
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Tambah Pangkalan Baru")
                }
            }
        },
        confirmButton = {
            Button(onClick = onDismiss) {
                Text("Tutup")
            }
        }
    )
}

@Composable
fun AddEditPangkalanDialog(
    profile: PangkalanProfile?,
    onDismiss: () -> Unit,
    onSave: (PangkalanProfile) -> Unit
) {
    var name by remember { mutableStateOf(profile?.name ?: "") }
    var phone by remember { mutableStateOf(profile?.phone ?: "") }
    var pass by remember { mutableStateOf(profile?.pass ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(if (profile == null) "Tambah Pangkalan" else "Edit Pangkalan", fontWeight = FontWeight.Bold)
        },
        text = {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Pangkalan / Toko") },
                    placeholder = { Text("Contoh: Pangkalan Gas Berkah") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("No. HP / Email Akun MAP") },
                    placeholder = { Text("08123456789") },
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = pass,
                    onValueChange = { pass = it },
                    label = { Text("Password Akun MAP") },
                    visualTransformation = PasswordVisualTransformation(),
                    modifier = Modifier.fillMaxWidth()
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isBlank()) return@Button
                    val toSave = profile?.copy(name = name.trim(), phone = phone.trim(), pass = pass.trim())
                        ?: PangkalanProfile(name = name.trim(), phone = phone.trim(), pass = pass.trim())
                    onSave(toSave)
                },
                enabled = name.isNotBlank()
            ) {
                Text("Simpan")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal")
            }
        }
    )
}

@Composable
fun BatchQueuePangkalanDialog(
    context: Context,
    onDismiss: () -> Unit,
    onStartBatch: (List<com.mapbot.pertamina.data.QueuePangkalanItem>) -> Unit
) {
    val credStore = remember { CredentialStore(context) }
    val profiles = remember { credStore.getProfiles() }
    val isEnterprise = remember { LicenseManager.canUseMultiPangkalan(context) }
    val licenseStatus = remember { LicenseManager.getLicenseStatus(context) }

    var showUpgradePrompt by remember { mutableStateOf(!isEnterprise) }
    val selectedMap = remember { mutableStateMapOf<String, Boolean>().apply { profiles.forEach { put(it.id, true) } } }
    val fileSummaryMap = remember { mutableStateMapOf<String, String>() }
    val nikListMap = remember { mutableStateMapOf<String, List<com.mapbot.pertamina.data.NikData>>() }

    val coroutineScope = rememberCoroutineScope()
    var currentPickingProfileId by remember { mutableStateOf<String?>(null) }

    val filePicker = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.GetContent()
    ) { uri: android.net.Uri? ->
        uri?.let {
            val pid = currentPickingProfileId ?: return@let
            coroutineScope.launch {
                val list = withContext(Dispatchers.IO) {
                    ExcelReader.readNikFromExcel(context, it)
                }
                nikListMap[pid] = list
                fileSummaryMap[pid] = "✓ ${list.size} NIK"
            }
        }
    }

    if (showUpgradePrompt) {
        AlertDialog(
            onDismissRequest = { 
                showUpgradePrompt = false
                onDismiss()
            },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFFEAB308))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Fitur Enterprise", fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column {
                    Text(
                        "🏢 Fitur Jalankan Semua Pangkalan Otomatis (Batch Queue Runner) eksklusif untuk Paket Enterprise 5.000 Tabung.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Paket aktif Anda: ${licenseStatus.paket} (${licenseStatus.totalQuota} Tabung).",
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Paket Starter & Pro dapat berganti pangkalan secara manual di layar utama. Untuk menjalankan antrean seluruh pangkalan secara otomatis sekaligus (Auto-Batch tanpa ditunggu), silakan upgrade ke Paket Enterprise 5.000 Tabung.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                }
            },
            confirmButton = {
                Button(onClick = { 
                    showUpgradePrompt = false 
                    onDismiss()
                }) {
                    Text("Mengerti")
                }
            }
        )
        return
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Column {
                Text("🏢 Antrean Semua Pangkalan", fontWeight = FontWeight.Bold)
                Text(
                    "Pilih file Excel untuk setiap pangkalan. Bot akan otomatis memproses berurutan sampai selesai semua.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray
                )
            }
        },
        text = {
            if (profiles.isEmpty()) {
                Text("Belum ada profil pangkalan tersimpan. Tambahkan profil pangkalan di layar utama terlebih dahulu.")
            } else {
                LazyColumn(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(profiles) { p ->
                        val isChecked = selectedMap[p.id] ?: true
                        val summary = fileSummaryMap[p.id] ?: "File belum dipilih"

                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Checkbox(
                                        checked = isChecked,
                                        onCheckedChange = { selectedMap[p.id] = it }
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(p.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text(p.phone, fontSize = 12.sp, color = Color.Gray)
                                    }
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(start = 40.dp, top = 4.dp)
                                ) {
                                    Text(
                                        summary,
                                        fontSize = 11.sp,
                                        color = if (nikListMap.containsKey(p.id)) Color(0xFF10B981) else Color.Gray
                                    )

                                    OutlinedButton(
                                        onClick = {
                                            currentPickingProfileId = p.id
                                            filePicker.launch("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                                        },
                                        shape = RoundedCornerShape(6.dp),
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                        modifier = Modifier.height(28.dp)
                                    ) {
                                        Text("Pilih Excel", fontSize = 10.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val queue = mutableListOf<com.mapbot.pertamina.data.QueuePangkalanItem>()
                    for (p in profiles) {
                        if (selectedMap[p.id] == true) {
                            val list = nikListMap[p.id]
                            if (list.isNullOrEmpty()) {
                                Toast.makeText(context, "Pilih file Excel untuk: ${p.name}", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            queue.add(com.mapbot.pertamina.data.QueuePangkalanItem(
                                profile = p,
                                nikList = list,
                                fileName = fileSummaryMap[p.id] ?: "Excel"
                            ))
                        }
                    }

                    if (queue.isEmpty()) {
                        Toast.makeText(context, "Centang minimal 1 pangkalan", Toast.LENGTH_SHORT).show()
                        return@Button
                    }

                    onStartBatch(queue)
                },
                enabled = profiles.isNotEmpty()
            ) {
                Text("▶ Mulai Semua Antrean")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal")
            }
        }
    )
}
