"""
telegram_keygen_bot.py
======================
Script Bot Telegram untuk membuat & me-redeem License Key Bot MAP Pertamina v4 secara instan.
Instalasi dependensi:
pip install pyTelegramBotAPI cryptography requests
"""

import os
import json
import base64
import time
import requests
import telebot
from datetime import datetime, timedelta
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.serialization import load_pem_private_key

# ============================================================
# KONFIGURASI UTAMA & ENVS SECURE
# ============================================================
# Mengambil token & admin ID dari env (TANPA fallback bocor)
TOKEN_BOT = os.environ.get("TOKEN_BOT")
if not TOKEN_BOT:
    raise ValueError("TOKEN_BOT environment variable tidak diset!")

ADMIN_TELEGRAM_ID = int(os.environ.get("ADMIN_TELEGRAM_ID", 1203246492))

# Secret API Key & URL untuk berkomunikasi dengan Next.js Vercel Web
REDEEM_API_KEY = os.environ.get("REDEEM_API_KEY")
if not REDEEM_API_KEY:
    raise ValueError("REDEEM_API_KEY environment variable tidak diset!")

WEB_API_URL = os.environ.get("WEB_API_URL", "https://map-pertamina-web.vercel.app")

# Private Key RSA-2048 (Diambil dari environment variable RSA_PRIVATE_KEY)
PRIVATE_KEY_PEM = os.environ.get("RSA_PRIVATE_KEY")
if not PRIVATE_KEY_PEM:
    raise ValueError("RSA_PRIVATE_KEY environment variable tidak diset!")

# Default lifetime
DEFAULT_LIFETIME_DAYS = 36500  # 100 Tahun (Lifetime)

# State untuk melacak percakapan redeem user biasa
# Format: {chat_id: {"step": "awaiting_hwid", "voucher": "MAPXXXXX"}}
user_states = {}

bot = telebot.TeleBot(TOKEN_BOT)

def generate_license_key(hwid: str, paket: str, hari: int, kuota: int) -> str:
    """Membuat license key bertanda tangan digital RSA-2048."""
    expiry = (datetime.now() + timedelta(days=hari)).isoformat()
    
    payload = {
        "hwid": hwid,
        "paket": paket.upper(),
        "expiry": expiry,
        "kuota_total": kuota
    }
    
    json_bytes = json.dumps(payload).encode()
    json_b64 = base64.urlsafe_b64encode(json_bytes).decode()
    
    pem_clean = "\n".join([line.strip() for line in PRIVATE_KEY_PEM.strip().splitlines()]).encode()
    priv_key = load_pem_private_key(pem_clean, password=None)
    signature = priv_key.sign(
        json_bytes,
        padding.PKCS1v15(),
        hashes.SHA256()
    )
    sig_b64 = base64.urlsafe_b64encode(signature).decode()
    
    return f"{json_b64}.{sig_b64}"

# ============================================================
# COMMAND MENU & WELCOME
# ============================================================
@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    is_admin = message.from_user.id == ADMIN_TELEGRAM_ID
    
    if is_admin:
        menu_text = (
            "🤖 *Generator Lisensi Bot MAP Pertamina v4 (ADMIN)* 🤖\n\n"
            "Gunakan perintah berikut untuk membuat lisensi secara instan:\n\n"
            "👉 `/keygen [HWID] [KUOTA]`\n"
            "_(Membuat lisensi kuota kustom dengan durasi Lifetime)_\n\n"
            "👉 `/keygen_custom [HWID] [HARI] [KUOTA]`\n"
            "_(Membuat lisensi kustom penuh dengan batasan hari & kuota)_\n\n"
            "📌 *Contoh Penggunaan*:\n"
            "`/keygen 3602123456789012 3000`\n"
            "_(Membuat lisensi 3000 kuota tabung untuk HWID tersebut)_"
        )
    else:
        menu_text = (
            "🤖 *Portal Aktivasi Lisensi Bot MAP Pertamina* 🤖\n\n"
            "Selamat datang! Bot ini melayani aktivasi lisensi otomatis.\n"
            "Gunakan perintah di bawah ini untuk me-redeem voucher Anda:\n\n"
            "👉 `/redeem [KODE_VOUCHER]`\n"
            "_(Aktivasi lisensi dari pembelian website penjualan)_\n\n"
            "📌 *Contoh Penggunaan*:\n"
            "`/redeem MAP7A3BX`\n"
            "_(Sistem akan menanyakan Hardware ID PC Anda setelahnya)_"
        )
    bot.reply_to(message, menu_text, parse_mode="Markdown")

