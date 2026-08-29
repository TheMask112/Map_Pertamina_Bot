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
    var showUpgradePrompt by remember { mutableStateOf(false) }

    if (showUpgradePrompt) {
        AlertDialog(
            onDismissRequest = { showUpgradePrompt = false },
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
                        "🏢 Fitur Multi-Pangkalan (Kelola Banyak Akun) eksklusif untuk Paket Enterprise 5.000 Tabung.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Paket aktif Anda saat ini: ${licenseStatus.paket} (${licenseStatus.totalQuota} Tabung).",
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Silakan hubungi admin untuk upgrade lisensi ke Paket Enterprise agar dapat mengelola banyak pangkalan sekaligus di 1 perangkat.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray
                    )
                }
            },
            confirmButton = {
                Button(onClick = { showUpgradePrompt = false }) {
                    Text("Mengerti")
                }
            }
        )
    }

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
                        if (isEnterprise || profiles.isEmpty()) {
                            editingProfile = null
                            showAddEditDialog = true
                        } else {
                            showUpgradePrompt = true
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(
                        if (isEnterprise || profiles.isEmpty()) Icons.Default.Add else Icons.Default.Lock,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(if (isEnterprise || profiles.isEmpty()) "Tambah Pangkalan Baru" else "Tambah Pangkalan (Khusus Enterprise)")
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
