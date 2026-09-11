"""
fast_filter_service.py
Modul pemindai dan pemfilter NIK berkecepatan tinggi menggunakan direct REST API MyPertamina.
Mampu memindai 100-1000 NIK dalam waktu 15-30 detik secara multithreading.
"""

import os
import json
import time
import urllib.request
import urllib.error
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

API_HOST = "https://api-map.my-pertamina.id"
DEFAULT_AUTH_BASIC = "Basic dGVsa29tOmRhMWMyNWQ4LTM3YzgtNDFiMS1hZmUyLTQyZGQ0ODI1YmZlYQ=="

STATUS_RT = "TERDAFTAR - RUMAH TANGGA"
STATUS_UM = "TERDAFTAR - USAHA MIKRO"
STATUS_RETAILER = "TERDAFTAR - PENGECER"
STATUS_BELUM = "BELUM TERDAFTAR"
STATUS_ERROR = "GAGAL CEK"
STATUS_INVALID_FORMAT = "FORMAT NIK INVALID"

def get_session_token(browser_data_dir: str = "browser_data") -> str:
    """Mencoba mengambil token JWT dari cache browser lokal jika tersedia."""
    try:
        token_file = os.path.join(browser_data_dir, "session_token.json")
        if os.path.exists(token_file):
            with open(token_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("access_token", "")
    except Exception:
        pass
    return ""


def save_session_token(token: str, browser_data_dir: str = "browser_data"):
    """Menyimpan token JWT ke browser_data untuk reuse cepat."""
    try:
        os.makedirs(browser_data_dir, exist_ok=True)
        token_file = os.path.join(browser_data_dir, "session_token.json")
        with open(token_file, "w", encoding="utf-8") as f:
            json.dump({"access_token": token, "updated_at": datetime.now().isoformat()}, f)
    except Exception:
        pass


def verify_single_nik(nik: str, bearer_token: str = "") -> dict:
    """
    Memeriksa satu NIK langsung ke REST API MyPertamina.
    Returns: dict info NIK (status, kategori, nama, token, raw_data).
    """
    clean_nik = "".join(c for c in str(nik) if c.isdigit())
    if len(clean_nik) != 16:
        return {
            "nik": nik,
            "valid": False,
            "status": STATUS_INVALID_FORMAT,
            "kategori": "-",
            "nama": "-",
            "keterangan": f"Jumlah digit {len(clean_nik)} != 16"
        }

    url = f"{API_HOST}/general/customer-service/v1/verify-nik?nationalityId={clean_nik}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
    }

    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}" if not bearer_token.startswith("Bearer ") else bearer_token
    else:
        headers["Authorization"] = DEFAULT_AUTH_BASIC

    req = urllib.request.Request(url, headers=headers, method="GET")

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            data = res_data.get("data", {})
            customer_types = data.get("customerTypes", [])
            name = data.get("name", "")
            
            # Deteksi Kategori
            kategori_list = [t.get("name", "") for t in customer_types if isinstance(t, dict)]
            if "Usaha Mikro" in kategori_list:
                kategori = "Usaha Mikro"
                status = STATUS_UM
            elif "Rumah Tangga" in kategori_list:
                kategori = "Rumah Tangga"
                status = STATUS_RT
            elif "Pengecer" in kategori_list:
                kategori = "Pengecer"
                status = STATUS_RETAILER
            else:
                kategori = "Terdaftar"
                status = "TERDAFTAR"

            return {
                "nik": clean_nik,
                "valid": True,
                "status": status,
                "kategori": kategori,
                "nama": name,
                "token": data.get("token", ""),
                "keterangan": "NIK aktif terdaftar",
                "data": data
            }

    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8")
            err_json = json.loads(body)
            msg = err_json.get("message", "")
        except Exception:
            msg = str(e)

        if e.code == 404 or "tidak ditemukan" in msg.lower() or "belum terdaftar" in msg.lower():
            return {
                "nik": clean_nik,
                "valid": False,
                "status": STATUS_BELUM,
                "kategori": "-",
                "nama": "-",
                "keterangan": "NIK belum terdaftar di DUKCAPIL/Pertamina"
            }
        elif e.code == 401 or e.code == 403:
            return {
                "nik": clean_nik,
                "valid": False,
                "status": STATUS_ERROR,
                "kategori": "-",
                "nama": "-",
                "keterangan": "Session pangkalan expired / butuh login ulang"
            }
        else:
            return {
                "nik": clean_nik,
                "valid": False,
                "status": STATUS_ERROR,
                "kategori": "-",
                "nama": "-",
                "keterangan": f"HTTP {e.code}: {msg[:60]}"
            }

    except Exception as e:
        return {
            "nik": clean_nik,
            "valid": False,
            "status": STATUS_ERROR,
            "kategori": "-",
            "nama": "-",
            "keterangan": f"Koneksi timeout/error: {str(e)[:50]}"
        }


def run_fast_filter(
    input_file: str,
    output_report_file: str = "hasil_filter_nik.xlsx",
    output_ready_file: str = "data_siap_proses.xlsx",
    max_workers: int = 8,
    bearer_token: str = "",
    on_progress=None,
    stop_event=None
) -> tuple[int, int, int, str]:
    """
    Menjalankan pemindaian cepat satu file Excel penuh.
    Returns: (total, terdaftar, invalid, message)
    """
    from map_bot_visual import load_excel_data, clean_nik_digits

    df = load_excel_data(input_file)
    if df.empty or "NIK" not in df.columns:
        return 0, 0, 0, "File Excel kosong atau kolom NIK tidak ditemukan!"

    nik_list = [clean_nik_digits(n) for n in df["NIK"]]
    total = len(nik_list)

    results = []
    processed = 0
    count_rt = 0
    count_um = 0
    count_invalid = 0

    if not bearer_token:
        bearer_token = get_session_token()

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_nik = {executor.submit(verify_single_nik, nik, bearer_token): nik for nik in nik_list}

        for future in as_completed(future_to_nik):
            if stop_event and stop_event.is_set():
                break

            res = future.result()
            results.append(res)
            processed += 1

            if res["status"] in [STATUS_RT, STATUS_UM, "TERDAFTAR"]:
                if res["status"] == STATUS_UM:
                    count_um += 1
                else:
                    count_rt += 1
            else:
                count_invalid += 1

            if on_progress:
                on_progress(processed, total, count_rt, count_um, count_invalid, f"Memeriksa {res['nik']} -> {res['status']}")

    if not results:
        return 0, 0, 0, "Pemindaian dihentikan sebelum ada hasil."

    # Buat DataFrame Laporan Lengkap
    df_report = pd.DataFrame(results)
    col_order = ["nik", "status", "kategori", "nama", "keterangan"]
    cols = [c for c in col_order if c in df_report.columns] + [c for c in df_report.columns if c not in col_order and c != "data"]
    df_report = df_report[cols]
    df_report.rename(columns={
        "nik": "NIK",
        "status": "Status",
        "kategori": "Kategori",
        "nama": "Nama",
        "keterangan": "Keterangan"
    }, inplace=True)
    df_report.to_excel(output_report_file, index=False)

    # Buat DataFrame Khusus Siap Proses (Hanya NIK yang valid)
    df_ready = df_report[df_report["Status"].isin([STATUS_RT, STATUS_UM, "TERDAFTAR"])].copy()
    df_ready.to_excel(output_ready_file, index=False)

    msg = f"Selesai! Total: {processed} NIK | RT: {count_rt} | UM: {count_um} | Invalid/Belum: {count_invalid}"
    return processed, (count_rt + count_um), count_invalid, msg
