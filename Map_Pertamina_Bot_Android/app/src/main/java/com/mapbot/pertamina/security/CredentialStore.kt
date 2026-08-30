package com.mapbot.pertamina.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import org.json.JSONObject

data class PangkalanProfile(
    val id: String = java.util.UUID.randomUUID().toString(),
    var name: String,
    var phone: String,
    var pass: String
)

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

    // Multi-Pangkalan Profiles
    fun getProfiles(): List<PangkalanProfile> {
        val raw = sharedPrefs.getString("pangkalan_profiles_json", null) ?: return emptyList()
        val list = mutableListOf<PangkalanProfile>()
        try {
            val arr = JSONArray(raw)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                list.add(
                    PangkalanProfile(
                        id = obj.optString("id", java.util.UUID.randomUUID().toString()),
                        name = obj.optString("name", "Pangkalan"),
                        phone = obj.optString("phone", ""),
                        pass = obj.optString("pass", "")
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return list
    }

    fun saveProfile(profile: PangkalanProfile) {
        val current = getProfiles().toMutableList()
        val idx = current.indexOfFirst { it.id == profile.id }
        if (idx != -1) {
            current[idx] = profile
        } else {
            current.add(profile)
        }
        saveProfilesList(current)
        if (getActiveProfile() == null) {
            setActiveProfile(profile.id)
        }
    }

    fun deleteProfile(id: String) {
        val current = getProfiles().toMutableList()
        current.removeAll { it.id == id }
        saveProfilesList(current)
    }

    fun getActiveProfile(): PangkalanProfile? {
        val activeId = sharedPrefs.getString("active_pangkalan_id", null) ?: return getProfiles().firstOrNull()
        return getProfiles().find { it.id == activeId } ?: getProfiles().firstOrNull()
    }

    fun setActiveProfile(id: String) {
        sharedPrefs.edit().putString("active_pangkalan_id", id).apply()
    }

    private fun saveProfilesList(list: List<PangkalanProfile>) {
        val arr = JSONArray()
        for (p in list) {
            val obj = JSONObject().apply {
                put("id", p.id)
                put("name", p.name)
                put("phone", p.phone)
                put("pass", p.pass)
            }
            arr.put(obj)
        }
        sharedPrefs.edit().putString("pangkalan_profiles_json", arr.toString()).apply()
    }
}