# ============================================================
# ADMIN HANDLERS
# ============================================================
@bot.message_handler(commands=['keygen'])
def keygen_handler(message):
    if message.from_user.id != ADMIN_TELEGRAM_ID:
        bot.reply_to(message, "❌ Perintah ini khusus untuk Administrator.", parse_mode="Markdown")
        return
        
    try:
        args = message.text.split()
        if len(args) < 3:
            bot.reply_to(message, "⚠️ Format salah! Gunakan: `/keygen [HWID] [KUOTA]`", parse_mode="Markdown")
            return
            
        hwid = args[1].strip().replace("-", "").upper()
        kuota = int(args[2].strip())
        
        key = generate_license_key(hwid, "CUSTOM", DEFAULT_LIFETIME_DAYS, kuota)
        
        res_text = (
            "✅ *Lisensi Berhasil Dibuat!* (Lifetime)\n\n"
            f"👤 *HWID Klien*: `{hwid}`\n"
            f"📦 *Kuota*: `{kuota:,} Tabung`\n"
            f"⏳ *Masa Aktif*: `Tanpa Batas (Lifetime)`\n\n"
            "🔑 *LICENSE KEY* (Klik untuk salin):\n"
            f"```\n{key}\n```"
        )
        bot.reply_to(message, res_text, parse_mode="Markdown")
        
    except Exception as e:
        bot.reply_to(message, f"❌ Terjadi kesalahan: {e}")

@bot.message_handler(commands=['keygen_custom'])
def keygen_custom_handler(message):
    if message.from_user.id != ADMIN_TELEGRAM_ID:
        bot.reply_to(message, "❌ Perintah ini khusus untuk Administrator.", parse_mode="Markdown")
        return
        
    try:
        args = message.text.split()
        if len(args) < 4:
            bot.reply_to(message, "⚠️ Format salah! Gunakan: `/keygen_custom [HWID] [HARI] [KUOTA]`", parse_mode="Markdown")
            return
            
        hwid = args[1].strip().replace("-", "").upper()
        hari = int(args[2].strip())
        kuota = int(args[3].strip())
        
        key = generate_license_key(hwid, "CUSTOM", hari, kuota)
        
        res_text = (
            "✅ *Lisensi Kustom Berhasil Dibuat!*\n\n"
            f"👤 *HWID Klien*: `{hwid}`\n"
            f"📦 *Kuota*: `{kuota:,} Tabung`\n"
            f"⏳ *Masa Aktif*: `{hari} Hari`\n\n"
            "🔑 *LICENSE KEY* (Klik untuk salin):\n"
            f"```\n{key}\n```"
        )
        bot.reply_to(message, res_text, parse_mode="Markdown")
        
    except Exception as e:
        bot.reply_to(message, f"❌ Terjadi kesalahan: {e}")

