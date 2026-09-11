"""
nib_service.py
Modul pengecekan legalitas NIB (Nomor Induk Berusaha) OSS Indonesia langsung melalui API gateway MyPertamina.
"""

import urllib.request
import urllib.error
import json

API_HOST = "https://api-map.my-pertamina.id"
DEFAULT_AUTH_BASIC = "Basic dGVsa29tOmRhMWMyNWQ4LTM3YzgtNDFiMS1hZmUyLTQyZGQ0ODI1YmZlYQ=="

# Daftar usaha yang dilarang menggunakan LPG 3 Kg bersubsidi
# Surat Edaran Direktur Jenderal Minyak dan Gas Bumi No.B-2461/MG.05/DJM/2022
BANNED_BUSINESS_KEYWORDS = [
    "restoran", "hotel", "binatu", "laundry", "batik", "peternakan",
    "pertanian", "tani tembakau", "tembakau", "las", "bengkel las",
    "pabrik", "industri", "manufaktur"
]

def check_nib_oss(nib: str, bearer_token: str = "") -> dict:
    """
    Memeriksa keabsahan NIB ke database OSS melalui endpoint Pertamina:
    GET /general/oss/v1/nib/check/micro-business?nib={nib}
    """
    clean_nib = "".join(c for c in str(nib) if c.isdigit())
    if not clean_nib:
        return {
            "success": False,
            "message": "Nomor NIB tidak boleh kosong!",
            "data": None
        }

    url = f"{API_HOST}/general/oss/v1/nib/check/micro-business?nib={clean_nib}"
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
        with urllib.request.urlopen(req, timeout=10) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            data = res_json.get("data", {})
            
            business_name = data.get("businessName") or data.get("namaPerusahaan") or data.get("name") or "-"
            kbli = data.get("kbli") or "-"
            kbli_desc = data.get("kbliDescription") or data.get("uraianKbli") or "-"
            status_nib = data.get("status") or "AKTIF"
            
            # Periksa apakah jenis usaha dilarang
            full_desc = f"{business_name} {kbli_desc}".lower()
            is_banned = any(b in full_desc for b in BANNED_BUSINESS_KEYWORDS)

            return {
                "success": True,
                "nib": clean_nib,
                "business_name": business_name,
                "kbli": kbli,
                "kbli_description": kbli_desc,
                "status_nib": status_nib,
                "is_banned": is_banned,
                "banned_reason": "Jenis usaha ini termasuk dalam daftar dilarang subsidi (Surat Edaran Dirjen Migas No.B-2461/MG.05/DJM/2022)" if is_banned else "Memenuhi syarat subsidi Usaha Mikro",
                "raw_data": data
            }

    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8")
            err_json = json.loads(body)
            msg = err_json.get("message") or err_json.get("error") or str(e)
        except Exception:
            msg = str(e)

        return {
            "success": False,
            "nib": clean_nib,
            "message": f"NIB tidak ditemukan di database OSS / {msg}",
            "is_banned": False,
            "data": None
        }

    except Exception as e:
        return {
            "success": False,
            "nib": clean_nib,
            "message": f"Koneksi gagal: {str(e)}",
            "is_banned": False,
            "data": None
        }
