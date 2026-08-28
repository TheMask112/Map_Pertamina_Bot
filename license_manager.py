"""
license_manager.py
==================
Highly secure asymmetric tiered license system: Starter / Pro / Enterprise
- RSA-2048 Digital Signatures for license keys (tamper-proof)
- Time-based expiry (hari)
- Usage-based quota (jumlah NIK)
- Locally tracked and obfuscated across 3 locations to prevent backups/resets:
  1. Local license.dat (machine-specific Fernet encrypted state)
  2. Windows Registry (obscured path under HKCU)
  3. Hidden/Obfuscated system file in Local AppData
"""

import hashlib
import json
import os
import base64
import subprocess
import winreg
from datetime import datetime
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import load_pem_public_key
try:
    import requests as _requests
except ImportError:
    _requests = None

# ============================================================
# CONFIGURATION & ASYMMETRIC KEYS
# ============================================================
LICENSE_FILE = "license.dat"

# === API Sinkron dengan Android & Web ===
_WEB_API_URL = "https://map-pertamina-web.vercel.app/api"

# Embedded RSA Public Key (The private key is kept strictly secure by Admin)
PUBLIC_KEY_PEM = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmXr6f7yQnssy07PjPxSV
sYiNMSYikhp6xtpSw4LLInqM2XruUO9ULZin6q5ZxKf+5p1JT+c8JagyjnfTO9XE
CVIgFQG4co2dDwur1Ax7kmcGOEmvpsweIHikUOU4qE3SHq/6qX/i6Eri/EdOpS3B
gEdOUokHqXm54g7abfoAZw8N6tttKl+xeqORXokz/n7n+CkZkEnFqgEknCXaHBJg
90wzoe+b67VQreSyEgw3RlfE0OXUi3HU6DfdL8I/KuI14RbXi9F9SkbEFs65xAIH
ccjKJoS7E4s/lmHS2hbZcPxr1XRMKObynZ1CpmTlu0VBkgfITwdAOFuYsr9y7KK8
OwIDAQAB
-----END PUBLIC KEY-----"""

# License tier parameters (Sinkron dengan website map-pertamina-web config.ts)
PAKETS = {
    "STARTER":    {
        "nama": "Starter",
        "hari": 36500,  # 100 Tahun (Lifetime / Tanpa Batas Waktu)
        "kuota": 500,
        "harga": "Rp 75.000",
        "icon": "🟢",
        "desc": "Paket dasar untuk penggunaan personal atau bisnis kecil. Memproses hingga 500 tabung NIK.",
        "fitur": ["✔ 500 Tabung", "✔ Lifetime (Tanpa Batas Waktu)", "✔ Captcha Auto/Manual", "✔ Multi-Batch"],
    },
    "PRO":        {
        "nama": "Pro",
        "hari": 36500,  # 100 Tahun (Lifetime / Tanpa Batas Waktu)
        "kuota": 2000,
        "harga": "Rp 250.000",
        "icon": "🔵",
        "desc": "Paket populer untuk bisnis menengah. Memproses hingga 2.000 tabung NIK dengan harga lebih hemat.",
        "fitur": ["✔ 2.000 Tabung", "✔ Lifetime (Tanpa Batas Waktu)", "✔ Captcha Auto/Manual", "✔ Multi-Batch", "✔ Prioritas Pemrosesan & Update"],
    },
    "ENTERPRISE": {
        "nama": "Enterprise",
        "hari": 36500,  # 100 Tahun (Lifetime / Tanpa Batas Waktu)
        "kuota": 5000,
        "harga": "Rp 500.000",
        "icon": "🟣",
        "desc": "Paket volume besar untuk distributor gas atau agen besar. Memproses hingga 5.000 tabung NIK.",
        "fitur": ["✔ 5.000 Tabung", "✔ Lifetime (Tanpa Batas Waktu)", "✔ Captcha Auto/Manual", "✔ Multi-Batch", "✔ Dukungan Teknis Prioritas 24/7"],
    },
}

# ============================================================
# SYSTEM HARDWARE ID & SECURITY LAYER
# ============================================================

def get_hwid() -> str:
    """Ambil Hardware ID unik dari komputer dengan multi-tier fallback."""
    # 1. Coba PowerShell Get-CimInstance (Standar modern Windows 10/11)
    if os.name == 'nt':
        try:
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            cmd = 'powershell -NoProfile -NonInteractive -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"'
            output = subprocess.check_output(
                cmd,
                shell=True,
                stdin=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                startupinfo=startupinfo,
                creationflags=0x08000000
            ).decode().strip()
            uuid_val = output.split('\n')[-1].strip()
            if uuid_val and len(uuid_val) > 8 and "error" not in uuid_val.lower():
                return uuid_val.upper()
        except Exception:
            pass

    # 2. Cek Windows Registry MachineGuid
    if os.name == 'nt':
        try:
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography", 0, winreg.KEY_READ | winreg.KEY_WOW64_64KEY) as k:
                guid, _ = winreg.QueryValueEx(k, "MachineGuid")
                if guid and len(guid) > 8:
                    return str(guid).strip().upper()
        except Exception:
            try:
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography", 0, winreg.KEY_READ) as k:
                    guid, _ = winreg.QueryValueEx(k, "MachineGuid")
                    if guid and len(guid) > 8:
                        return str(guid).strip().upper()
            except Exception:
                pass

    # 3. Fallback ke WMIC (Legacy Windows)
    try:
        startupinfo = None
        if os.name == 'nt':
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
        output = subprocess.check_output(
            'wmic csproduct get uuid', 
            shell=True, 
            stdin=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            startupinfo=startupinfo,
            creationflags=0x08000000 if os.name == 'nt' else 0
        ).decode()
        hwid = output.strip().split('\n')[-1].strip()
        if hwid and len(hwid) > 8 and "error" not in hwid.lower():
            return hwid.upper()
    except Exception:
        pass

    # 4. Fallback Hostname + Platform identifier
    import platform
    import socket
    fallback_raw = f"{platform.node()}_{platform.machine()}_{socket.gethostname()}"
    return hashlib.sha256(fallback_raw.encode()).hexdigest()[:32].upper()


def get_all_possible_hwids() -> set[str]:
    """Mengumpulkan semua representasi HWID yang sah di mesin ini untuk menjamin kompatibilitas lisensi."""
    hwids = set()
    
    # 1. PowerShell CIM UUID
    if os.name == 'nt':
        try:
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            cmd = 'powershell -NoProfile -NonInteractive -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"'
            output = subprocess.check_output(
                cmd, shell=True, stdin=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                startupinfo=startupinfo, creationflags=0x08000000
            ).decode().strip()
            uuid_val = output.split('\n')[-1].strip().upper()
            if uuid_val and len(uuid_val) > 8 and "error" not in uuid_val.lower():
                hwids.add(uuid_val)
                hwids.add(uuid_val.replace("-", ""))
        except Exception:
            pass

    # 2. Windows Registry MachineGuid
    if os.name == 'nt':
        for flag in [winreg.KEY_READ | winreg.KEY_WOW64_64KEY, winreg.KEY_READ]:
            try:
                with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography", 0, flag) as k:
                    guid, _ = winreg.QueryValueEx(k, "MachineGuid")
                    if guid and len(guid) > 8:
                        g = str(guid).strip().upper()
                        hwids.add(g)
                        hwids.add(g.replace("-", ""))
            except Exception:
                pass

    # 3. WMIC Legacy
    if os.name == 'nt':
        try:
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            output = subprocess.check_output(
                'wmic csproduct get uuid', shell=True, stdin=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                startupinfo=startupinfo, creationflags=0x08000000
            ).decode().strip()
            wmic_val = output.split('\n')[-1].strip().upper()
            if wmic_val and len(wmic_val) > 8 and "error" not in wmic_val.lower():
                hwids.add(wmic_val)
                hwids.add(wmic_val.replace("-", ""))
        except Exception:
            pass

    # 4. Hostname/Platform Hash
    import platform
    import socket
    fallback_raw = f"{platform.node()}_{platform.machine()}_{socket.gethostname()}"
    h = hashlib.sha256(fallback_raw.encode()).hexdigest()[:32].upper()
    hwids.add(h)
    hwids.add(h.replace("-", ""))
    
    return hwids


def _get_fernet(hwid: str) -> Fernet:
    """Derive symmetric key dari client HWID untuk local state encryption."""
    salt = "MAP_PERTAMINA_LOCAL_FERNET_SALT_2026"
    # Normalisasi HWID tanpa tanda minus agar Fernet key selalu identik
    clean_hwid = str(hwid).replace("-", "").upper()
    key_bytes = hashlib.sha256((clean_hwid + salt).encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)

# ============================================================
# OBFUSCATED TRIPLE-LOCATION SYNC TRACKER (ANTI-TAMPER)
# ============================================================

def _get_registry_quota(hwid: str, license_key: str = "") -> int:
    """Mengambil riwayat kuota terpakai dari Windows Registry."""
    try:
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\MAP_License")
        val_name = hashlib.sha256((hwid + license_key).encode()).hexdigest()[:16]
        val, _ = winreg.QueryValueEx(key, val_name)
        return int(val)
    except Exception:
        return 0


def _set_registry_quota(hwid: str, count: int, license_key: str = ""):
    """Menyimpan riwayat kuota terpakai ke Windows Registry."""
    try:
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\MAP_License")
        val_name = hashlib.sha256((hwid + license_key).encode()).hexdigest()[:16]
        winreg.SetValueEx(key, val_name, 0, winreg.REG_DWORD, count)
    except Exception:
        pass


def _get_appdata_quota(hwid: str, license_key: str = "") -> int:
    """Mengambil riwayat kuota dari hidden file di Local AppData."""
    try:
        key_hash = hashlib.sha256(license_key.encode()).hexdigest()[:8]
        filename = f"crypto_cache_{key_hash}.bin"
        path = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft', 'Credentials', filename)
        if os.path.exists(path):
            with open(path, "rb") as f:
                data = f.read()
            xor_key = hwid.encode()
            dec = bytes([b ^ xor_key[i % len(xor_key)] for i, b in enumerate(data)])
            return int(dec.decode())
    except Exception:
        pass
    return 0


def _set_appdata_quota(hwid: str, count: int, license_key: str = ""):
    """Menyimpan riwayat kuota terpakai ke hidden file di Local AppData."""
    try:
        key_hash = hashlib.sha256(license_key.encode()).hexdigest()[:8]
        filename = f"crypto_cache_{key_hash}.bin"
        cred_dir = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft', 'Credentials')
        os.makedirs(cred_dir, exist_ok=True)
        path = os.path.join(cred_dir, filename)
        xor_key = hwid.encode()
        data = str(count).encode()
        enc = bytes([b ^ xor_key[i % len(xor_key)] for i, b in enumerate(data)])
        with open(path, "wb") as f:
            f.write(enc)
            
        if os.name == 'nt':
            import ctypes
            ctypes.windll.kernel32.SetFileAttributesW(path, 2)  # 2 = FILE_ATTRIBUTE_HIDDEN
    except Exception:
        pass

# ============================================================
# CLIENT: Verification and Quota Operations
# ============================================================

def safe_b64url_decode(s: str) -> bytes:
    """Decode base64url string safely with automatic padding handling."""
    s_clean = s.strip()
    rem = len(s_clean) % 4
    if rem > 0:
        s_clean += "=" * (4 - rem)
    return base64.urlsafe_b64decode(s_clean.encode())


def clean_license_key_string(key: str) -> str:
    """Membersihkan format key dari markdown backticks, quotes, label, dan whitespace."""
    if not key:
        return ""
    k = str(key).strip().replace("`", "").replace('"', '').replace("'", "")
    for token in k.replace("\r", " ").replace("\n", " ").split():
        token_clean = token.strip()
        if "." in token_clean and len(token_clean) > 50:
            return token_clean
    return k.strip()


def verify_license_key_signature(license_key: str, hwid: str = "") -> tuple[bool, dict | None]:
    """Verifikasi RSA Signature dari License Key (kompatibel dengan Telegram & Web generator)."""
    try:
        clean_key = clean_license_key_string(license_key)
        parts = clean_key.split(".")
        if len(parts) != 2:
            return False, None
            
        json_b64, sig_b64 = parts[0], parts[1]
        json_bytes = safe_b64url_decode(json_b64)
        sig_bytes = safe_b64url_decode(sig_b64)
        
        # RSA Signature verification
        pub_key = load_pem_public_key(PUBLIC_KEY_PEM.encode())
        pub_key.verify(
            sig_bytes,
            json_bytes,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        
        payload = json.loads(json_bytes.decode())
        payload_hwid = str(payload.get("hwid", "")).strip().replace("-", "").upper()
        
        if hwid:
            client_hwid = str(hwid).strip().replace("-", "").upper()
            if payload_hwid == client_hwid:
                return True, payload
                
        # Jika client_hwid tidak langsung cocok, cek seluruh representasi HWID sah mesin ini
        possible_hwids = get_all_possible_hwids()
        clean_possible = {h.replace("-", "").upper() for h in possible_hwids}
        if payload_hwid in clean_possible:
            return True, payload
            
        return False, None
    except Exception as e:
        return False, None


def load_license(hwid: str) -> dict | None:
    """Load dan decrypt license dari file local state + sync triple-backup."""
    if not os.path.exists(LICENSE_FILE):
        return None
        
    try:
        with open(LICENSE_FILE, "r") as f:
            raw_data = f.read().strip()
            
        state = None
        # 1. Coba decrypt sebagai Fernet encrypted state
        try:
            f_obj = _get_fernet(hwid)
            decrypted = f_obj.decrypt(base64.urlsafe_b64decode(raw_data.encode())).decode()
            state = json.loads(decrypted)
        except Exception:
            # 2. Jika bukan Fernet token, periksa apakah raw_data adalah raw license key (payload.signature)
            cleaned_key = clean_license_key_string(raw_data)
            valid_sig, signed_payload = verify_license_key_signature(cleaned_key, hwid)
            if valid_sig and signed_payload:
                reg_terpakai = _get_registry_quota(hwid, cleaned_key)
                appdata_terpakai = _get_appdata_quota(hwid, cleaned_key)
                actual_terpakai = max(0, reg_terpakai, appdata_terpakai)
                state = {
                    "license_key": cleaned_key,
                    "kuota_terpakai": actual_terpakai
                }
                save_license_payload(state, hwid)

        if not state:
            return None

        license_key = state.get("license_key")
        file_terpakai = state.get("kuota_terpakai", 0)
        
        # Verify RSA Digital Signature
        valid_sig, signed_payload = verify_license_key_signature(license_key, hwid)
        if not valid_sig or signed_payload is None:
            return None
            
        # Triple-backup sync & auto-heal
        reg_terpakai = _get_registry_quota(hwid, license_key)
        appdata_terpakai = _get_appdata_quota(hwid, license_key)
        
        actual_terpakai = max(file_terpakai, reg_terpakai, appdata_terpakai)
        
        # Healing out of sync locations
        if file_terpakai < actual_terpakai:
            state["kuota_terpakai"] = actual_terpakai
            save_license_payload(state, hwid)
        if reg_terpakai < actual_terpakai:
            _set_registry_quota(hwid, actual_terpakai, license_key)
        if appdata_terpakai < actual_terpakai:
            _set_appdata_quota(hwid, actual_terpakai, license_key)
            
        payload = {
            "hwid": hwid,
            "paket": signed_payload.get("paket"),
            "expiry": signed_payload.get("expiry"),
            "kuota_total": signed_payload.get("kuota_total"),
            "kuota_terpakai": actual_terpakai,
            "license_key": license_key
        }
        return payload
    except Exception:
        return None


def save_license_key(key: str):
    """Aktivasi license key baru."""
    cleaned_key = clean_license_key_string(key)
    hwid = get_hwid()
    valid_sig, signed_payload = verify_license_key_signature(cleaned_key, hwid)
    if not valid_sig or signed_payload is None:
        # Simpan raw untuk dicoba kembali oleh load_license / verify_license
        with open(LICENSE_FILE, "w") as f:
            f.write(cleaned_key)
        return
        
    # Cek usage existing di system untuk prevent backup/restore bypass
    reg_terpakai = _get_registry_quota(hwid, cleaned_key)
    appdata_terpakai = _get_appdata_quota(hwid, cleaned_key)
    actual_terpakai = max(0, reg_terpakai, appdata_terpakai)
    
    state = {
        "license_key": cleaned_key,
        "kuota_terpakai": actual_terpakai
    }
    save_license_payload(state, hwid)


def save_license_payload(state: dict, hwid: str):
    """Menyimpan state lokal secara terenkripsi Fernet."""
    f_obj = _get_fernet(hwid)
    encrypted = f_obj.encrypt(json.dumps(state).encode())
    raw_key = base64.urlsafe_b64encode(encrypted).decode()
    with open(LICENSE_FILE, "w") as f:
        f.write(raw_key)


def verify_license(hwid: str, required_quota: int = 1) -> tuple[bool, str, dict | None]:
    """Verifikasi status lisensi secara menyeluruh."""
    payload = load_license(hwid)
    if not payload:
        return False, "License tidak ditemukan atau tidak valid.", None
        
    # Cek Expiry
    try:
        # Hapus bagian pecahan detik/zona waktu jika mempersulit parsing
        exp_str = payload["expiry"].split(".")[0]
        if "T" in exp_str:
            expiry = datetime.strptime(exp_str, "%Y-%m-%dT%H:%M:%S")
        else:
            expiry = datetime.strptime(exp_str, "%Y-%m-%d")
            
        if datetime.now() > expiry:
            return False, f"License kadaluarsa sejak {expiry.strftime('%d %b %Y')}.", None
    except Exception as e:
        return False, f"Format expiry tidak valid: {e}", None
        
    # Cek Kuota
    terpakai = payload.get("kuota_terpakai", 0)
    total = payload.get("kuota_total", 0)
    if terpakai + required_quota > total:
        return False, f"Kuota tidak mencukupi (Sisa: {total - terpakai}, butuh: {required_quota} tabung).", None
        
    return True, "OK", payload


def sync_license_status_online(hwid: str) -> bool:
    """Sinkronisasi status lisensi (kuota terpakai) dari server secara online."""
    if _requests is None:
        return False
    # Gunakan load_license dasar tanpa trigger recursif
    if not os.path.exists(LICENSE_FILE):
        return False
    try:
        with open(LICENSE_FILE, "r") as f:
            raw_data = f.read().strip()
        f_obj = _get_fernet(hwid)
        decrypted = f_obj.decrypt(base64.urlsafe_b64decode(raw_data.encode())).decode()
        state = json.loads(decrypted)
        license_key = state.get("license_key")
        if not license_key:
            return False

        response = _requests.get(
            f"{_WEB_API_URL}/license/status",
            headers={"x-license-key": license_key},
            timeout=5,
            proxies={"http": None, "https": None}
        )
        if response.status_code == 200:
            data = response.json()
            server_used = data.get("kuota_terpakai", -1)
            if server_used != -1:
                # Update local state
                state["kuota_terpakai"] = server_used
                save_license_payload(state, hwid)
                _set_registry_quota(hwid, server_used, license_key)
                _set_appdata_quota(hwid, server_used, license_key)
                return True
    except Exception:
        pass
    return False


def consume_quota(hwid: str, jumlah: int = 1) -> bool:
    """Mengurangi kuota NIK saat transaksi berhasil."""
    valid, _, payload = verify_license(hwid, jumlah)
    if not valid or payload is None:
        return False
        
    new_terpakai = payload.get("kuota_terpakai", 0) + jumlah
    
    # 1. Update file state local
    state = {
        "license_key": payload["license_key"],
        "kuota_terpakai": new_terpakai
    }
    save_license_payload(state, hwid)
    
    # 2. Update Windows Registry
    _set_registry_quota(hwid, new_terpakai, payload["license_key"])
    
    # 3. Update Hidden AppData
    _set_appdata_quota(hwid, new_terpakai, payload["license_key"])
    
    # 4. Sync ke server secara online (fire & forget di background thread)
    if _requests is not None:
        import threading
        def sync_task():
            try:
                _requests.post(
                    f"{_WEB_API_URL}/license/consume",
                    json={"amount": jumlah},
                    headers={"x-license-key": payload["license_key"]},
                    timeout=5,
                    proxies={"http": None, "https": None}
                )
            except Exception:
                pass
        threading.Thread(target=sync_task, daemon=True).start()
        
    return True


def get_license_info(hwid: str) -> dict:
    """Mendapatkan statistik lisensi lengkap untuk ditampilkan di GUI."""
    # Sinkronisasi dengan server secara synchronous agar data yang muncul langsung update
    sync_license_status_online(hwid)
    
    valid, pesan, payload = verify_license(hwid)
    if not valid or payload is None:
        return {"valid": False, "pesan": pesan}
        
    try:
        exp_str = payload["expiry"].split(".")[0]
        if "T" in exp_str:
            expiry = datetime.strptime(exp_str, "%Y-%m-%dT%H:%M:%S")
        else:
            expiry = datetime.strptime(exp_str, "%Y-%m-%d")
    except Exception:
        expiry = datetime.now()
        
    sisa_hari = (expiry - datetime.now()).days
    terpakai = payload.get("kuota_terpakai", 0)
    total = payload.get("kuota_total", 0)
    
    return {
        "valid": True,
        "paket": PAKETS.get(payload["paket"], {}).get("nama", payload["paket"]),
        "expiry": expiry.strftime("%d %b %Y"),
        "sisa_hari": max(0, sisa_hari),
        "kuota_terpakai": terpakai,
        "kuota_total": total,
        "kuota_sisa": max(0, total - terpakai),
        "persen_terpakai": min(100.0, round((terpakai / total) * 100, 1)) if total > 0 else 0,
    }


def generate_license_key(hwid: str, paket: str, custom_hari: int = None, custom_kuota: int = None) -> str:
    """
    Fungsi stub di client. 
    Proses generate yang sesungguhnya dipindahkan ke license_generator.py (hanya dipegang Admin).
    """
    raise PermissionError("Fungsi generate lisensi dinonaktifkan di sisi client demi keamanan.")


# ============================================================
# AUTO-ACTIVATE VIA API (SINKRON DENGAN ANDROID & WEB)
# ============================================================

def redeem_via_api(voucher_code: str, hwid: str = None) -> tuple[bool, str]:
    """
    Meredeem voucher langsung via API server tanpa perlu Telegram.
    Dipanggil dari GUI setelah pembayaran Midtrans berhasil.
    
    Sinkron dengan:
    - PaymentHelper.kt :: redeemDirect() (Android)
    - /api/redeem-direct (Backend Vercel)
    
    Returns:
        (True, license_key)  jika berhasil
        (False, pesan_error) jika gagal
    """
    if _requests is None:
        return False, "Library 'requests' tidak terinstall. Jalankan: pip install requests"
    
    if hwid is None:
        hwid = get_hwid()
    
    clean_hwid = str(hwid).replace("-", "").upper()
    
    try:
        response = _requests.post(
            f"{_WEB_API_URL}/redeem-direct",
            json={"voucherCode": voucher_code.strip().upper(), "hwid": clean_hwid},
            headers={
                "Content-Type": "application/json"
            },
            timeout=15,
            proxies={"http": None, "https": None}  # Bypass proxy sistem
        )
        data = response.json()
        
        if response.status_code == 200 and data.get("success"):
            license_key = data.get("licenseKey", "")
            if license_key:
                # Simpan license key ke lokal
                save_license_key(license_key)
                return True, license_key
        
        error_msg = data.get("error", "Gagal meredeem voucher.")
        return False, error_msg
        
    except Exception as e:
        return False, f"Koneksi ke server gagal: {e}"


def poll_order_for_license(order_id: str, hwid: str = None, timeout_minutes: int = 10) -> tuple[bool, str]:
    """
    Polling status order ke server hingga lisensi tersedia atau timeout.
    Sinkron dengan PaymentHelper.kt :: pollOrderForLicense() (Android).
    
    Returns:
        (True, license_key)  jika lisensi berhasil didapat
        (False, pesan_error) jika timeout atau gagal
    """
    if _requests is None:
        return False, "Library 'requests' tidak terinstall."
    
    if hwid is None:
        hwid = get_hwid()
    
    import time
    max_wait = timeout_minutes * 60
    poll_interval = 4  # detik
    elapsed = 0
    
    while elapsed < max_wait:
        try:
            response = _requests.get(
                f"{_WEB_API_URL}/orders/{order_id}/status",
                timeout=10,
                proxies={"http": None, "https": None}
            )
            if response.status_code == 200:
                data = response.json()
                status = data.get("status", "")
                license_key = data.get("licenseKey", "")
                
                if status == "REDEEMED" and license_key:
                    # Auto-activated oleh webhook
                    save_license_key(license_key)
                    return True, license_key
                elif status == "PAID":
                    # Fallback: redeem manual via API
                    voucher_code = data.get("voucherCode", "")
                    if voucher_code:
                        return redeem_via_api(voucher_code, hwid)
                elif status in ("EXPIRED", "FAILED"):
                    return False, "Transaksi kadaluarsa atau gagal."
        except Exception:
            pass
        
        time.sleep(poll_interval)
        elapsed += poll_interval
    
    return False, "Waktu tunggu habis. Hubungi admin via Telegram ID: 1203246492 (@MapPertaminaSupport)"

