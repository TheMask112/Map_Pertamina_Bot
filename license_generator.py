"""
license_generator.py
====================
Script ADMIN untuk membuat License Key menggunakan tanda tangan digital RSA-2048.
JANGAN berikan file ini kepada klien! File ini menyimpan Private Key rahasia.
"""

import os
import json
import base64
from datetime import datetime, timedelta
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import load_pem_private_key

from license_manager import PAKETS

# Private Key RSA-2048 (Disimpan rahasia oleh pembuat bot/admin, tidak dibagikan ke client)
# Load Private Key dari file eksternal (JANGAN di-commit ke Git)
PRIVATE_KEY_FILE = "private_key.pem"
if not os.path.exists(PRIVATE_KEY_FILE):
    raise FileNotFoundError(
        f"File Private Key '{PRIVATE_KEY_FILE}' tidak ditemukan!\n"
        "Harap buat file 'private_key.pem' dan paste private key RSA-2048 Anda di dalamnya."
    )

with open(PRIVATE_KEY_FILE, "r") as f:
    PRIVATE_KEY_PEM = f.read().strip()


def generate_license_key(hwid: str, paket: str, custom_hari: int = None, custom_kuota: int = None) -> str:
    """Membuat license key bertanda tangan digital RSA-2048."""
    if paket not in PAKETS:
        raise ValueError(f"Paket tidak valid: {paket}")
    
    p = PAKETS[paket]
    hari = custom_hari or p["hari"]
    kuota = custom_kuota or p["kuota"]
    
    expiry = (datetime.now() + timedelta(days=hari)).isoformat()
    
    payload = {
        "hwid": hwid,
        "paket": paket,
        "expiry": expiry,
        "kuota_total": kuota
    }
    
    # 1. Base64 JSON
    json_bytes = json.dumps(payload).encode()
    json_b64 = base64.urlsafe_b64encode(json_bytes).decode()
    
    # 2. RSA Sign JSON menggunakan Private Key
    priv_key = load_pem_private_key(PRIVATE_KEY_PEM.encode(), password=None)
    signature = priv_key.sign(
        json_bytes,
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    sig_b64 = base64.urlsafe_b64encode(signature).decode()
    
    # Return formatted license key: data.signature
    return f"{json_b64}.{sig_b64}"


if __name__ == "__main__":
    print("=" * 60)
    print("   GENERATOR LISENSI BOT MAP PERTAMINA v3 (ASIG-RSA)")
    print("=" * 60)
    
    hwid_klien = input("\nMasukkan HWID dari Klien: ").strip()
    if not hwid_klien:
        print("HWID tidak boleh kosong!")
        exit()
    
    print("\nPilih Paket:")
    for i, (kode, info) in enumerate(PAKETS.items(), 1):
        print(f"  {i}. {info['nama']:12} | {info['hari']:5} hari | Kuota: {info['kuota']:>7} NIK | {info['harga']}")
    
    pilihan = input("\nMasukkan nomor paket (1-3): ").strip()
    try:
        idx = int(pilihan) - 1
        if idx < 0 or idx >= len(PAKETS):
            raise ValueError()
        kode_paket = list(PAKETS.keys())[idx]
    except (ValueError, IndexError):
        print("Pilihan nomor paket tidak valid!")
        exit()
    
    # Custom override
    print("\n[Opsional] Override hari & kuota (Enter untuk skip)")
    custom_hari_str = input("Custom hari (kosongkan = default): ").strip()
    custom_kuota_str = input("Custom kuota NIK (kosongkan = default): ").strip()
    custom_hari = int(custom_hari_str) if custom_hari_str.isdigit() else None
    custom_kuota = int(custom_kuota_str) if custom_kuota_str.isdigit() else None
    
    key = generate_license_key(hwid_klien, kode_paket, custom_hari, custom_kuota)
    
    print("\n" + "=" * 60)
    print(f"HWID Klien  : {hwid_klien}")
    print(f"Paket       : {PAKETS[kode_paket]['nama']}")
    print(f"License Key :\n{key}")
    print("=" * 60)
    print("Berikan LICENSE KEY di atas kepada Klien.")
    input("\nTekan Enter untuk keluar...")
