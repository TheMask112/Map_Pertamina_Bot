package com.mapbot.pertamina.security

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

data class PangkalanProfile(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val phone: String,
    val pass: String
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
        val active = getActiveProfile()
        if (active != null) {
            val updated = active.copy(phone = phone, pass = pass)
            saveProfile(updated)
        } else {
            val defaultProfile = PangkalanProfile(
                name = "Pangkalan Utama",
                phone = phone,
                pass = pass
            )
            saveProfile(defaultProfile)
            setActiveProfile(defaultProfile.id)
        }
        
        sharedPrefs.edit()
            .putString("phone", phone)
            .putString("pass", pass)
            .apply()
    }

    fun getPhone(): String {
        val active = getActiveProfile()
        if (active != null && active.phone.isNotBlank()) return active.phone
        return sharedPrefs.getString("phone", "") ?: ""
    }

    fun getPass(): String {
        val active = getActiveProfile()
        if (active != null && active.pass.isNotBlank()) return active.pass
        return sharedPrefs.getString("pass", "") ?: ""
    }

    // === MULTI PANGKALAN PROFILE MANAGEMENT ===
    fun getProfiles(): List<PangkalanProfile> {
        val jsonStr = sharedPrefs.getString("profiles_json", null)
        if (jsonStr.isNullOrBlank()) {
            val legacyPhone = sharedPrefs.getString("phone", "") ?: ""
            val legacyPass = sharedPrefs.getString("pass", "") ?: ""
            if (legacyPhone.isNotBlank()) {
                val initial = listOf(PangkalanProfile(name = "Pangkalan Utama", phone = legacyPhone, pass = legacyPass))
                saveProfilesList(initial)
                return initial
            }
            return emptyList()
        }

        try {
            val array = JSONArray(jsonStr)
            val list = mutableListOf<PangkalanProfile>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                list.add(
                    PangkalanProfile(
                        id = obj.optString("id", UUID.randomUUID().toString()),
                        name = obj.optString("name", "Pangkalan"),
                        phone = obj.optString("phone", ""),
                        pass = obj.optString("pass", "")
                    )
                )
            }
            return list
        } catch (e: Exception) {
            return emptyList()
        }
    }

    private fun saveProfilesList(list: List<PangkalanProfile>) {
        val array = JSONArray()
        for (p in list) {
            val obj = JSONObject()
            obj.put("id", p.id)
            obj.put("name", p.name)
            obj.put("phone", p.phone)
            obj.put("pass", p.pass)
            array.put(obj)
        }
        sharedPrefs.edit().putString("profiles_json", array.toString()).apply()
    }

    fun getActiveProfile(): PangkalanProfile? {
        val profiles = getProfiles()
        if (profiles.isEmpty()) return null
        val activeId = sharedPrefs.getString("active_profile_id", null)
        return profiles.find { it.id == activeId } ?: profiles.first()
    }

    fun setActiveProfile(id: String) {
        sharedPrefs.edit().putString("active_profile_id", id).apply()
        val active = getProfiles().find { it.id == id }
        if (active != null) {
            sharedPrefs.edit()
                .putString("phone", active.phone)
                .putString("pass", active.pass)
                .apply()
        }
    }

    fun saveProfile(profile: PangkalanProfile) {
        val list = getProfiles().toMutableList()
        val idx = list.indexOfFirst { it.id == profile.id }
        if (idx >= 0) {
            list[idx] = profile
        } else {
            list.add(profile)
        }
        saveProfilesList(list)
        if (getActiveProfile() == null || list.size == 1) {
            setActiveProfile(profile.id)
        }
    }

    fun deleteProfile(id: String) {
        val list = getProfiles().toMutableList()
        list.removeAll { it.id == id }
        saveProfilesList(list)
        if (sharedPrefs.getString("active_profile_id", "") == id) {
            val next = list.firstOrNull()
            if (next != null) {
                setActiveProfile(next.id)
            } else {
                sharedPrefs.edit().remove("active_profile_id").apply()
            }
        }
    }
}