# ============================================================
# PUBLIC VOUCHER REDEEM HANDLERS (CONVERSATION STATE FLOW)
# ============================================================
@bot.message_handler(commands=['redeem'])
def redeem_handler(message):
    args = message.text.split()
    if len(args) < 2:
        bot.reply_to(
            message, 
            "⚠️ Format salah!\nGunakan: `/redeem [KODE_VOUCHER]`\n\nContoh: `/redeem MAP7A3BX`", 
            parse_mode="Markdown"
        )
        return

    voucher = args[1].strip().upper()
    
    # Simpan state percakapan user
    user_states[message.chat.id] = {
        "step": "awaiting_hwid",
        "voucher": voucher
    }

    instruction_text = (
        "🔍 *KODE VOUCHER DITERIMA*\n\n"
        "Silakan kirimkan *Hardware ID (HWID PC)* ATAU *Android ID (HP)* Anda sekarang.\n\n"
        "💡 *Cara menemukan ID Anda*:\n"
        "1. Jalankan software/aplikasi *Bot MAP Pertamina* di PC atau HP Anda.\n"
        "2. Lihat kolom *Hardware ID* atau *Android ID* di layar lisensi.\n"
        "3. Salin kode tersebut dan tempel (paste) ke bot ini.\n\n"
        "👉 Kirimkan kode ID Anda:"
    )
    bot.reply_to(message, instruction_text, parse_mode="Markdown")

# Interseptor pesan text untuk mendeteksi input HWID
@bot.message_handler(func=lambda msg: msg.chat.id in user_states and user_states[msg.chat.id]["step"] == "awaiting_hwid")
def capture_hwid_handler(message):
    chat_id = message.chat.id
    hwid = message.text.strip().replace("-", "").upper()
    voucher = user_states[chat_id]["voucher"]

    # Hapus state agar tidak tersangkut jika verifikasi gagal
    del user_states[chat_id]

    bot.reply_to(message, "⏳ *Sedang memverifikasi voucher di server...* Mohon tunggu sebentar.", parse_mode="Markdown")

    try:
        url = f"{WEB_API_URL}/api/redeem"
        headers = {
            "X-API-Key": REDEEM_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "voucher_code": voucher,
            "hwid": hwid
        }

        # Request ke API Next.js Vercel untuk klaim voucher (Bypass semua proxy sistem)
        response = requests.post(
            url, 
            json=payload, 
            headers=headers, 
            timeout=12,
            proxies={"http": None, "https": None}
        )
        data = response.json()

        if response.status_code != 200:
            error_msg = data.get("error", "Gagal memproses voucher.")
            bot.reply_to(message, f"❌ *Verifikasi Gagal!*\n\nDetail: *{error_msg}*\n\nSilakan jalankan ulang perintah `/redeem [KODE_VOUCHER]` untuk mencoba kembali.", parse_mode="Markdown")
            return

        # Sukses! Generate key ber-tanda tangan digital RSA-2048 asli di VPS
        paket = data["paket"]
        kuota = data["kuota"]
        hari = data["hari"]

        license_key = generate_license_key(hwid, paket, hari, kuota)

        success_text = (
            "🚀 *LISENSI RESMI BERHASIL DIAKTIFKAN!* 🚀\n\n"
            f"📦 Paket: *{paket}*\n"
            f"📊 Kuota: *{kuota:,} Tabung NIK*\n"
            f"⏳ Masa Aktif: *Tanpa Batas (Lifetime)*\n"
            f"👤 HWID Terdaftar: `{hwid}`\n\n"
            "🔑 *LICENSE KEY* (Ketuk di bawah untuk menyalin):\n"
            f"`{license_key}`\n\n"
            "📌 *Petunjuk*: Salin License Key di atas, tempelkan ke kolom Lisensi di software Bot MAP Pertamina Anda, lalu klik *Aktivasi*."
        )
        bot.reply_to(message, success_text, parse_mode="Markdown")

    except Exception as e:
        bot.reply_to(message, f"❌ *Koneksi Server Gagal!*\n\nTerjadi kesalahan saat berkomunikasi dengan website: {e}\nSilakan hubungi Admin jika kendala berlanjut.")

if __name__ == "__main__":
    print("[TELEGRAM BOT] Serverless-ready keygen bot is starting up...")
    
    while True:
        try:
            bot.infinity_polling(timeout=10, long_polling_timeout=5)
        except Exception as e:
            print(f"[WARN] Polling terputus: {e}. Mengulangi dalam 5 detik...")
            time.sleep(5)
