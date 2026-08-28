"""
credentials.py
===============
Store username/password in plaintext config file (user's choice)
"""

import os
import json

CREDENTIAL_FILE = "credentials.json"


def save_credentials(username: str, password: str):
    """Simpan credentials ke file (plaintext)."""
    data = {"username": username, "password": password}
    with open(CREDENTIAL_FILE, "w") as f:
        json.dump(data, f, indent=2)


def load_credentials() -> tuple[str | None, str | None]:
    """
    Load credentials dari file.
    Returns (username: str | None, password: str | None)
    """
    if not os.path.exists(CREDENTIAL_FILE):
        return None, None

    try:
        with open(CREDENTIAL_FILE, "r") as f:
            data = json.load(f)
            return data.get("username"), data.get("password")
    except Exception:
        return None, None


def delete_credentials():
    """Hapus sesi credentials."""
    if os.path.exists(CREDENTIAL_FILE):
        os.remove(CREDENTIAL_FILE)
