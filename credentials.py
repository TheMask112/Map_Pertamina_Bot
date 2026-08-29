"""
credentials.py
===============
Manajemen Akun & Multi-Pangkalan MAP Pertamina (Local Config).
"""

import os
import json
import uuid

CREDENTIAL_FILE = "credentials.json"
PROFILES_FILE = "pangkalan_profiles.json"


def save_credentials(username: str, password: str):
    """Simpan credentials aktif ke file."""
    data = {"username": username, "password": password}
    try:
        with open(CREDENTIAL_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception:
        pass


def load_credentials() -> tuple[str | None, str | None]:
    """
    Load credentials aktif dari profil terpilih atau fallback file credentials.
    Returns (username: str | None, password: str | None)
    """
    active = get_active_pangkalan()
    if active and active.get("username"):
        return active.get("username"), active.get("password")

    if not os.path.exists(CREDENTIAL_FILE):
        return None, None

    try:
        with open(CREDENTIAL_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("username"), data.get("password")
    except Exception:
        return None, None


def delete_credentials():
    """Hapus sesi credentials."""
    if os.path.exists(CREDENTIAL_FILE):
        try:
            os.remove(CREDENTIAL_FILE)
        except Exception:
            pass


# ==========================================
# MULTI-PANGKALAN PROFILE MANAGEMENT
# ==========================================

def get_pangkalan_profiles() -> list[dict]:
    """Mengambil semua profil pangkalan yang tersimpan."""
    if not os.path.exists(PROFILES_FILE):
        # Migrasi dari credentials.json lama jika ada
        u, p = None, None
        if os.path.exists(CREDENTIAL_FILE):
            try:
                with open(CREDENTIAL_FILE, "r", encoding="utf-8") as f:
                    d = json.load(f)
                    u, p = d.get("username"), d.get("password")
            except Exception:
                pass
        initial = []
        if u:
            initial.append({
                "id": str(uuid.uuid4()),
                "name": "Pangkalan Utama",
                "username": u,
                "password": p or ""
            })
            save_pangkalan_profiles(initial, active_id=initial[0]["id"])
        return initial

    try:
        with open(PROFILES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("profiles", [])
    except Exception:
        return []


def get_active_pangkalan_id() -> str | None:
    """Mengambil ID pangkalan yang sedang aktif."""
    if not os.path.exists(PROFILES_FILE):
        return None
    try:
        with open(PROFILES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("active_id")
    except Exception:
        return None


def get_active_pangkalan() -> dict | None:
    """Mengambil profil pangkalan aktif."""
    profiles = get_pangkalan_profiles()
    if not profiles:
        return None
    active_id = get_active_pangkalan_id()
    for p in profiles:
        if p.get("id") == active_id:
            return p
    return profiles[0]


def save_pangkalan_profiles(profiles: list[dict], active_id: str | None = None):
    """Menyimpan daftar profil pangkalan dan ID aktif."""
    cur_active = active_id or get_active_pangkalan_id()
    if not cur_active and profiles:
        cur_active = profiles[0].get("id")

    payload = {
        "active_id": cur_active,
        "profiles": profiles
    }
    try:
        with open(PROFILES_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
    except Exception:
        pass


def set_active_pangkalan(profile_id: str):
    """Mengubah pangkalan aktif."""
    profiles = get_pangkalan_profiles()
    active_p = next((p for p in profiles if p.get("id") == profile_id), None)
    if active_p:
        save_pangkalan_profiles(profiles, active_id=profile_id)
        save_credentials(active_p.get("username", ""), active_p.get("password", ""))


def add_or_update_pangkalan(name: str, username: str, password: str, profile_id: str | None = None) -> dict:
    """Menambah atau memperbarui profil pangkalan."""
    profiles = get_pangkalan_profiles()
    if profile_id:
        for p in profiles:
            if p.get("id") == profile_id:
                p["name"] = name.strip()
                p["username"] = username.strip()
                p["password"] = password.strip()
                save_pangkalan_profiles(profiles)
                if get_active_pangkalan_id() == profile_id:
                    save_credentials(username.strip(), password.strip())
                return p

    new_p = {
        "id": str(uuid.uuid4()),
        "name": name.strip(),
        "username": username.strip(),
        "password": password.strip()
    }
    profiles.append(new_p)
    save_pangkalan_profiles(profiles, active_id=new_p["id"])
    save_credentials(username.strip(), password.strip())
    return new_p


def delete_pangkalan(profile_id: str):
    """Menghapus profil pangkalan."""
    profiles = [p for p in get_pangkalan_profiles() if p.get("id") != profile_id]
    new_active = profiles[0].get("id") if profiles else None
    save_pangkalan_profiles(profiles, active_id=new_active)
    if new_active:
        set_active_pangkalan(new_active)
    else:
        delete_credentials()
