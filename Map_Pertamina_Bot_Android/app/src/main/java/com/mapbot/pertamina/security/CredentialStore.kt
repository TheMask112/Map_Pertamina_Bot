package com.mapbot.pertamina.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class CredentialStore(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPrefs = EncryptedSharedPreferences.create(
        context,
        "map_bot_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveLogin(phone: String, pass: String) {
        sharedPrefs.edit()
            .putString("phone", phone)
            .putString("pass", pass)
            .apply()
    }

    fun getPhone(): String = sharedPrefs.getString("phone", "") ?: ""
    fun getPass(): String = sharedPrefs.getString("pass", "") ?: ""
}
