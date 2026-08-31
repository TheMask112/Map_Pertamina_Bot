import os
import sys
import random
import time
import threading
import pandas as pd
import base64
import cv2
from datetime import datetime

# Tentukan BASE_DIR sejak awal (frozen/unfrozen)
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Arahkan Playwright ke folder browser_bin lokal di folder yang sama dengan EXE
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = os.path.join(BASE_DIR, "browser_bin")

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
from playwright_stealth import Stealth
from captcha_solver import solve_captcha

# ============================================================
# File Paths
# ============================================================
RESULT_FILE     = "hasil_proses.xlsx"
SUKSES_FILE     = "sukses.xlsx"
GAGAL_FILE      = "gagal.xlsx"

BROWSER_DATA = os.path.join(BASE_DIR, "browser_data")

# ============================================================
# Selectors
# ============================================================
BTN_CATAT_PENJUALAN = "text='Catat Penjualan'"
INPUT_NIK           = "input[placeholder='Masukkan 16 digit NIK Pelanggan']"
BTN_LANJUTKAN       = "text='LANJUTKAN PENJUALAN'"
BTN_CEK             = "text='CEK PESANAN'"
BTN_PROSES          = "text='PROSES PENJUALAN'"

CAPTCHA_POPUP       = "text='Cocokan Gambar untuk Proses Keamanan Penjualan'"
SLIDER_HANDLE       = ".rc-slider-captcha-control-button"
CAPTCHA_BG_IMG      = ".rc-slider-captcha-jigsaw-bg"
CAPTCHA_SLIDER_IMG  = ".rc-slider-captcha-jigsaw-puzzle"
BTN_GANTI_CAPTCHA   = "text='Ganti'"

# Teks yang mengindikasikan NIK tidak terdaftar (cek case-insensitive)
NIK_ERROR_TEXTS     = [
    "tidak terdaftar",
    "nik tidak ditemukan",
    "data tidak ditemukan",
    "tidak dapat ditemukan",
    "pelanggan tidak valid",
    "nik belum terdaftar",
]

# ============================================================
# Status Constants
# ============================================================
STATUS_SUKSES      = "SUKSES"
STATUS_NIK_INVALID = "NIK TIDAK TERDAFTAR"
STATUS_GAGAL_CAPTCHA = "GAGAL CAPTCHA"
STATUS_ERROR       = "ERROR SYSTEM"
STATUS_BELUM       = "BELUM"
STATUS_SKIP        = "DILEWATI"

# Captcha mode
CAPTCHA_AUTO   = "auto"      # Bot otomatis solve captcha
CAPTCHA_MANUAL = "manual"    # Bot pause, user solve captcha manual

# Status yang tidak perlu diproses ulang
DONE_STATUSES = {STATUS_SUKSES, STATUS_NIK_INVALID, STATUS_SKIP}

MAX_RETRY = 3                   # Auto-retry per NIK (biasanya 3x sudah cukup sebelum blocked IP)
MAX_RETRY_CAPTCHA = 3            # Max attempts per captcha (3x kemudian ganti gambar)
CAPTCHA_OFFSET = 8.0             # Offset piksel kompensasi (kurang geser sedikit)
NIK_TIMEOUT_SEC = 60             # Global timeout per NIK (detik)
INTER_NIK_DELAY_MIN = 5          # Delay minimum antar NIK (detik)
INTER_NIK_DELAY_MAX = 15         # Delay maximum antar NIK (detik)


# ============================================================
# Helpers
# ============================================================

def _get_whatsapp_number() -> str:
    try:
        from credentials import load_credentials
        username, _ = load_credentials()
        if username:
            whatsapp = str(username).strip()
            if whatsapp.startswith("08"):
                whatsapp = "628" + whatsapp[2:]
            return whatsapp
    except Exception:
        pass
    return ""

def _send_telegram_notification(whatsapp: str, status: str, message: str, sukses: int, sisa: int):
    try:
        import urllib.request
        import json
        from license_manager import get_hwid, verify_license
        
        hwid = get_hwid()
        valid, _, payload = verify_license(hwid)
        license_key = payload.get("license_key", "") if (valid and payload) else ""
        
        url = "https://map-pertamina-web.vercel.app/api/telegram-notify"
        data = {
            "whatsapp": whatsapp,
            "status": status,
            "message": message,
            "sukses": sukses,
            "sisa": sisa
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-License-Key": license_key
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            response.read()
    except Exception as e:
        print(f"[WARN] Gagal mengirim notifikasi Telegram: {e}")

def _poll_telegram_command(whatsapp: str) -> str:
    try:
        import urllib.request
        import json
        from license_manager import get_hwid, verify_license
        
        hwid = get_hwid()
        valid, _, payload = verify_license(hwid)
        license_key = payload.get("license_key", "") if (valid and payload) else ""
        
        url = f"https://map-pertamina-web.vercel.app/api/telegram-command?whatsapp={whatsapp}"
        req = urllib.request.Request(
            url,
            headers={
                "X-License-Key": license_key
            },
            method="GET"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data.get("command")
    except Exception:
        pass
    return None


def _report_session_to_server(
    whatsapp: str,
    session_start: datetime,
    session_end: datetime,
    total_nik: int,
    nik_sukses: int,
    nik_gagal: int,
    nik_tidak_terdaftar: int = 0,
    nik_kuota_habis: int = 0,
    nik_meninggal: int = 0,
    nik_dibawah_umur: int = 0,
    nik_tidak_aktif: int = 0,
    captcha_total: int = 0,
    captcha_sukses: int = 0,
    jumlah_tabung: int = 1,
    avg_seconds_per_nik: float = 0.0,
    batch_number: int = 1,
    error_summary: str = "",
    nama_pangkalan: str = "",
):
    """Kirim laporan sesi bot ke server untuk analitik dashboard admin."""
    try:
        import urllib.request
        import json
        from license_manager import get_hwid, verify_license

        hwid = get_hwid()
        valid, _, payload = verify_license(hwid)
        license_key = payload.get("license_key", "") if (valid and payload) else ""

        if not license_key:
            return

        duration = int((session_end - session_start).total_seconds())

        url = "https://map-pertamina-web.vercel.app/api/report-session"
        data = {
            "whatsapp": whatsapp,
            "nama_pangkalan": nama_pangkalan,
            "platform": "DESKTOP",
            "app_version": "1.0.0",
            "started_at": session_start.isoformat(),
            "ended_at": session_end.isoformat(),
            "duration_seconds": duration,
            "total_nik": total_nik,
            "nik_sukses": nik_sukses,
            "nik_gagal": nik_gagal,
            "nik_tidak_terdaftar": nik_tidak_terdaftar,
            "nik_kuota_habis": nik_kuota_habis,
            "nik_meninggal": nik_meninggal,
            "nik_dibawah_umur": nik_dibawah_umur,
            "nik_tidak_aktif": nik_tidak_aktif,
            "captcha_total": captcha_total,
            "captcha_sukses": captcha_sukses,
            "jumlah_tabung": jumlah_tabung,
            "avg_seconds_per_nik": avg_seconds_per_nik,
            "batch_number": batch_number,
            "error_summary": error_summary[:500] if error_summary else "",
            "hwid": hwid,
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-License-Key": license_key,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            response.read()
        print("[INFO] Laporan sesi berhasil dikirim ke server.")
    except Exception as e:
        print(f"[WARN] Gagal mengirim laporan sesi ke server: {e}")


def find_nik_column(df: pd.DataFrame) -> str:
    """
    Mencari kolom NIK secara otomatis di dalam DataFrame.
    Pencarian dilakukan berdasarkan:
    1. Nama kolom yang mengandung kata 'NIK' atau 'KTP' (case-insensitive) atau bernilai 16-digit angka.
    2. Pemindaian baris data: kolom pertama yang memiliki nilai berupa angka 16-digit.
    3. Jika tidak ditemukan, default ke kolom pertama.
    """
    # 1. Cek berdasarkan nama kolom (case-insensitive atau 16-digit number)
    for col in df.columns:
        col_str = str(col).strip().upper()
        if "NIK" in col_str or "KTP" in col_str:
            return col
        if col_str.endswith(".0"):
            col_str = col_str[:-2]
        digits = "".join(c for c in col_str if c.isdigit())
        if len(digits) == 16:
            return col

    # 2. Cek berdasarkan sampel data (mencari kolom dengan nilai 16-digit)
    sample_size = min(15, len(df))
    for col in df.columns:
        for idx in range(sample_size):
            val = df[col].iloc[idx]
            if pd.isna(val):
                continue
            val_str = str(val).strip()
            if val_str.endswith(".0"):
                val_str = val_str[:-2]
            digits = "".join(c for c in val_str if c.isdigit())
            if len(digits) == 16:
                return col

    # 3. Default ke kolom pertama jika tidak ditemukan
    return df.columns[0] if len(df.columns) > 0 else None


def _interruptible_sleep(seconds: float, stop_event: threading.Event | None, step: float = 0.2) -> bool:
    """
    Sleep yang bisa diinterupsi oleh stop_event.
    Returns False jika stop_event di-set selama sleep.
    """
    elapsed = 0.0
    while elapsed < seconds:
        if stop_event and stop_event.is_set():
            return False
        chunk = min(step, seconds - elapsed)
        time.sleep(chunk)
        elapsed += chunk
    return True


def _check_stop(stop_event: threading.Event | None) -> bool:
    """Cek apakah bot harus berhenti. Returns True jika harus stop."""
    return stop_event is not None and stop_event.is_set()


def human_like_drag(page, slider_element, distance: float, stop_event=None):
    """Drag mouse secara natural dengan overshoot — bisa diinterupsi."""
    box = slider_element.bounding_box()
    if not box:
        return

    start_x = box["x"] + box["width"] / 2
    start_y = box["y"] + box["height"] / 2

    page.mouse.move(start_x, start_y)
    if not _interruptible_sleep(random.uniform(0.3, 0.7), stop_event):
        return

    page.mouse.down()
    if not _interruptible_sleep(random.uniform(0.1, 0.2), stop_event):
        page.mouse.up()
        return

    target_x = start_x + distance

    # Phase 1: Gerak cepat ke ~70% jarak
    fast_steps = random.randint(8, 12)
    fast_target = distance * random.uniform(0.65, 0.75)
    for i in range(fast_steps):
        if _check_stop(stop_event):
            page.mouse.up()
            return
        progress = (i + 1) / fast_steps
        step_x = start_x + (fast_target * progress)
        step_y = start_y + random.uniform(-1.5, 1.5)
        page.mouse.move(step_x, step_y)
        time.sleep(random.uniform(0.005, 0.02))

    # Phase 2: Perlahan mendekati target
    slow_steps = random.randint(10, 18)
    current_pos = start_x + fast_target
    for i in range(slow_steps):
        if _check_stop(stop_event):
            page.mouse.up()
            return
        progress = (i + 1) / slow_steps
        ease = 1 - (1 - progress) ** 2
        step_x = current_pos + ((target_x - current_pos) * ease)
        step_y = start_y + random.uniform(-0.5, 0.5)
        page.mouse.move(step_x, step_y)
        time.sleep(random.uniform(0.02, 0.06))

    # Phase 3: Overshoot + koreksi
    overshoot = random.uniform(2, 6)
    page.mouse.move(target_x + overshoot, start_y + random.uniform(-1, 1))
    _interruptible_sleep(random.uniform(0.05, 0.15), stop_event)
    page.mouse.move(target_x, start_y)
    _interruptible_sleep(random.uniform(0.2, 0.5), stop_event)
    page.mouse.up()
    _interruptible_sleep(random.uniform(0.8, 1.5), stop_event)


def _save_results(df: pd.DataFrame):
    """Simpan hasil ke file: master, sukses, gagal, dan sisa_antrean."""
    import time
    
    # 1. Simpan master
    try:
        df.to_excel(RESULT_FILE, index=False)
    except PermissionError:
        backup = RESULT_FILE.replace(".xlsx", f"_BACKUP_{time.strftime('%Y%m%d_%H%M%S')}.xlsx")
        print(f"[WARN] File {RESULT_FILE} sedang dibuka! Hasil diselamatkan ke: {backup}")
        try:
            df.to_excel(backup, index=False)
        except Exception:
            pass
            
    # 2. Simpan sukses & gagal
    df_sukses = df[df["Status"] == STATUS_SUKSES].copy()
    df_gagal  = df[df["Status"].isin([STATUS_GAGAL_CAPTCHA, STATUS_ERROR, STATUS_NIK_INVALID, STATUS_SKIP])].copy()

    if not df_sukses.empty:
        try:
            df_sukses.to_excel(SUKSES_FILE, index=False)
        except PermissionError:
            backup_s = SUKSES_FILE.replace(".xlsx", f"_BACKUP_{time.strftime('%Y%m%d_%H%M%S')}.xlsx")
            try:
                df_sukses.to_excel(backup_s, index=False)
            except Exception:
                pass
                
    if not df_gagal.empty:
        try:
            df_gagal.to_excel(GAGAL_FILE, index=False)
        except PermissionError:
            backup_g = GAGAL_FILE.replace(".xlsx", f"_BACKUP_{time.strftime('%Y%m%d_%H%M%S')}.xlsx")
            try:
                df_gagal.to_excel(backup_g, index=False)
            except Exception:
                pass

    # 3. Simpan sisa antrean untuk batch berikutnya (singkirkan sukses, invalid, dan skip permanen)
    df_sisa = df[~df["Status"].isin([STATUS_SUKSES, STATUS_NIK_INVALID, STATUS_SKIP])].copy()
    if not df_sisa.empty:
        try:
            df_sisa_clean = df_sisa.copy()
            if "Status" in df_sisa_clean.columns:
                df_sisa_clean["Status"] = STATUS_BELUM
            if "Keterangan" in df_sisa_clean.columns:
                df_sisa_clean["Keterangan"] = ""
            if "Timestamp" in df_sisa_clean.columns:
                df_sisa_clean["Timestamp"] = ""
            if "Batch" in df_sisa_clean.columns:
                df_sisa_clean["Batch"] = ""
            
            df_sisa_clean.to_excel("sisa_antrean.xlsx", index=False)
        except Exception as e:
            print(f"[WARN] Gagal menyimpan sisa_antrean.xlsx: {e}")


def _check_critical_nik_errors(page) -> tuple[bool, str, str]:
    """
    Memeriksa seluruh halaman/popup untuk mencari pesan error kritis yang
    menandakan transaksi harus di-skip langsung tanpa retry 3x.
    Returns: (is_error, status, keterangan)
    """
    try:
        body_text = page.evaluate("() => document.body.innerText").lower()
        html_content = page.content().lower()
        
        # 1. Cek NIK Tidak Terdaftar
        unregistered_keywords = [
            "tidak terdaftar",
            "nik tidak ditemukan",
            "data tidak ditemukan",
            "tidak dapat ditemukan",
            "pelanggan tidak valid",
            "nik belum terdaftar",
            "belum terdaftar"
        ]
        for kw in unregistered_keywords:
            if kw in body_text or kw in html_content:
                return True, STATUS_NIK_INVALID, "NIK tidak terdaftar di sistem Pertamina"
            try:
                loc = page.locator(f"text='{kw}'")
                if loc.count() > 0 and any(loc.nth(i).is_visible() for i in range(loc.count())):
                    return True, STATUS_NIK_INVALID, "NIK tidak terdaftar di sistem Pertamina"
            except:
                pass
        
        # 2. Cek Usia di bawah 17 tahun
        age_keywords = [
            "di bawah 17",
            "dibawah 17",
            "kurang dari 17",
            "di bawah umur",
            "belum cukup umur"
        ]
        for kw in age_keywords:
            if kw in body_text or kw in html_content:
                return True, STATUS_SKIP, "Pemilik NIK di bawah 17 tahun"
            try:
                loc = page.locator(f"text='{kw}'")
                if loc.count() > 0 and any(loc.nth(i).is_visible() for i in range(loc.count())):
                    return True, STATUS_SKIP, "Pemilik NIK di bawah 17 tahun"
            except:
                pass
                
        # 3. Cek Meninggal Dunia
        deceased_keywords = [
            "meninggal",
            "wafat",
            "meninggal dunia",
            "telah tiada"
        ]
        for kw in deceased_keywords:
            if kw in body_text or kw in html_content:
                return True, STATUS_SKIP, "Pemilik NIK sudah meninggal dunia"
            try:
                loc = page.locator(f"text='{kw}'")
                if loc.count() > 0 and any(loc.nth(i).is_visible() for i in range(loc.count())):
                    return True, STATUS_SKIP, "Pemilik NIK sudah meninggal dunia"
            except:
                pass
                
        # 4. Cek Batas Kuota Pembelian Bulanan
        quota_keywords = [
            "melebihi batas",
            "batas kewajaran",
            "kuota bulanan",
            "kewajaran pembelian",
            "memenuhi kuota",
            "telah melebihi",
            "tidak dapat transaksi karena telah melebihi"
        ]
        for kw in quota_keywords:
            if kw in body_text or kw in html_content:
                return True, STATUS_SKIP, "Melebihi batas kuota pembelian bulanan"
            try:
                loc = page.locator(f"text='{kw}'")
                if loc.count() > 0 and any(loc.nth(i).is_visible() for i in range(loc.count())):
                    return True, STATUS_SKIP, "Melebihi batas kuota pembelian bulanan"
            except:
                pass
                
        # 5. Cek NIK Tidak Aktif
        inactive_keywords = [
            "tidak aktif",
            "nonaktif",
            "non-aktif",
            "ditangguhkan",
            "diblokir"
        ]
        for kw in inactive_keywords:
            if kw in body_text or kw in html_content:
                return True, STATUS_SKIP, "Status NIK tidak aktif atau ditangguhkan"
            try:
                loc = page.locator(f"text='{kw}'")
                if loc.count() > 0 and any(loc.nth(i).is_visible() for i in range(loc.count())):
                    return True, STATUS_SKIP, "Status NIK tidak aktif atau ditangguhkan"
            except:
                pass
                
    except Exception as e:
        print(f"[WARN] Error saat check_critical_nik_errors: {e}")
        
    return False, "", ""


# Database Pemetaan Kode Wilayah NIK 4-digit ke Nama Kabupaten / Kota
KODE_WILAYAH_KOTA = {
    # DKI Jakarta (31)
    "3101": "KEPULAUAN SERIBU", "3171": "JAKARTA SELATAN", "3172": "JAKARTA TIMUR", 
    "3173": "JAKARTA PUSAT", "3174": "JAKARTA BARAT", "3175": "JAKARTA UTARA",
    # Jawa Barat (32)
    "3201": "BOGOR", "3202": "SUKABUMI", "3203": "CIANJUR", "3204": "BANDUNG", 
    "3205": "GARUT", "3206": "TASIKMALAYA", "3207": "CIAMIS", "3208": "KUNINGAN", 
    "3209": "CIREBON", "3210": "MAJALENGKA", "3211": "SUMEDANG", "3212": "INDRAMAYU", 
    "3213": "SUBANG", "3214": "PURWAKARTA", "3215": "KARAWANG", "3216": "BEKASI", 
    "3217": "BANDUNG BARAT", "3218": "PANGANDARAN", "3271": "KOTA BOGOR", 
    "3272": "KOTA SUKABUMI", "3273": "KOTA BANDUNG", "3274": "KOTA CIREBON", 
    "3275": "KOTA BEKASI", "3276": "KOTA DEPOK", "3277": "KOTA CIMAHI", 
    "3278": "KOTA TASIKMALAYA", "3279": "KOTA BANJAR",
    # Banten (36)
    "3601": "PANDEGLANG", "3602": "LEBAK", "3603": "TANGERANG", "3604": "SERANG", 
    "3671": "KOTA TANGERANG", "3672": "KOTA CILEGON", "3673": "KOTA SERANG", 
    "3674": "KOTA TANGERANG SELATAN",
    # Jawa Tengah (33)
    "3301": "CILACAP", "3302": "BANYUMAS", "3303": "PURBALINGGA", "3304": "BANJARNEGARA", 
    "3305": "KEBUMEN", "3306": "PURWOREJO", "3307": "WONOSOBO", "3308": "MAGELANG", 
    "3309": "BOYOLALI", "3310": "KLATEN", "3311": "SUKOHARJO", "3312": "WONOGIRI", 
    "3313": "KARANGANYAR", "3314": "SRAGEN", "3315": "GROBOGAN", "3316": "BLORA", 
    "3317": "REMBANG", "3318": "PATI", "3319": "KUDUS", "3320": "JEPARA", 
    "3321": "DEMAK", "3322": "SEMARANG", "3323": "TEMANGGUNG", "3324": "KENDAL", 
    "3325": "BATANG", "3326": "PEKALONGAN", "3327": "PEMALANG", "3328": "TEGAL", 
    "3329": "BREBES", "3371": "KOTA MAGELANG", "3372": "KOTA SURAKARTA", 
    "3373": "KOTA SALATIGA", "3374": "KOTA SEMARANG", "3375": "KOTA PEKALONGAN", 
    "3376": "KOTA TEGAL",
    # DI Yogyakarta (34)
    "3401": "KULON PROGO", "3402": "BANTUL", "3403": "GUNUNGKIDUL", "3404": "SLEMAN", "3471": "KOTA YOGYAKARTA",
    # Jawa Timur (35)
    "3501": "PACITAN", "3502": "PONOROGO", "3503": "TRENGGALEK", "3504": "TULUNGAGUNG", 
    "3505": "BLITAR", "3506": "KEDIRI", "3507": "MALANG", "3508": "LUMAJANG", 
    "3509": "JEMBER", "3510": "BANYUWANGI", "3511": "BONDOWOSO", "3512": "SITUBONDO", 
    "3513": "PROBOLINGGO", "3514": "PASURUAN", "3515": "SIDOARJO", "3516": "MOJOKERTO", 
    "3517": "JOMBANG", "3518": "NGANJUK", "3519": "MADIUN", "3520": "MAGETAN", 
    "3521": "NGAWI", "3522": "BOJONEGORO", "3523": "TUBAN", "3524": "LAMONGAN", 
    "3525": "GRESIK", "3526": "BANGKALAN", "3527": "SAMPANG", "3528": "PAMEKASAN", 
    "3529": "SUMENEP", "3571": "KOTA KEDIRI", "3572": "KOTA BLITAR", "3573": "KOTA MALANG", 
    "3574": "KOTA PROBOLINGGO", "3575": "KOTA PASURUAN", "3576": "KOTA MOJOKERTO", 
    "3577": "KOTA MADIUN", "3578": "KOTA SURABAYA", "3579": "KOTA BATU",
    # Bali & Nusa Tenggara
    "5101": "JEMBRANA", "5102": "TABANAN", "5103": "BADUNG", "5104": "GIANYAR", 
    "5105": "KLUNGKUNG", "5106": "BANGLI", "5107": "KARANGASEM", "5108": "BULELENG", "5171": "KOTA DENPASAR",
    # Sumatera
    "1101": "ACEH SELATAN", "1171": "BANDA ACEH", "1201": "TAPANULI TENGAH", "1271": "KOTA MEDAN",
    "1301": "PESISIR SELATAN", "1371": "KOTA PADANG", "1401": "KAMPAR", "1471": "KOTA PEKANBARU",
    "1601": "OGAN KOMERING ULU", "1671": "KOTA PALEMBANG", "1801": "LAMPUNG BARAT", "1871": "KOTA BANDAR LAMPUNG"
}


def parse_nik_info(nik: str, row_dict: dict = None) -> dict:
    """
    Ekstrak Tanggal Lahir, Bulan, Tahun, Jenis Kelamin, dan Tempat Lahir dari 16 digit NIK.
    """
    clean_nik = "".join(c for c in str(nik) if c.isdigit())
    if len(clean_nik) != 16:
        return {
            "valid": False, "day": 1, "month": 1, "year": 1990,
            "dmy": "01/01/1990", "ymd": "1990-01-01",
            "gender": "LAKI-LAKI", "tempat_lahir": "INDONESIA"
        }
    
    # 1. Tanggal lahir (Digit 7-8)
    raw_day = int(clean_nik[6:8])
    if raw_day > 40:
        day = raw_day - 40
        gender = "PEREMPUAN"
    else:
        day = raw_day
        gender = "LAKI-LAKI"
    
    day = max(1, min(31, day))
    
    # 2. Bulan lahir (Digit 9-10)
    raw_month = int(clean_nik[8:10])
    month = max(1, min(12, raw_month))
    
    # 3. Tahun lahir (Digit 11-12)
    raw_year = int(clean_nik[10:12])
    current_year_2d = datetime.now().year % 100
    if raw_year > current_year_2d:
        year = 1900 + raw_year
    else:
        year = 2000 + raw_year
        
    dmy = f"{day:02d}/{month:02d}/{year:04d}"
    ymd = f"{year:04d}-{month:02d}-{day:02d}"
    
    # 4. Tempat Lahir
    tempat_lahir = ""
    if row_dict:
        for k, v in row_dict.items():
            k_lower = str(k).lower()
            if any(term in k_lower for term in ["tempat", "kota", "kabupaten", "ttl", "lahir", "alamat"]):
                if pd.notna(v) and str(v).strip():
                    val_clean = str(v).strip()
                    if "," in val_clean:
                        val_clean = val_clean.split(",")[0].strip()
                    tempat_lahir = val_clean.upper()
                    break
    
    if not tempat_lahir:
        kode_4 = clean_nik[0:4]
        tempat_lahir = KODE_WILAYAH_KOTA.get(kode_4, "")
        if not tempat_lahir:
            kode_2 = clean_nik[0:2]
            prov_map = {
                "11": "ACEH", "12": "SUMATERA UTARA", "13": "SUMATERA BARAT", "14": "RIAU",
                "15": "JAMBI", "16": "SUMATERA SELATAN", "17": "BENGKULU", "18": "LAMPUNG",
                "19": "KEPULAUAN BANGKA BELITUNG", "21": "KEPULAUAN RIAU",
                "31": "JAKARTA", "32": "JAWA BARAT", "33": "JAWA TENGAH",
                "34": "YOGYAKARTA", "35": "JAWA TIMUR", "36": "BANTEN",
                "51": "BALI", "52": "NUSA TENGGARA BARAT", "53": "NUSA TENGGARA TIMUR",
                "61": "KALIMANTAN BARAT", "62": "KALIMANTAN TENGAH", "63": "KALIMANTAN SELATAN",
                "64": "KALIMANTAN TIMUR", "65": "KALIMANTAN UTARA",
                "71": "SULAWESI UTARA", "72": "SULAWESI TENGAH", "73": "SULAWESI SELATAN",
                "74": "SULAWESI TENGGARA", "75": "GORONTALO", "76": "SULAWESI BARAT",
                "81": "MALUKU", "82": "MALUKU UTARA", "91": "PAPUA", "92": "PAPUA BARAT"
            }
            tempat_lahir = prov_map.get(kode_2, "INDONESIA")
            
    return {
        "valid": True,
        "day": day,
        "month": month,
        "year": year,
        "dmy": dmy,
        "ymd": ymd,
        "gender": gender,
        "tempat_lahir": tempat_lahir
    }


def _handle_birth_details(page, nik_info: dict, stop_event=None):
    """
    Mendeteksi dan mengisi input Tempat Lahir dan Tanggal Lahir jika muncul di halaman Subsidi Tepat LPG.
    """
    try:
        if not nik_info or not nik_info.get("valid"):
            return

        # 1. Cek Input Tempat Lahir
        tempat_selectors = [
            "input[placeholder*='Tempat Lahir' i]",
            "input[placeholder*='Tempat' i]",
            "input[name*='tempatLahir' i]",
            "input[name*='birthPlace' i]",
            "input[id*='tempatLahir' i]",
            "input[id*='birth_place' i]",
            "input[aria-label*='Tempat Lahir' i]",
            "input[placeholder*='Kota Lahir' i]"
        ]
        for sel in tempat_selectors:
            try:
                if page.is_visible(sel, timeout=500):
                    val = page.input_value(sel)
                    if not val or len(val.strip()) == 0:
                        print(f"[BOT] Input Tempat Lahir terdeteksi ({sel}). Mengisi '{nik_info['tempat_lahir']}'...")
                        page.fill(sel, "")
                        page.type(sel, nik_info["tempat_lahir"], delay=random.randint(40, 80))
                        time.sleep(0.3)
                        break
            except Exception:
                pass

        # 2. Cek Input Tanggal Lahir (Format Date Picker / Textbox DD/MM/YYYY atau YYYY-MM-DD)
        tgl_selectors = [
            "input[placeholder*='Tanggal Lahir' i]",
            "input[placeholder*='Tgl Lahir' i]",
            "input[placeholder*='DD/MM/YYYY' i]",
            "input[placeholder*='DD-MM-YYYY' i]",
            "input[placeholder*='YYYY-MM-DD' i]",
            "input[type='date']",
            "input[name*='tanggalLahir' i]",
            "input[name*='birthDate' i]",
            "input[id*='tanggalLahir' i]",
            "input[id*='birth_date' i]",
            "input[aria-label*='Tanggal Lahir' i]"
        ]
        for sel in tgl_selectors:
            try:
                if page.is_visible(sel, timeout=500):
                    val = page.input_value(sel)
                    if not val or len(val.strip()) == 0:
                        input_type = page.get_attribute(sel, "type") or "text"
                        date_str = nik_info["ymd"] if input_type == "date" else nik_info["dmy"]
                        print(f"[BOT] Input Tanggal Lahir terdeteksi ({sel}). Mengisi '{date_str}'...")
                        page.fill(sel, "")
                        page.type(sel, date_str, delay=random.randint(40, 80))
                        time.sleep(0.3)
                        break
            except Exception:
                pass

        # 3. Cek Dropdown Terpisah (Hari, Bulan, Tahun)
        day_selectors = ["select[name*='day' i]", "select[name*='hari' i]", "select[id*='day' i]", "select[id*='hari' i]"]
        for sel in day_selectors:
            try:
                if page.is_visible(sel, timeout=300):
                    page.select_option(sel, str(nik_info["day"]))
                    break
            except Exception:
                pass

        month_selectors = ["select[name*='month' i]", "select[name*='bulan' i]", "select[id*='month' i]", "select[id*='bulan' i]"]
        for sel in month_selectors:
            try:
                if page.is_visible(sel, timeout=300):
                    page.select_option(sel, str(nik_info["month"]))
                    break
            except Exception:
                pass

        year_selectors = ["select[name*='year' i]", "select[name*='tahun' i]", "select[id*='year' i]", "select[id*='tahun' i]"]
        for sel in year_selectors:
            try:
                if page.is_visible(sel, timeout=300):
                    page.select_option(sel, str(nik_info["year"]))
                    break
            except Exception:
                pass

    except Exception as e:
        print(f"[WARN] Error saat mengisi data Tempat/Tanggal Lahir: {e}")


def _handle_choice_popup(page):
    """
    Menangani popup pilihan jenis pelanggan ('Pelanggan Terdaftar')
    dengan memilih opsi default 'Rumah Tangga' atau 'Usaha Mikro'
    serta memilih NIB jika 'Usaha Mikro' terpilih.
    """
    try:
        popup_selectors = [
            "text='Pelanggan Terdaftar'",
            "text='pilihan jenis pelanggan'",
            "text='TEKAN pilihan jenis'"
        ]
        is_popup = False
        for sel in popup_selectors:
            if page.is_visible(sel, timeout=1000):
                is_popup = True
                break
        
        if is_popup:
            print("[BOT] Choice popup 'Pelanggan Terdaftar' terdeteksi.")
            # Klik "Rumah Tangga" atau "Usaha Mikro"
            chosen_opt = None
            for opt in ["text='Rumah Tangga'", "text='Usaha Mikro'"]:
                if page.is_visible(opt, timeout=1000):
                    print(f"[BOT] Memilih jenis pelanggan: {opt}")
                    page.click(opt)
                    chosen_opt = opt
                    time.sleep(0.8)
                    break
            
            # Jika memilih Usaha Mikro, cari dan pilih NIB/kategori usaha jika muncul dropdown NIB
            if chosen_opt == "text='Usaha Mikro'":
                nib_dropdowns = [
                    "input[placeholder*='NIB']",
                    "input[placeholder*='Pilih NIB']",
                    "input[placeholder*='Pilih Usaha']",
                    ".ant-select-selector",
                    "select",
                    "div[class*='select']"
                ]
                for select_sel in nib_dropdowns:
                    try:
                        if page.is_visible(select_sel, timeout=1500):
                            print(f"[BOT] Dropdown NIB/Usaha terdeteksi: {select_sel}. Membuka...")
                            page.click(select_sel)
                            time.sleep(0.8)
                            
                            # Pilih opsi pertama yang muncul
                            option_selectors = [
                                ".ant-select-item-option",
                                "div[role='option']",
                                "li[role='option']",
                                "select option:nth-child(2)",
                                ".rc-virtual-list-holder-inner div"
                            ]
                            for opt_sel in option_selectors:
                                if page.is_visible(opt_sel, timeout=1000):
                                    print(f"[BOT] Memilih NIB/Usaha: {opt_sel}")
                                    page.click(opt_sel)
                                    time.sleep(0.5)
                                    break
                            break
                    except Exception as e:
                        print(f"[WARN] Gagal memilih NIB pada {select_sel}: {e}")

            # Cek apakah ada tombol Lanjutkan Transaksi/Lanjutkan Penjualan di popup
            for btn in ["text='LANJUTKAN TRANSAKSI'", "text='LANJUTKAN PENJUALAN'", "text='Lanjutkan'"]:
                if page.is_visible(btn, timeout=1000):
                    print(f"[BOT] Mengklik tombol konfirmasi popup: {btn}")
                    page.click(btn)
                    time.sleep(0.5)
                    break
    except Exception as e:
        print(f"[WARN] Error saat menghandle choice popup: {e}")


def _check_nik_error(page) -> bool:
    """
    Cek apakah muncul popup/pesan error NIK tidak terdaftar atau error kritis lainnya.
    Returns True jika NIK invalid.
    """
    is_err, _, _ = _check_critical_nik_errors(page)
    return is_err


def _dismiss_error_popup(page):
    """Tutup popup error jika ada (klik tombol OK / Tutup / X)."""
    selectors = [
        "text='Tutup'",
        "text='TUTUP'",
        "text='OK'",
        "text='Ok'",
        "text='Batalkan'",
        "button:has-text('Tutup')",
        "button:has-text('TUTUP')",
        "button:has-text('OK')",
        "[aria-label='Close']",
        ".modal-close"
    ]
    for selector in selectors:
        try:
            if page.is_visible(selector, timeout=1000):
                page.click(selector)
                time.sleep(0.5)
                return
        except Exception:
            pass


# ============================================================
# Main Bot Runner
# ============================================================

def _check_login_page(page) -> bool:
    """Cek apakah halaman saat ini adalah login page."""
    try:
        url = page.url.lower()
        if '/login' in url or '/auth' in url or '/sign' in url:
            return True
        # Cek juga elemen login form
        if page.is_visible("input[type='password']", timeout=500):
            return True
    except Exception:
        pass
    return False


def _do_auto_login(page, stop_event):
    """Coba auto-login jika ada credentials tersimpan."""
    try:
        from credentials import load_credentials
        username, password = load_credentials()
        if not username or not password:
            return False

        print(f"[AUTO-LOGIN] Mencoba login otomatis sebagai {username[:4]}***...")
        
        # Tunggu sampai input tersedia di DOM untuk mencegah race condition
        try:
            page.wait_for_selector("input[placeholder*='Nomor Ponsel']", timeout=5000)
            page.wait_for_selector("input[type='password']", timeout=5000)
        except Exception:
            print("[AUTO-LOGIN] Timeout: Form login tidak ditemukan dalam 5 detik.")
            return False

        username_input = page.query_selector("input[placeholder*='Nomor Ponsel']")
        password_input = page.query_selector("input[type='password']")

        if not username_input or not password_input:
            return False

        username_input.fill(username)
        time.sleep(0.3)
        password_input.fill(password)
        time.sleep(0.2)
        page.click("button[type='submit']")
        time.sleep(4)

        if not _check_login_page(page):
            print("[AUTO-LOGIN] Berhasil!")
            return True
        else:
            print("[AUTO-LOGIN] Gagal — masih di halaman login")
            return False
    except Exception as e:
        print(f"[AUTO-LOGIN] Error: {e}")
        return False


def _wait_for_relogin(page, stop_event, pause_event, on_progress):
    """Pause bot dan tunggu user login ulang (dengan opsi auto-login)."""
    print("\n[⚠ SESSION] Session expired!")

    # Coba auto-login duluan
    if _check_login_page(page) and _do_auto_login(page, stop_event):
        return True

    # Jika gagal, minta user login manual
    print("[⚠ SESSION] Auto-login gagal, silakan login manual di browser...")
    if on_progress:
        on_progress(0, 0, "⚠ Session expired — login ulang di browser, lalu klik LANJUTKAN")
    
    # Kirim notifikasi Telegram
    wa_num = _get_whatsapp_number()
    if wa_num:
        _send_telegram_notification(
            whatsapp=wa_num,
            status="PAUSE",
            message="Session login kedaluwarsa. Silakan buka browser lokal untuk login ulang.",
            sukses=0,
            sisa=0
        )

    if pause_event:
        pause_event.set()

    # Polling status login dan remote command
    poll_timer = 0.0
    while _check_login_page(page):
        if _check_stop(stop_event):
            return False
        
        # Cek jika ada remote resume dari Telegram
        if wa_num and poll_timer >= 5.0:
            if _poll_telegram_command(wa_num) == "resume":
                if not _check_login_page(page):
                    print("[TELEGRAM] Menerima perintah REMOTE RESUME. Login terdeteksi berhasil!")
                    if pause_event:
                        pause_event.clear()
                    break
                else:
                    print("[TELEGRAM] Menerima perintah REMOTE RESUME, tetapi Anda belum login di browser.")
                    _send_telegram_notification(
                        whatsapp=wa_num,
                        status="PAUSE",
                        message="Perintah resume diterima, tetapi Anda belum login ulang di browser.",
                        sukses=0,
                        sisa=0
                    )
            poll_timer = 0.0
            
        time.sleep(0.5)
        poll_timer += 0.5

    if pause_event:
        while pause_event.is_set():
            if _check_stop(stop_event):
                return False
            
            # Cek jika ada remote resume dari Telegram
            if wa_num and poll_timer >= 5.0:
                if _poll_telegram_command(wa_num) == "resume":
                    print("[TELEGRAM] Menerima perintah REMOTE RESUME. Melanjutkan...")
                    pause_event.clear()
                    break
                poll_timer = 0.0
                
            time.sleep(0.5)
            poll_timer += 0.5
            
    print("[✓ SESSION] Login berhasil, melanjutkan bot...")
    return True


def _ensure_logged_in(page, stop_event, pause_event, on_progress, force_relogin=False):
    """
    CEK dan RE-LOGIN jika perlu.
    Panggil sebelum setiap aksi kritis (isi form, klik tombol, dll).
    Returns True jika sudah login, False jika stop event triggered.
    """
    if _check_stop(stop_event):
        return False

    if _check_login_page(page) or force_relogin:
        return _wait_for_relogin(page, stop_event, pause_event, on_progress)

    return True


def load_excel_data(data_file: str) -> pd.DataFrame:
    """
    Membaca file Excel secara cerdas & tahan banting.
    Mampu mendeteksi kolom NIK di posisi kolom mana pun (dengan atau tanpa header),
    serta otomatis membersihkan format angka scientific, float .0, tanda kutip, dan spasi.
    """
    if not os.path.exists(data_file):
        raise FileNotFoundError(f"File '{data_file}' tidak ditemukan!")

    # 1. Coba baca dengan header=None terlebih dahulu
    df_raw = pd.read_excel(data_file, header=None)
    if len(df_raw) == 0:
        return df_raw

    # 2. Cari kolom mana yang memiliki jumlah data 16-digit terbanyak
    best_col = None
    best_score = 0
    for col in df_raw.columns:
        count_16 = sum(1 for val in df_raw[col] if len("".join(c for c in str(val) if c.isdigit())) == 16)
        if count_16 > best_score:
            best_score = count_16
            best_col = col

    # 3. Jika ditemukan kolom dengan 16-digit NIK
    if best_col is not None and best_score > 0:
        first_val = str(df_raw[best_col].iloc[0])
        first_digits = "".join(c for c in first_val if c.isdigit())
        if len(first_digits) != 16:
            # Baris 0 adalah header teks (misal 'NIK', 'No KTP', dll)
            df = df_raw.iloc[1:].copy().reset_index(drop=True)
        else:
            df = df_raw.copy()
        df.rename(columns={best_col: "NIK"}, inplace=True)
        return df

    # 4. Fallback jika format standar
    df_std = pd.read_excel(data_file)
    nik_col = find_nik_column(df_std)
    if nik_col is not None and nik_col in df_std.columns:
        df_std.rename(columns={nik_col: "NIK"}, inplace=True)
        return df_std

    return df_raw


def health_check(data_file: str, hwid: str = None) -> tuple[bool, str]:
    """Validasi sebelum bot mulai. Returns (ok, error_message)."""
    # 1. Cek file Excel
    if not os.path.exists(data_file):
        return False, f"File '{data_file}' tidak ditemukan!"
    try:
        df = load_excel_data(data_file)
        if len(df) == 0:
            return False, "File Excel kosong!"
        if "NIK" not in df.columns:
            return False, "Kolom NIK tidak ditemukan di file Excel!"
    except Exception as e:
        return False, f"Gagal membaca file Excel: {e}"

    # 2. Cek lisensi
    if hwid:
        from license_manager import verify_license
        valid, msg, _ = verify_license(hwid)
        if not valid:
            return False, f"Lisensi: {msg}"

    # 3. Cek Chromium browser
    try:
        browsers_path = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "")
        if browsers_path and not os.path.exists(browsers_path):
            pass  # Di-skip karena proses install akan otomatis jalan di _run_bot_worker
    except Exception:
        pass

    return True, "OK"


def run_bot(
    data_file: str = "data_pelanggan.xlsx",
    stop_event: threading.Event | None = None,
    pause_event: threading.Event | None = None,
    batch_limit: int = 0,
    jumlah_tabung: int = 1,
    on_progress=None,
    hwid: str = None,
    captcha_mode: str = CAPTCHA_AUTO,
):
    """
    Jalankan bot.

    Args:
        data_file:     Path ke file Excel input
        stop_event:    threading.Event untuk stop bot
        pause_event:   threading.Event — di-set berarti pause, clear = lanjut
        batch_limit:   0 = tidak ada limit. N = pause setiap N data sukses
        jumlah_tabung: Jumlah tabung LPG per transaksi (1-5)
        on_progress:   callback(current, total, status_text) untuk update UI
        hwid:          Hardware ID (untuk consume quota license)
    """
    # ----------------------------------------------------------
    # 1. Load Data
    # ----------------------------------------------------------
    # Jika hasil_proses.xlsx ada DAN berasal dari file yang sama → lanjut checkpoint
    # Jika file berbeda → mulai baru
    checkpoint_valid = False
    if os.path.exists(RESULT_FILE):
        try:
            df_existing = pd.read_excel(RESULT_FILE)
            df_input = load_excel_data(data_file)

            # Validasi: Jika set NIK di input SAMA PERSIS dengan NIK di hasil_proses.xlsx, maka resume
            set_existing = set("".join(c for c in str(n) if c.isdigit()) for n in df_existing["NIK"] if str(n).strip())
            set_input    = set("".join(c for c in str(n) if c.isdigit()) for n in df_input["NIK"] if str(n).strip())
            
            if set_existing == set_input and len(set_input) > 0:
                df = df_existing
                checkpoint_valid = True
                print("[INFO] Melanjutkan dari checkpoint...")
            else:
                print("[INFO] File data baru terdeteksi. Memulai sesi baru...")
        except Exception as e:
            print(f"[WARN] Gagal membaca checkpoint: {e}")

    if not checkpoint_valid:
        if not os.path.exists(data_file):
            print(f"[ERROR] File {data_file} tidak ditemukan!")
            return

        df = load_excel_data(data_file)

        if "Status" not in df.columns:
            df["Status"] = STATUS_BELUM
        if "Keterangan" not in df.columns:
            df["Keterangan"] = ""
        if "Timestamp" not in df.columns:
            df["Timestamp"] = ""
        if "Batch" not in df.columns:
            df["Batch"] = ""

    # Pastikan kolom tambahan ada meski dari checkpoint lama
    for col in ["Keterangan", "Timestamp", "Batch"]:
        if col not in df.columns:
            df[col] = ""

    total_data   = len(df)
    batch_number = 1
    batch_count  = 0  # Counter transaksi dalam batch ini

    # Session tracking untuk laporan ke server
    session_start_time = datetime.now()
    captcha_total_count = 0
    captcha_sukses_count = 0
    nik_tidak_terdaftar_count = 0
    nik_kuota_habis_count = 0
    nik_meninggal_count = 0
    nik_dibawah_umur_count = 0
    nik_tidak_aktif_count = 0

    # ----------------------------------------------------------
    # 2. Browser
    # ----------------------------------------------------------
    with sync_playwright() as p:
        print("[INFO] Membuka browser (Persistent Session)...")
        # Persistent context → session/cookies tersimpan, tidak perlu login ulang
        os.makedirs(BROWSER_DATA, exist_ok=True)
        context = p.chromium.launch_persistent_context(
            user_data_dir=BROWSER_DATA,
            headless=False,
            slow_mo=250,
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/136.0.0.0 Safari/537.36"
            ),
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
                "--start-maximized",
            ],
        )
        page = context.pages[0] if context.pages else context.new_page()
        Stealth().apply_stealth_sync(page)
        page.goto("https://subsiditepatlpg.mypertamina.id/merchant/app")

        # Tunggu jika perlu login
        def _handle_manual_login(page, stop_event, pause_event, on_progress, total_data):
            """Proses login manual + simpan credentials."""
            print("[INFO] Halaman login terdeteksi. Silakan login manual di browser...")
            if on_progress:
                on_progress(0, total_data, "🔑 Silakan login di browser, lalu klik LANJUTKAN")
            if pause_event:
                pause_event.set()
            # Tunggu sampai bukan login page
            while _check_login_page(page):
                if _check_stop(stop_event):
                    return
                time.sleep(1)
            if not _check_stop(stop_event):
                # Tunggu user klik Lanjutkan di GUI
                if pause_event:
                    while pause_event.is_set():
                        if _check_stop(stop_event):
                            return
                        time.sleep(0.3)
                print("[✓] Login berhasil!")
                _interruptible_sleep(2, stop_event)

                # Simpan credentials dari form jika belum ada
                try:
                    from credentials import load_credentials, save_credentials
                    existing_user, existing_pass = load_credentials()
                    if not existing_user:
                        try:
                            user_val = page.query_selector("input[placeholder*='Nomor Ponsel']")
                            pass_val = page.query_selector("input[type='password']")
                            if user_val and pass_val:
                                u = user_val.get_attribute("value") or ""
                                p = pass_val.get_attribute("value") or ""
                                if u and p and len(p) >= 4:
                                    save_credentials(u, p)
                                    print(f"[CRED] Credentials disimpan: {u[:4]}***")
                        except:
                            pass
                except:
                    pass

        # CEK dan AUTO-LOGIN
        print("[INFO] Memeriksa status login...")
        if _check_login_page(page):
            print("[INFO] Halaman login terdeteksi, mencoba auto-login...")
            if _do_auto_login(page, stop_event):
                # Tunggu sebentar dan cek apakah masih di halaman login
                time.sleep(3)
                if not _check_login_page(page):
                    print("[✓] Auto-login BERHASIL! Login ke dashboard...")
                    _interruptible_sleep(2, stop_event)
                else:
                    print("[!] Auto-login GAGAL (mungkin credentials salah), tunggu user...")
                    _handle_manual_login(page, stop_event, pause_event, on_progress, total_data)
            else:
                print("[!] Auto-login GAGAL (credentials tidak ditemukan), tunggu user...")
                _handle_manual_login(page, stop_event, pause_event, on_progress, total_data)
        else:
            print("[INFO] Sudah login (session aktif), langsung ke dashboard...")

        # ----------------------------------------------------------
        # 3. Loop per NIK
        # ----------------------------------------------------------
        processed_count = 0
        for index, row in df.iterrows():

            # --- Cek STOP ---
            if _check_stop(stop_event):
                print("\n[INFO] Bot dihentikan oleh pengguna.")
                break

            # --- Cek apakah session expired (redirect ke login) ---
            if _check_login_page(page):
                if not _wait_for_relogin(page, stop_event, pause_event, on_progress):
                    break
                page.goto("https://subsiditepatlpg.mypertamina.id/merchant/app")
                _interruptible_sleep(2, stop_event)

            # --- Cek PAUSE (batch limit) ---
            if pause_event and pause_event.is_set():
                print(f"\n[PAUSE] Batch {batch_number} selesai. Menunggu perintah lanjut dari pengguna...")
                if on_progress:
                    on_progress(processed_count, total_data, f"⏸ PAUSE — Batch {batch_number} selesai ({batch_count} data). Klik 'Lanjut' untuk melanjutkan.")
                
                # Kirim notifikasi ke Telegram
                wa_num = _get_whatsapp_number()
                if wa_num:
                    _send_telegram_notification(
                        whatsapp=wa_num,
                        status="PAUSE",
                        message=f"Batch {batch_number} selesai diproses ({batch_count} data). Menunggu perintah lanjut.",
                        sukses=df[df["Status"] == STATUS_SUKSES].shape[0],
                        sisa=df[df["Status"] == STATUS_BELUM].shape[0]
                    )

                # Polling status dan command
                poll_timer = 0.0
                while pause_event.is_set():
                    if _check_stop(stop_event):
                        break
                    
                    # Cek perintah dari Telegram
                    if wa_num and poll_timer >= 5.0:
                        if _poll_telegram_command(wa_num) == "resume":
                            print("[TELEGRAM] Menerima perintah REMOTE RESUME dari Telegram. Melanjutkan...")
                            pause_event.clear()
                            break
                        poll_timer = 0.0
                    
                    time.sleep(0.5)
                    poll_timer += 0.5

                if _check_stop(stop_event):
                    break
                batch_number += 1
                batch_count = 0
                print(f"[INFO] Melanjutkan Batch {batch_number}...")

            # --- Skip yang sudah selesai ---
            if row.get("Status") in DONE_STATUSES:
                processed_count += 1
                continue

            # Bersihkan NIK agar terhindar dari format scientific, float, tanda kutip/apostrof, spasi, atau karakter non-angka
            raw_nik = row["NIK"]
            raw_str = str(raw_nik).strip()
            if raw_str.endswith(".0"):
                raw_str = raw_str[:-2]
            if "e" in raw_str.lower():
                try:
                    raw_str = str(int(float(raw_str)))
                except Exception:
                    pass
            # Ekstrak seluruh digit angka murni
            nik_value = "".join(c for c in raw_str if c.isdigit())

            # --- Cek Lisensi & Kuota Per NIK ---
            if hwid:
                from license_manager import verify_license
                valid, msg, _ = verify_license(hwid, jumlah_tabung)
                if not valid:
                    print(f"\n[ERROR] Kuota tidak mencukupi: {msg}")
                    if on_progress:
                        on_progress(processed_count, total_data, f"❌ Lisensi: {msg}")
                    break
            # Validasi format NIK (16 digit)
            if len(nik_value) != 16:
                print(f"[SKIP] NIK '{raw_nik}' format tidak valid ({len(nik_value)} digit != 16), dilewati.")
                df.at[index, "Status"]     = STATUS_SKIP
                df.at[index, "Keterangan"] = f"Format NIK tidak valid ({len(nik_value)} digit)"
                df.at[index, "Timestamp"]  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                _save_results(df)
                processed_count += 1
                continue

            print(f"\n--- Memproses NIK: {nik_value} ({processed_count + 1}/{total_data}) ---")
            if on_progress:
                on_progress(processed_count, total_data, f"⚙ Memproses NIK {nik_value} ({processed_count + 1}/{total_data})")

            nik_start_time = time.time()
            nik_done = False
            skip_this_nik = False
            nik_info = parse_nik_info(nik_value, row.to_dict())
            for retry_num in range(MAX_RETRY + 1):
              if _check_stop(stop_event) or nik_done or skip_this_nik:
                  break
              if retry_num > 0:
                  print(f"[RETRY] Percobaan ulang {retry_num}/{MAX_RETRY} untuk NIK {nik_value}...")
                  _interruptible_sleep(3 + retry_num * 2, stop_event)
                  try:
                      page.goto("https://subsiditepatlpg.mypertamina.id/merchant/app")
                      _interruptible_sleep(2, stop_event)
                  except Exception:
                      pass

              # CEK LOGIN SEBELUM SETIAP AKSI KRITIS
              if not _ensure_logged_in(page, stop_event, pause_event, on_progress):
                  break

              try:
                # --- Step 1: Tunggu & Klik Catat Penjualan ---
                print("[BOT] Menunggu tombol 'Catat Penjualan'...")
                # Loop interuptible untuk wait_for_selector agar stop_event bisa bekerja
                while True:
                    if _check_stop(stop_event):
                        break
                    try:
                        page.wait_for_selector(BTN_CATAT_PENJUALAN, timeout=2000)
                        break
                    except PlaywrightTimeoutError:
                        continue

                if _check_stop(stop_event):
                    break

                # CEK LOGIN sebelum klik Catat Penjualan
                if not _ensure_logged_in(page, stop_event, pause_event, on_progress):
                    break

                page.click(BTN_CATAT_PENJUALAN)

                # --- Step 2: Input NIK ---
                page.wait_for_selector(INPUT_NIK, timeout=10000)
                if not _interruptible_sleep(0.5, stop_event):
                    break
                page.fill(INPUT_NIK, "")
                page.type(INPUT_NIK, nik_value, delay=random.randint(50, 120))
                if not _interruptible_sleep(0.5, stop_event):
                    break

                # --- Step 3: Klik LANJUTKAN ---
                page.click(BTN_LANJUTKAN)
                if not _interruptible_sleep(1.5, stop_event):
                    break

                # --- Handle Birth Details & Choice Popup (jika ada) ---
                _handle_birth_details(page, nik_info, stop_event)
                _handle_choice_popup(page)
                _handle_birth_details(page, nik_info, stop_event)
                if not _interruptible_sleep(1.0, stop_event):
                    break

                # --- Step 3b: Cek apakah ada error kritis (tidak terdaftar, meninggal, umur, kuota) ---
                is_err, err_status, err_desc = _check_critical_nik_errors(page)
                if is_err:
                    print(f"[SKIP] NIK {nik_value} di-skip karena: {err_desc}")
                    _dismiss_error_popup(page)
                    df.at[index, "Status"]     = err_status
                    df.at[index, "Keterangan"] = err_desc
                    df.at[index, "Timestamp"]  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    _save_results(df)
                    processed_count += 1
                    page.goto("https://subsiditepatlpg.mypertamina.id/merchant/app")
                    _interruptible_sleep(2, stop_event)
                    skip_this_nik = True
                    break

                # --- Step 4: Klik CEK PESANAN ---
                try:
                    page.wait_for_selector(BTN_CEK, timeout=10000)
                except PlaywrightTimeoutError:
                    # Cek sekali lagi apakah error kritis
                    is_err, err_status, err_desc = _check_critical_nik_errors(page)
                    if is_err:
                        print(f"[SKIP] NIK {nik_value} di-skip (timeout CEK) karena: {err_desc}")
                        _dismiss_error_popup(page)
                        df.at[index, "Status"]     = err_status
                        df.at[index, "Keterangan"] = f"{err_desc} (timeout setelah LANJUTKAN)"
                        df.at[index, "Timestamp"]  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        _save_results(df)
                        processed_count += 1
                        page.goto("https://subsiditepatlpg.mypertamina.id/merchant/app")
                        _interruptible_sleep(2, stop_event)
                        skip_this_nik = True
                        break
                    raise  # Re-raise jika bukan error kritis

                if not _interruptible_sleep(0.5, stop_event):
                    break

                # --- Step 4b: Input Jumlah Tabung (Klik '+' sebelum Cek Pesanan) ---
                if jumlah_tabung > 1:
                    try:
                        plus_selectors = [
                            "[data-testid='actionIcon2']",
                            ".styles_controlerAdd__z7cTN",
                            "button:has(svg.icon-tabler-plus)",
                            "button:has(.icon-tabler-plus)"
                        ]
                        plus_btn = None
                        for sel in plus_selectors:
                            if page.is_visible(sel, timeout=2000):
                                plus_btn = sel
                                break
                        
                        if plus_btn:
                            clicks_needed = jumlah_tabung - 1
                            print(f"[BOT] Menambah jumlah tabung menjadi {jumlah_tabung} (mengklik '+' sebanyak {clicks_needed}x)...")
                            for c in range(clicks_needed):
                                if _check_stop(stop_event):
                                    break
                                page.click(plus_btn)
                                time.sleep(0.4)
                        else:
                            print("[WARN] Tombol '+' untuk menambah tabung tidak ditemukan.")
                    except Exception as e:
                        print(f"[WARN] Gagal mengatur jumlah tabung: {e}")

                page.click(BTN_CEK)

                # --- Step 5: CEK LOGIN sebelum submit ---
                if not _ensure_logged_in(page, stop_event, pause_event, on_progress):
                    break

                # --- Step 5b: Klik PROSES PENJUALAN ---
                page.wait_for_selector(BTN_PROSES, timeout=10000)
                if not _interruptible_sleep(0.5, stop_event):
                    break
                page.click(BTN_PROSES)

                # --- Step 6: Captcha ---
                # CEK LOGIN sebelum captcha (session bisa expire saat loading)
                if not _ensure_logged_in(page, stop_event, pause_event, on_progress):
                    break

                captcha_success = False
                try:
                    page.wait_for_selector(CAPTCHA_POPUP, timeout=10000)

                    # Toggle pause_event jika untuk manual override
                    if captcha_mode == CAPTCHA_MANUAL:
                        print(f"[CAPTCHA] Manual mode aktif - TUNGGU user solve captcha secara manual...")
                        if pause_event:
                            pause_event.set()
                        print(f"[CAPTCHA] Jangan ingat: {nik_value}")
                        print(f"[CAPTCHA] Prompt sering muncul 20-30 detik setelah PROSES. Biarkan user geser slider.")

                        # Tunggu user (max 120 detik lalu auto cancel)
                        timeout_start = time.time()
                        while pause_event.is_set() or not captcha_success:
                            if _check_stop(stop_event):
                                break

                            if time.time() - timeout_start > 120:
                                print(f"[CAPTCHA] TIMEOUT - Auto batal setelah 2 menit")
                                break

                            # Cek apakah captcha sudah solved
                            try:
                                page.wait_for_selector(CAPTCHA_POPUP, state="hidden", timeout=1000)
                                captcha_success = True
                                print("[CAPTCHA] ✓ User berhasil solve!")
                                break
                            except PlaywrightTimeoutError:
                                pass

                            # Tampilkan instruksi visual
                            if int(time.time() % 5) == 0:
                                print(f"  [TIMER] Tunggu user geser slider untuk {nik_value}...")

                            time.sleep(2)

                        # Clear pause setelah sukses
                        if pause_event:
                            pause_event.clear()

                        if captcha_success:
                            print("[CAPTCHA] Lanjut ke transaksi...")
                        else:
                            print("[CAPTCHA] User ganti ke gambar lain...")
                            if page.is_visible(BTN_GANTI_CAPTCHA):
                                page.click(BTN_GANTI_CAPTCHA)
                                time.sleep(3)

                    # Auto mode: bot solve captcha
                    else:
                        print("[CAPTCHA] Auto mode: Bot will solve captcha automatically with infinite retry & manual override support.")
                        attempt = 0
                        while not captcha_success:
                            if _check_stop(stop_event):
                                break

                            # 1. Cek Manual Override: Jika popup captcha sudah hilang, user menyelesaikannya secara manual
                            if not page.is_visible(CAPTCHA_POPUP):
                                captcha_success = True
                                print("[CAPTCHA] ✓ Terdeteksi sukses (di-solve manual oleh user)!")
                                break

                            print(f"[CAPTCHA] Attempt {attempt + 1}...")

                            # Delay acak sebelum memproses gambar
                            if not _interruptible_sleep(random.uniform(2, 3), stop_event):
                                break

                            # Cek manual override kembali setelah jeda
                            if not page.is_visible(CAPTCHA_POPUP):
                                captcha_success = True
                                print("[CAPTCHA] ✓ Terdeteksi sukses (di-solve manual oleh user)!")
                                break

                            bg_element = page.wait_for_selector(CAPTCHA_BG_IMG, timeout=10000)
                            slider_element = page.wait_for_selector(CAPTCHA_SLIDER_IMG, timeout=10000)
                            handle_element = page.wait_for_selector(SLIDER_HANDLE, timeout=10000)

                            if not all([bg_element, slider_element, handle_element]):
                                print("[CAPTCHA] Element missing, retrying...")
                                if page.is_visible(BTN_GANTI_CAPTCHA):
                                    page.click(BTN_GANTI_CAPTCHA)
                                _interruptible_sleep(2, stop_event)
                                continue

                            bg_src = bg_element.get_attribute("src")
                            pz_src = slider_element.get_attribute("src")

                            if not bg_src or "base64," not in bg_src:
                                _interruptible_sleep(1, stop_event)
                                continue
                            if not pz_src or "base64," not in pz_src:
                                _interruptible_sleep(1, stop_event)
                                continue

                            # Simpan gambar untuk diproses
                            with open("cap_bg.png", "wb") as f:
                                f.write(base64.b64decode(bg_src.split("base64,")[1]))
                            with open("cap_slider.png", "wb") as f:
                                f.write(base64.b64decode(pz_src.split("base64,")[1]))

                            # Selesaikan Captcha menggunakan OpenCV
                            distance = solve_captcha("cap_bg.png", "cap_slider.png")
                            print(f"[CAPTCHA] Solver return: {distance}px")

                            if distance <= 0:
                                print("[CAPTCHA] Solver return 0, ganti gambar...")
                                if page.is_visible(BTN_GANTI_CAPTCHA):
                                    page.click(BTN_GANTI_CAPTCHA)
                                _interruptible_sleep(2, stop_event)
                                continue

                            bg_cv = cv2.imread("cap_bg.png")
                            if bg_cv is not None:
                                orig_width = bg_cv.shape[1]
                                bg_box = bg_element.bounding_box()
                                dom_width = bg_box["width"]
                                ratio = dom_width / orig_width
                                 
                                # Adaptive offset tuning berdasarkan nomor attempt
                                current_offset = CAPTCHA_OFFSET
                                if attempt == 1:
                                    current_offset = CAPTCHA_OFFSET + 3.0  # Mencoba sedikit lebih jauh
                                elif attempt == 2:
                                    current_offset = CAPTCHA_OFFSET + 6.0  # Mencoba lebih jauh lagi
                                elif attempt == 3:
                                    current_offset = CAPTCHA_OFFSET - 3.0  # Mencoba sedikit lebih pendek (just in case)
                                elif attempt >= 4:
                                    current_offset = CAPTCHA_OFFSET + random.uniform(1.0, 4.0)

                                final_distance = (distance * ratio) + current_offset
                                print(f"[CAPTCHA] Offset adaptif (Attempt {attempt+1}): {current_offset:.1f}px (Default: {CAPTCHA_OFFSET}px)")

                                max_reasonable = orig_width * 0.9
                                min_reasonable = orig_width * 0.05
                                if distance < min_reasonable or distance > max_reasonable:
                                    print(f"[CAPTCHA] Jarak geser diluar nalar ({distance}px), ganti gambar...")
                                    if page.is_visible(BTN_GANTI_CAPTCHA):
                                        page.click(BTN_GANTI_CAPTCHA)
                                    _interruptible_sleep(2, stop_event)
                                    continue

                                print(f"[CAPTCHA] Jarak konversi: {distance}px → {final_distance:.1f}px")
                            else:
                                final_distance = distance

                            # Seret slider secara natural (human-like)
                            human_like_drag(page, handle_element, final_distance, stop_event)
                            time.sleep(random.uniform(0.5, 1.2))

                            try:
                                # Tunggu sampai popup hilang menandakan captcha sukses
                                page.wait_for_selector(CAPTCHA_POPUP, state="hidden", timeout=6000)
                                captcha_success = True
                                print("[CAPTCHA] ✓ BERHASIL!")
                                break
                            except PlaywrightTimeoutError:
                                attempt += 1
                                print(f"[CAPTCHA] ✗ Meleset (percobaan #{attempt}). Ganti gambar...")
                                if attempt >= 5:
                                    print("[CAPTCHA] Auto-solve masih mencoba... (Silakan bantu geser manual di browser jika mau!)")
                                if page.is_visible(BTN_GANTI_CAPTCHA):
                                    page.click(BTN_GANTI_CAPTCHA)

                    if _check_stop(stop_event):
                        break

                    # Skip block lama dihilangkan karena loop captcha bersifat permanen sampai sukses (infinite loop)


                except PlaywrightTimeoutError:
                    print("[INFO] Tidak ada captcha popup, lanjut setelah pause (jika manual mode)...")

                if _check_stop(stop_event):
                    break

                # --- Step 7: Sukses ---
                nik_done = True
                
                # Consume quota secepat mungkin (anti-bypass Hentikan) berbasis jumlah tabung
                if hwid:
                    from license_manager import consume_quota
                    consume_quota(hwid, jumlah_tabung)
                
                # Verifikasi sukses transaksi lebih kuat
                _interruptible_sleep(1.5, stop_event)
                try:
                    body_text = page.evaluate("() => document.body.innerText").lower()
                    success_keywords = ["lunas", "berhasil", "penjualan berhasil", "sukses", "selesai"]
                    if any(kw in body_text for kw in success_keywords):
                        print(f"[OK] NIK {nik_value} berhasil diproses & terverifikasi!")
                        df.at[index, "Status"]     = STATUS_SUKSES
                        df.at[index, "Keterangan"] = "Transaksi berhasil & terverifikasi"
                    else:
                        print(f"[WARN] Captcha terlewati tapi konfirmasi sukses tidak ditemukan pada halaman untuk NIK {nik_value}!")
                        df.at[index, "Status"]     = STATUS_SUKSES
                        df.at[index, "Keterangan"] = "Transaksi berhasil (tanpa teks konfirmasi)"
                except Exception as e:
                    print(f"[WARN] Gagal memverifikasi teks halaman: {e}")
                    df.at[index, "Status"]     = STATUS_SUKSES
                    df.at[index, "Keterangan"] = "Transaksi berhasil"
                df.at[index, "Timestamp"]  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                df.at[index, "Batch"]      = f"Batch-{batch_number}"
                _save_results(df)

                batch_count  += 1
                processed_count += 1

                if on_progress:
                    on_progress(processed_count, total_data, f"✓ NIK {nik_value} sukses ({processed_count}/{total_data})")

                # Kembali ke dashboard
                page.goto("https://subsiditepatlpg.mypertamina.id/merchant/app")


                # --- Cek Batch Limit ---

                # --- Cek Batch Limit ---
                if batch_limit > 0 and batch_count >= batch_limit:
                    print(f"\n[BATCH] Batas {batch_limit} data tercapai di Batch {batch_number}.")
                    if pause_event:
                        pause_event.set()

              except Exception as e:
                if _check_stop(stop_event):
                    break
                elapsed = time.time() - nik_start_time
                if elapsed > NIK_TIMEOUT_SEC:
                    print(f"[TIMEOUT] NIK {nik_value} melebihi {NIK_TIMEOUT_SEC}s, skip.")
                    retry_num = MAX_RETRY  # force no more retry
                if retry_num < MAX_RETRY:
                    print(f"[ERROR] NIK {nik_value}: {e} → akan retry...")
                    continue
                print(f"[ERROR] NIK {nik_value}: {e} (final)")
                try:
                    page.screenshot(path=f"error_{nik_value}.png")
                except Exception:
                    pass
                df.at[index, "Status"]     = STATUS_ERROR
                df.at[index, "Keterangan"] = str(e)[:200]
                df.at[index, "Timestamp"]  = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                df.at[index, "Batch"]      = f"Batch-{batch_number}"
                _save_results(df)
                
                # Kirim notifikasi error ke Telegram
                wa_num = _get_whatsapp_number()
                if wa_num:
                    _send_telegram_notification(
                        whatsapp=wa_num,
                        status="ERROR SYSTEM",
                        message=f"NIK {nik_value} gagal: {str(e)[:100]}",
                        sukses=df[df["Status"] == STATUS_SUKSES].shape[0],
                        sisa=df[df["Status"] == STATUS_BELUM].shape[0]
                    )
                processed_count += 1
                try:
                    page.goto("https://subsiditepatlpg.mypertamina.id/merchant/app")
                    _interruptible_sleep(2, stop_event)
                except Exception:
                    pass

        # ----------------------------------------------------------
        # 4. Selesai
        # ----------------------------------------------------------
        sukses_total  = len(df[df["Status"] == STATUS_SUKSES])
        gagal_total   = len(df[df["Status"].isin([STATUS_GAGAL_CAPTCHA, STATUS_ERROR, STATUS_NIK_INVALID, STATUS_SKIP])])
        print(f"\n=== Selesai! Sukses: {sukses_total} | Gagal: {gagal_total} ===")

        # Kirim notifikasi selesai ke Telegram
        wa_num = _get_whatsapp_number()
        if wa_num:
            _send_telegram_notification(
                whatsapp=wa_num,
                status="SUKSES",
                message=f"Seluruh transaksi selesai diproses! Total data sukses: {sukses_total}, gagal/skip: {gagal_total}.",
                sukses=sukses_total,
                sisa=0
            )

        if on_progress:
            on_progress(processed_count, total_data, f"✅ Selesai — {sukses_total} sukses, {gagal_total} gagal")

        # Kirim laporan sesi ke server (untuk analitik dashboard admin)
        wa_num_report = _get_whatsapp_number()
        if wa_num_report:
            session_end_time = datetime.now()
            duration_sec = (session_end_time - session_start_time).total_seconds()
            avg_sec = duration_sec / max(processed_count, 1)
            threading.Thread(
                target=_report_session_to_server,
                kwargs={
                    "whatsapp": wa_num_report,
                    "session_start": session_start_time,
                    "session_end": session_end_time,
                    "total_nik": total_data,
                    "nik_sukses": sukses_total,
                    "nik_gagal": gagal_total,
                    "nik_tidak_terdaftar": nik_tidak_terdaftar_count,
                    "nik_kuota_habis": nik_kuota_habis_count,
                    "nik_meninggal": nik_meninggal_count,
                    "nik_dibawah_umur": nik_dibawah_umur_count,
                    "nik_tidak_aktif": nik_tidak_aktif_count,
                    "captcha_total": captcha_total_count,
                    "captcha_sukses": captcha_sukses_count,
                    "jumlah_tabung": jumlah_tabung,
                    "avg_seconds_per_nik": round(avg_sec, 2),
                    "batch_number": batch_number,
                },
                daemon=True,
            ).start()

        try:
            context.close()
        except Exception:
            pass


if __name__ == "__main__":
    run_bot()
