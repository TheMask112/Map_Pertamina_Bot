"""
gui_app.py — Bot MAP Pertamina v3
Premium dark UI with CustomTkinter
"""
import customtkinter as ctk
from tkinter import filedialog
import threading
import sys
import os
import subprocess
import time
import winsound

from map_bot_visual import run_bot, health_check, load_excel_data, RESULT_FILE, SUKSES_FILE, GAGAL_FILE, find_nik_column, STATUS_SKIP
from license_manager import (
    get_hwid,
    verify_license,
    save_license_key,
    get_license_info,
    PAKETS,
)

# ============================================================
# Theme
# ============================================================
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

# Warna custom premium (Light Mode, Dark Mode)
C_BG         = ("#F8FAFC", "#0D0F14")       # background utama
C_PANEL      = ("#FFFFFF", "#13161E")       # panel / card
C_BORDER     = ("#E2E8F0", "#1E2330")       # border card
C_ACCENT     = ("#2563EB", "#3B82F6")       # biru premium (primary)
C_ACCENT2    = ("#4F46E5", "#6366F1")       # indigo (secondary)
C_SUCCESS    = ("#059669", "#10B981")       # hijau emerald
C_WARNING    = ("#D97706", "#F59E0B")       # amber
C_DANGER     = ("#DC2626", "#EF4444")       # merah
C_TEXT       = ("#0F172A", "#E2E8F0")       # teks utama
C_MUTED      = ("#475569", "#64748B")       # teks secondary
C_GOLD       = ("#D97706", "#F59E0B")       # aksen emas untuk premium badge


# ============================================================
# Text Redirector
# ============================================================
class TextRedirector:
    def __init__(self, widget):
        self.widget = widget
        self._orig_stdout = sys.__stdout__
        # Auto-create log file
        from datetime import datetime
        self._log_file = f"log_bot_{datetime.now().strftime('%Y%m%d')}.txt"
        try:
            self._fh = open(self._log_file, "a", encoding="utf-8")
        except Exception:
            self._fh = None

    def write(self, s):
        def update_gui():
            try:
                self.widget.configure(state="normal")
                self.widget.insert("end", s)
                self.widget.see("end")
                self.widget.configure(state="disabled")
            except Exception:
                pass
        
        try:
            self.widget.after(0, update_gui)
        except Exception:
            pass

        # Also write to file
        if self._fh:
            try:
                self._fh.write(s)
                self._fh.flush()
            except Exception:
                pass
        # Also write to original stdout (console)
        if self._orig_stdout:
            try:
                self._orig_stdout.write(s)
            except Exception:
                pass

    def flush(self):
        if self._fh:
            try:
                self._fh.flush()
            except Exception:
                pass



# ============================================================
# License Screen
# ============================================================
class LicenseScreen(ctk.CTkFrame):
    def __init__(self, master, hwid: str, on_success):
        super().__init__(master, fg_color=C_BG)
        self.hwid = hwid
        self.on_success = on_success
        self._build()

    def _build(self):
        self.pack(fill="both", expand=True)

        # Logo / Header
        header = ctk.CTkFrame(self, fg_color=C_PANEL, corner_radius=0)
        header.pack(fill="x")
        ctk.CTkLabel(
            header,
            text="⛽  BOT MAP PERTAMINA",
            font=ctk.CTkFont(family="Segoe UI", size=22, weight="bold"),
            text_color=C_ACCENT,
        ).pack(pady=(24, 4))
        ctk.CTkLabel(
            header,
            text="Auto-Input NIK · Bypass Captcha · Multi-Batch",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color=C_MUTED,
        ).pack(pady=(0, 20))

        # Card
        card = ctk.CTkFrame(self, fg_color=C_PANEL, corner_radius=16, border_color=C_BORDER, border_width=1)
        card.pack(pady=40, padx=60, fill="x")

        ctk.CTkLabel(
            card,
            text="🔑  Aktivasi Lisensi",
            font=ctk.CTkFont(family="Segoe UI", size=18, weight="bold"),
            text_color=C_TEXT,
        ).pack(pady=(28, 4))

        ctk.CTkLabel(
            card, text="Hardware ID komputer Anda (kirim ke Admin):",
            font=ctk.CTkFont(size=12), text_color=C_MUTED,
        ).pack(pady=(16, 2))

        hwid_frame = ctk.CTkFrame(card, fg_color=C_BG, corner_radius=8)
        hwid_frame.pack(padx=30, fill="x")
        entry_hwid = ctk.CTkEntry(
            hwid_frame, width=400, justify="center",
            font=ctk.CTkFont(family="Consolas", size=12),
            fg_color=C_BG, border_color=C_BORDER, text_color=C_ACCENT,
        )
        entry_hwid.pack(pady=8, padx=12, fill="x")
        entry_hwid.insert(0, self.hwid)
        entry_hwid.configure(state="readonly")

        # Copy button
        ctk.CTkButton(
            card, text="📋 Salin HWID", height=32, width=140,
            fg_color=C_BORDER, hover_color=C_BG, text_color=C_MUTED,
            font=ctk.CTkFont(size=12),
            command=lambda: self._copy(self.hwid),
        ).pack(pady=(0, 16))

        ctk.CTkLabel(
            card, text="Masukkan License Key:",
            font=ctk.CTkFont(size=12), text_color=C_MUTED,
        ).pack(pady=(4, 2))

        self.entry_key = ctk.CTkEntry(
            card, width=400, justify="center",
            font=ctk.CTkFont(family="Consolas", size=12),
            fg_color=C_BG, border_color=C_BORDER, text_color=C_TEXT,
            placeholder_text="Paste license key di sini...",
        )
        self.entry_key.pack(padx=30, pady=8, fill="x")

        self.lbl_error = ctk.CTkLabel(card, text="", font=ctk.CTkFont(size=11), text_color=C_DANGER)
        self.lbl_error.pack(pady=4)

        ctk.CTkButton(
            card,
            text="AKTIVASI  →",
            height=44,
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            fg_color=C_ACCENT, hover_color=C_ACCENT2,
            command=self._do_activate,
        ).pack(pady=(8, 28), padx=30, fill="x")


    def _copy(self, text):
        self.clipboard_clear()
        self.clipboard_append(text)

    def _do_activate(self):
        key = self.entry_key.get().strip()
        if not key:
            self.lbl_error.configure(text="Masukkan license key terlebih dahulu.")
            return
        save_license_key(key)
        valid, msg, _ = verify_license(self.hwid)
        if valid:
            self.on_success()
        else:
            self.lbl_error.configure(text=f"❌ {msg}")


# ============================================================
# Main App Screen
# ============================================================
class MainScreen(ctk.CTkFrame):
    def __init__(self, master, hwid: str):
        super().__init__(master, fg_color=C_BG)
        self.hwid         = hwid
        self.selected_file = "data_pelanggan.xlsx"
        self.stop_event   = None
        self.pause_event  = None
        self.bot_thread   = None
        self._is_paused   = False
        self._bot_start_time = None
        self._nik_times   = []  # list waktu per NIK untuk ETA
        # BASE_DIR untuk path relative dari app
        if getattr(sys, 'frozen', False):
            self.BASE_DIR = os.path.dirname(sys.executable)
        else:
            self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        self._build()
        self._refresh_license_info()

    def _build(self):
        self.pack(fill="both", expand=True)

        # ── TOP BAR ──────────────────────────────────────────
        topbar = ctk.CTkFrame(self, fg_color=C_PANEL, corner_radius=0, height=56)
        topbar.pack(fill="x")
        topbar.pack_propagate(False)

        ctk.CTkLabel(
            topbar,
            text="⛽  BOT MAP PERTAMINA",
            font=ctk.CTkFont(family="Segoe UI", size=16, weight="bold"),
            text_color=C_ACCENT,
        ).pack(side="left", padx=20)

        self.lbl_paket = ctk.CTkLabel(
            topbar, text="",
            font=ctk.CTkFont(family="Segoe UI", size=11),
            text_color=C_GOLD,
        )
        self.lbl_paket.pack(side="right", padx=20)

        # Theme toggle
        self.btn_theme = ctk.CTkButton(
            topbar, text="☀️", width=36, height=30,
            fg_color=C_BORDER, hover_color=C_BG, text_color=C_MUTED,
            font=ctk.CTkFont(size=14),
            command=self._toggle_theme,
        )
        self.btn_theme.pack(side="right", padx=4)

        # ── BODY ─────────────────────────────────────────────
        body = ctk.CTkFrame(self, fg_color=C_BG)
        body.pack(fill="both", expand=True, padx=20, pady=16)

        # Left column
        left = ctk.CTkFrame(body, fg_color="transparent")
        left.pack(side="left", fill="both", expand=True)

        # Right column (stats)
        right = ctk.CTkFrame(body, fg_color="transparent", width=200)
        right.pack(side="right", fill="y", padx=(12, 0))
        right.pack_propagate(False)

        # ── FILE SELECTOR ─────────────────────────────────────
        file_card = self._make_card(left, "📂  File Data Excel")
        file_inner = ctk.CTkFrame(file_card, fg_color="transparent")
        file_inner.pack(fill="x", padx=16, pady=(0, 14))

        self.lbl_file = ctk.CTkLabel(
            file_inner,
            text=f"data_pelanggan.xlsx",
            font=ctk.CTkFont(family="Consolas", size=11),
            text_color=C_TEXT,
        )
        self.lbl_file.pack(side="left")

        ctk.CTkButton(
            file_inner, text="Pilih File", width=100, height=30,
            fg_color=C_BORDER, hover_color=C_PANEL, text_color=C_TEXT,
            font=ctk.CTkFont(size=12),
            command=self._browse_file,
        ).pack(side="right")

        # ── PENGATURAN ────────────────────────────────────────
        setting_card = self._make_card(left, "⚙️  Pengaturan")
        sg = ctk.CTkFrame(setting_card, fg_color="transparent")
        sg.pack(fill="x", padx=16, pady=(0, 14))

        ctk.CTkLabel(sg, text="Jumlah tabung:", font=ctk.CTkFont(size=12), text_color=C_MUTED).grid(row=0, column=0, sticky="w", pady=4)
        self.combo_tabung = ctk.CTkComboBox(
            sg,
            values=["1", "2", "3", "4", "5"],
            width=80, height=32,
            fg_color=C_BG, border_color=C_BORDER, button_color=C_ACCENT,
            text_color=C_TEXT, font=ctk.CTkFont(size=12),
        )
        self.combo_tabung.set("1")
        self.combo_tabung.grid(row=0, column=1, padx=(12, 0), pady=4, sticky="w")

        ctk.CTkLabel(sg, text="Batas per batch:", font=ctk.CTkFont(size=12), text_color=C_MUTED).grid(row=1, column=0, sticky="w", pady=4)
        self.combo_batch = ctk.CTkComboBox(
            sg,
            values=["Tanpa Batas", "50 Data", "100 Data", "200 Data"],
            width=140, height=32,
            fg_color=C_BG, border_color=C_BORDER, button_color=C_ACCENT,
            text_color=C_TEXT, font=ctk.CTkFont(size=12),
        )
        self.combo_batch.set("Tanpa Batas")
        self.combo_batch.grid(row=1, column=1, padx=(12, 0), pady=4)

        ctk.CTkLabel(sg, text="Jeda antar batch:", font=ctk.CTkFont(size=12), text_color=C_MUTED).grid(row=2, column=0, sticky="w", pady=4)
        self.lbl_jeda_info = ctk.CTkLabel(
            sg, text="Manual (klik 'Lanjutkan')",
            font=ctk.CTkFont(size=12), text_color=C_MUTED,
        )
        self.lbl_jeda_info.grid(row=2, column=1, padx=(12, 0), sticky="w")

        ctk.CTkLabel(sg, text="Mode Captcha:", font=ctk.CTkFont(size=12), text_color=C_MUTED).grid(row=3, column=0, sticky="w", pady=4)
        self.combo_captcha = ctk.CTkComboBox(
            sg,
            values=["Auto (Bot)", "Manual (User)"],
            width=160, height=32,
            fg_color=C_BG, border_color=C_BORDER, button_color=C_ACCENT,
            text_color=C_TEXT, font=ctk.CTkFont(size=12),
        )
        self.combo_captcha.set("Auto (Bot)")
        self.combo_captcha.grid(row=3, column=1, padx=(12, 0), pady=4)

        # Separator line
        ctk.CTkFrame(sg, fg_color=C_BORDER, height=1).grid(row=4, column=0, columnspan=2, sticky="ew", pady=(6, 6))

        # Multi-Pangkalan Profile Row
        ctk.CTkLabel(sg, text="Pangkalan:", font=ctk.CTkFont(size=12, weight="bold"), text_color=C_GOLD).grid(row=5, column=0, sticky="w", pady=4)
        p_frame = ctk.CTkFrame(sg, fg_color="transparent")
        p_frame.grid(row=5, column=1, sticky="w", pady=4)

        self.combo_pangkalan = ctk.CTkComboBox(
            p_frame,
            values=["Pangkalan Utama"],
            width=180, height=32,
            fg_color=C_BG, border_color=C_BORDER, button_color=C_ACCENT,
            text_color=C_TEXT, font=ctk.CTkFont(size=12),
            command=self._on_pangkalan_selected,
        )
        self.combo_pangkalan.pack(side="left")

        ctk.CTkButton(
            p_frame, text="➕", width=32, height=32,
            fg_color=C_BORDER, hover_color=C_ACCENT, text_color=C_TEXT,
            font=ctk.CTkFont(size=13),
            command=self._add_new_pangkalan,
        ).pack(side="left", padx=(6, 2))

        self.btn_del_pangkalan = ctk.CTkButton(
            p_frame, text="🗑", width=32, height=32,
            fg_color=C_BORDER, hover_color=C_DANGER, text_color=C_TEXT,
            font=ctk.CTkFont(size=13),
            command=self._delete_current_pangkalan,
        )
        self.btn_del_pangkalan.pack(side="left", padx=2)

        ctk.CTkLabel(sg, text="Username/HP:", font=ctk.CTkFont(size=12), text_color=C_MUTED).grid(row=6, column=0, sticky="w", pady=4)
        self.entry_username = ctk.CTkEntry(
            sg, width=200, height=32,
            fg_color=C_BG, border_color=C_BORDER, text_color=C_TEXT,
            font=ctk.CTkFont(size=12),
            placeholder_text="Nomor HP atau Email",
        )
        self.entry_username.grid(row=6, column=1, padx=(12, 0), pady=4, sticky="w")

        ctk.CTkLabel(sg, text="PIN:", font=ctk.CTkFont(size=12), text_color=C_MUTED).grid(row=7, column=0, sticky="w", pady=4)
        self.entry_password = ctk.CTkEntry(
            sg, width=200, height=32, show="*",
            fg_color=C_BG, border_color=C_BORDER, text_color=C_TEXT,
            font=ctk.CTkFont(size=12),
            placeholder_text="PIN (6 digit)",
        )
        self.entry_password.grid(row=7, column=1, padx=(12, 0), pady=4, sticky="w")

        ctk.CTkButton(
            sg, text="Simpan Profil Pangkalan", height=28, width=170,
            fg_color=C_BORDER, hover_color=C_BG, text_color=C_MUTED,
            font=ctk.CTkFont(size=11),
            command=self._save_credentials,
        ).grid(row=8, column=0, columnspan=2, pady=(4, 8), sticky="e")

        self._load_saved_credentials()
        btn_card = ctk.CTkFrame(left, fg_color="transparent")
        btn_card.pack(fill="x", pady=8)

        self.btn_start = ctk.CTkButton(
            btn_card,
            text="▶  MULAI BOT",
            height=46,
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            fg_color=C_ACCENT, hover_color=C_ACCENT2,
            command=self._start_bot,
        )
        self.btn_start.pack(side="left", expand=True, fill="x", padx=(0, 6))

        self.btn_pause = ctk.CTkButton(
            btn_card,
            text="⏸  LANJUTKAN",
            height=46,
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            fg_color=C_WARNING, hover_color="#D97706",
            command=self._resume_batch,
            state="disabled",
        )
        self.btn_pause.pack(side="left", expand=True, fill="x", padx=6)

        self.btn_stop = ctk.CTkButton(
            btn_card,
            text="⏹  STOP",
            height=46,
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            fg_color=C_DANGER, hover_color="#DC2626",
            command=self._stop_bot,
            state="disabled",
        )
        self.btn_stop.pack(side="left", expand=True, fill="x", padx=6)

        self.btn_reset = ctk.CTkButton(
            btn_card,
            text="🗑  RESET",
            height=46,
            font=ctk.CTkFont(family="Segoe UI", size=14, weight="bold"),
            fg_color=C_BORDER, hover_color=C_PANEL, text_color=C_MUTED,
            command=self._reset_session,
        )
        self.btn_reset.pack(side="left", expand=True, fill="x", padx=(6, 0))

        # Tombol Auto-Batch Multi-Pangkalan (Eksklusif Enterprise 5000)
        self.btn_batch = ctk.CTkButton(
            left,
            text="🏢  JALANKAN SEMUA PANGKALAN (AUTO-BATCH)",
            height=38,
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            fg_color="#8B5CF6", hover_color="#7C3AED",
            command=self._open_batch_runner_dialog,
        )
        self.btn_batch.pack(fill="x", pady=(0, 6))

        # ── STATUS BAR ────────────────────────────────────────
        self.lbl_status = ctk.CTkLabel(
            left,
            text="● Siap dijalankan",
            font=ctk.CTkFont(family="Segoe UI", size=12),
            text_color=C_SUCCESS,
        )
        self.lbl_status.pack(anchor="w", pady=(4, 0))

        # ── PROGRESS ─────────────────────────────────────────
        self.progress_bar = ctk.CTkProgressBar(left, height=6, fg_color=C_BORDER, progress_color=C_ACCENT)
        self.progress_bar.pack(fill="x", pady=(6, 0))
        self.progress_bar.set(0)

        self.lbl_progress = ctk.CTkLabel(
            left, text="0 / 0 data diproses",
            font=ctk.CTkFont(size=11), text_color=C_MUTED,
        )
        self.lbl_progress.pack(anchor="e", pady=(2, 0))

        self.lbl_eta = ctk.CTkLabel(
            left, text="",
            font=ctk.CTkFont(size=11), text_color=C_MUTED,
        )
        self.lbl_eta.pack(anchor="e", pady=(0, 8))

        # ── TABVIEW (LOG & TABLE) ──────────────────────────────
        self.tabview = ctk.CTkTabview(left, fg_color=C_PANEL, corner_radius=12, border_color=C_BORDER, border_width=1)
        self.tabview.pack(fill="both", expand=True, pady=6)
        
        tab_log = self.tabview.add("📋 Log Aktivitas")
        tab_nik = self.tabview.add("📊 Daftar NIK Pelanggan")
        
        # --- TAB LOG ---
        self.textbox_log = ctk.CTkTextbox(
            tab_log, height=220, corner_radius=8,
            fg_color=C_BG, border_color=C_BORDER, border_width=1,
            font=ctk.CTkFont(family="Consolas", size=11),
            text_color="#94A3B8",
            state="disabled",
        )
        self.textbox_log.pack(fill="both", expand=True, padx=10, pady=(6, 6))
        sys.stdout = TextRedirector(self.textbox_log)
        sys.stderr = sys.stdout

        log_btns = ctk.CTkFrame(tab_log, fg_color="transparent")
        log_btns.pack(fill="x", padx=10, pady=(0, 8))
        ctk.CTkButton(
            log_btns, text="💾 Simpan Log", width=110, height=28,
            fg_color=C_BORDER, hover_color=C_BG, text_color=C_MUTED,
            font=ctk.CTkFont(size=11), command=self._export_log,
        ).pack(side="left", padx=(0, 6))
        ctk.CTkButton(
            log_btns, text="📂 Buka Folder Hasil", width=140, height=28,
            fg_color=C_BORDER, hover_color=C_BG, text_color=C_MUTED,
            font=ctk.CTkFont(size=11), command=self._open_results_folder,
        ).pack(side="left")

        # --- TAB NIK TABLE ---
        table_header = ctk.CTkFrame(tab_nik, fg_color=C_BG, height=28, corner_radius=4)
        table_header.pack(fill="x", padx=10, pady=(6, 2))
        table_header.pack_propagate(False)

        ctk.CTkLabel(table_header, text="No", width=40, font=ctk.CTkFont(size=11, weight="bold"), text_color=C_MUTED, anchor="w").pack(side="left", padx=(8, 4))
        ctk.CTkLabel(table_header, text="NIK Pelanggan", width=130, font=ctk.CTkFont(size=11, weight="bold"), text_color=C_MUTED, anchor="w").pack(side="left", padx=4)
        ctk.CTkLabel(table_header, text="Status", width=120, font=ctk.CTkFont(size=11, weight="bold"), text_color=C_MUTED, anchor="w").pack(side="left", padx=4)
        ctk.CTkLabel(table_header, text="Keterangan Detail", font=ctk.CTkFont(size=11, weight="bold"), text_color=C_MUTED, anchor="w").pack(side="left", fill="x", expand=True, padx=(4, 8))

        self.scroll_frame = ctk.CTkScrollableFrame(
            tab_nik, fg_color=C_BG, corner_radius=8,
            border_color=C_BORDER, border_width=1
        )
        self.scroll_frame.pack(fill="both", expand=True, padx=10, pady=(0, 8))

        self.nik_row_widgets = {}
        self.after(200, self._load_nik_data)

        # ── STATS PANEL (kanan) ───────────────────────────────
        stats_title = ctk.CTkLabel(
            right, text="📊 Statistik",
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color=C_TEXT,
        )
        stats_title.pack(pady=(0, 12))

        self.stat_sukses  = self._make_stat(right, "✅ Sukses",    "0", C_SUCCESS)
        self.stat_gagal   = self._make_stat(right, "❌ Gagal",      "0", C_DANGER)
        self.stat_invalid = self._make_stat(right, "⚠ NIK Invalid", "0", C_WARNING)
        self.stat_sisa    = self._make_stat(right, "⏳ Sisa",       "0", C_MUTED)

        # License info di bawah stats
        lic_sep = ctk.CTkFrame(right, fg_color=C_BORDER, height=1)
        lic_sep.pack(fill="x", pady=16)

        ctk.CTkLabel(right, text="🔑 Lisensi", font=ctk.CTkFont(size=12, weight="bold"), text_color=C_TEXT).pack(pady=(0, 4))

        self.lbl_lic_kuota  = ctk.CTkLabel(right, text="", font=ctk.CTkFont(size=11, weight="bold"), text_color=C_ACCENT2)
        self.lbl_lic_kuota.pack(pady=2)

        self.lbl_lic_hwid = ctk.CTkLabel(
            right, text=f"HWID: {self.hwid[:14]}...",
            font=ctk.CTkFont(family="Consolas", size=9),
            text_color=C_MUTED,
            cursor="hand2"
        )
        self.lbl_lic_hwid.pack(pady=1)
        self.lbl_lic_hwid.bind("<Button-1>", lambda e: self._copy_hwid_with_log())

        self.lbl_lic_hwid_tip = ctk.CTkLabel(right, text="(Klik untuk salin HWID)", font=ctk.CTkFont(size=8), text_color=C_MUTED)
        self.lbl_lic_hwid_tip.pack(pady=(0, 6))

        self.progress_lic = ctk.CTkProgressBar(right, height=4, fg_color=C_BORDER, progress_color=C_ACCENT2)
        self.progress_lic.pack(fill="x", pady=(4, 0))
        self.progress_lic.set(0)

        # Tombol Salin Lisensi & Perbarui Lisensi
        self.btn_copy_lic = ctk.CTkButton(
            right,
            text="📋 Salin Lisensi",
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color=C_BORDER,
            text_color=C_TEXT,
            hover_color=C_ACCENT,
            height=28,
            corner_radius=6,
            command=self._copy_license_with_log
        )
        self.btn_copy_lic.pack(fill="x", pady=(10, 0))

        self.btn_change_lic = ctk.CTkButton(
            right,
            text="🔑 Perbarui Lisensi",
            font=ctk.CTkFont(size=11, weight="bold"),
            fg_color=C_BORDER,
            text_color=C_TEXT,
            hover_color=C_ACCENT2,
            height=28,
            corner_radius=6,
            command=lambda: self.master._show_license()
        )
        self.btn_change_lic.pack(fill="x", pady=(6, 0))

    # ──────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────

    def _make_card(self, parent, title: str) -> ctk.CTkFrame:
        card = ctk.CTkFrame(parent, fg_color=C_PANEL, corner_radius=12, border_color=C_BORDER, border_width=1)
        card.pack(fill="x", pady=6)
        ctk.CTkLabel(
            card, text=title,
            font=ctk.CTkFont(family="Segoe UI", size=13, weight="bold"),
            text_color=C_TEXT,
        ).pack(anchor="w", padx=16, pady=(14, 8))
        return card

    def _make_stat(self, parent, label: str, value: str, color: str):
        frame = ctk.CTkFrame(parent, fg_color=C_PANEL, corner_radius=8, border_color=C_BORDER, border_width=1)
        frame.pack(fill="x", pady=3)
        ctk.CTkLabel(frame, text=label, font=ctk.CTkFont(size=10), text_color=C_MUTED).pack(anchor="w", padx=10, pady=(6, 0))
        lbl = ctk.CTkLabel(frame, text=value, font=ctk.CTkFont(family="Segoe UI", size=22, weight="bold"), text_color=color)
        lbl.pack(anchor="w", padx=10, pady=(0, 6))
        return lbl

    def _copy_hwid_with_log(self):
        try:
            self.clipboard_clear()
            self.clipboard_append(self.hwid)
            print(f"\n[INFO] HWID ({self.hwid}) berhasil disalin ke clipboard!")
        except Exception as e:
            print(f"\n[ERROR] Gagal menyalin HWID: {e}")

    def _copy_license_with_log(self):
        try:
            info = get_license_info(self.hwid)
            lic_key = info.get("license_key", "")
            if lic_key:
                self.clipboard_clear()
                self.clipboard_append(lic_key)
                print(f"\n[INFO] License Key berhasil disalin ke clipboard!")
            else:
                print(f"\n[WARN] Tidak ada License Key tersimpan.")
        except Exception as e:
            print(f"\n[ERROR] Gagal menyalin License Key: {e}")

    def _refresh_license_info(self):
        info = get_license_info(self.hwid)
        if info.get("valid"):
            self.lbl_paket.configure(text="✦ LISENSI AKTIF")
            self.lbl_lic_kuota.configure(
                text=f"Sisa Kuota: {info['kuota_sisa']:,} Tabung"
            )
            self.progress_lic.set(info["persen_terpakai"] / 100)

    def _load_nik_data(self):
        """Membaca NIK dari file dan mempopulasikan tabel GUI dengan lookup hasil_proses."""
        if not hasattr(self, 'scroll_frame') or not self.scroll_frame.winfo_exists():
            return

        def normalize_nik(val) -> str:
            s = str(val).strip()
            if s.endswith(".0"):
                s = s[:-2]
            if "e" in s.lower() or "E" in s.lower():
                try:
                    s = str(int(float(s)))
                except Exception:
                    pass
            return "".join(c for c in s if c.isdigit())

        try:
            df = load_excel_data(self.selected_file)
            if len(df) == 0 or "NIK" not in df.columns:
                return

            # Cek jika ada hasil_proses.xlsx untuk lookup status & keterangan
            status_map = {}
            from map_bot_visual import RESULT_FILE
            if os.path.exists(RESULT_FILE):
                try:
                    df_res = pd.read_excel(RESULT_FILE)
                    if len(df_res.columns) > 0:
                        first_col_res = str(df_res.columns[0]).strip()
                        if first_col_res.isdigit() and len(first_col_res) >= 15:
                            df_res.rename(columns={df_res.columns[0]: "NIK"}, inplace=True)
                        elif "NIK" not in df_res.columns:
                            df_res.rename(columns={df_res.columns[0]: "NIK"}, inplace=True)
                    
                    for _, r in df_res.iterrows():
                        n = normalize_nik(r.get("NIK", ""))
                        if n:
                            status_map[n] = (
                                str(r.get("Status", "BELUM")).strip(),
                                str(r.get("Keterangan", "")).replace("nan", "").strip()
                            )
                except Exception as e:
                    print(f"[UI] Gagal memuat hasil_proses.xlsx: {e}")

            # Map status & keterangan dari lookup hasil_proses
            statuses = []
            keterangans = []
            for _, row in df.iterrows():
                n = normalize_nik(row.get("NIK", ""))
                if n in status_map:
                    statuses.append(status_map[n][0])
                    keterangans.append(status_map[n][1])
                else:
                    statuses.append(str(row.get("Status", "BELUM")).strip())
                    keterangans.append(str(row.get("Keterangan", "")).replace("nan", "").strip())
            
            df["Status"] = statuses
            df["Keterangan"] = keterangans

            # Check if row count matches exactly to update dynamically (flicker-free)
            if hasattr(self, 'nik_row_widgets') and len(self.nik_row_widgets) == len(df):
                for i, row in df.iterrows():
                    status = str(row.get("Status", "BELUM")).strip()
                    ket = str(row.get("Keterangan", "")).replace("nan", "")
                    
                    if i in self.nik_row_widgets:
                        lbl_status = self.nik_row_widgets[i]["status"]
                        lbl_ket = self.nik_row_widgets[i]["keterangan"]
                        
                        lbl_status.configure(text=status)
                        # Style status
                        if status == "SUKSES":
                            lbl_status.configure(text_color=C_SUCCESS)
                        elif status in ["NIK TIDAK TERDAFTAR", "DILEWATI"]:
                            lbl_status.configure(text_color=C_WARNING)
                        elif status in ["GAGAL CAPTCHA", "ERROR SYSTEM"]:
                            lbl_status.configure(text_color=C_DANGER)
                        else:
                            lbl_status.configure(text_color=C_MUTED)
                            
                        lbl_ket.configure(text=ket)
                return

            # Jika tidak cocok, bersihkan tabel lama dan rebuild
            for child in self.scroll_frame.winfo_children():
                try:
                    child.destroy()
                except Exception:
                    pass
            self.nik_row_widgets = {}

            for i, row in df.iterrows():
                nik = str(row["NIK"]).strip()
                status = str(row.get("Status", "BELUM")).strip()
                ket = str(row.get("Keterangan", "")).replace("nan", "")

                # Buat row container
                row_frame = ctk.CTkFrame(self.scroll_frame, fg_color="transparent", height=28)
                row_frame.pack(fill="x", pady=1)
                row_frame.pack_propagate(False)

                # Column widths: No (40), NIK (130), Status (120), Keterangan (250)
                lbl_no = ctk.CTkLabel(row_frame, text=str(i+1), width=40, font=ctk.CTkFont(size=11), text_color=C_MUTED, anchor="w")
                lbl_no.pack(side="left", padx=(8, 4))

                lbl_nik = ctk.CTkLabel(row_frame, text=nik, width=130, font=ctk.CTkFont(family="Consolas", size=11), text_color=C_TEXT, anchor="w")
                lbl_nik.pack(side="left", padx=4)

                lbl_status = ctk.CTkLabel(row_frame, text=status, width=120, font=ctk.CTkFont(size=11, weight="bold"), anchor="w")
                lbl_status.pack(side="left", padx=4)

                # Style status
                if status == "SUKSES":
                    lbl_status.configure(text_color=C_SUCCESS)
                elif status in ["NIK TIDAK TERDAFTAR", "DILEWATI"]:
                    lbl_status.configure(text_color=C_WARNING)
                elif status in ["GAGAL CAPTCHA", "ERROR SYSTEM"]:
                    lbl_status.configure(text_color=C_DANGER)
                else:
                    lbl_status.configure(text_color=C_MUTED)

                lbl_ket = ctk.CTkLabel(row_frame, text=ket, font=ctk.CTkFont(size=11), text_color=C_MUTED, anchor="w")
                lbl_ket.pack(side="left", fill="x", expand=True, padx=(4, 8))

                self.nik_row_widgets[i] = {
                    "status": lbl_status,
                    "keterangan": lbl_ket,
                    "frame": row_frame
                }

        except Exception as e:
            print(f"[UI] Gagal memuat data NIK ke tabel: {e}")

    def _update_stats(self):
        """Update stats panel dari hasil_proses.xlsx jika ada."""
        try:
            import pandas as pd
            from map_bot_visual import STATUS_SUKSES, STATUS_NIK_INVALID, STATUS_GAGAL_CAPTCHA, STATUS_ERROR, STATUS_BELUM, STATUS_SKIP
            if os.path.exists("hasil_proses.xlsx"):
                df = pd.read_excel("hasil_proses.xlsx")
                sukses  = len(df[df["Status"] == STATUS_SUKSES])
                invalid = len(df[df["Status"].isin([STATUS_NIK_INVALID, STATUS_SKIP])])
                gagal   = len(df[df["Status"].isin([STATUS_GAGAL_CAPTCHA, STATUS_ERROR])])
                sisa    = len(df[df["Status"] == STATUS_BELUM])
                self.stat_sukses.configure(text=str(sukses))
                self.stat_gagal.configure(text=str(gagal))
                self.stat_invalid.configure(text=str(invalid))
                self.stat_sisa.configure(text=str(sisa))
                
                # Refresh tabel status NIK live di aplikasi
                self._load_nik_data()
        except Exception:
            pass

    # ──────────────────────────────────────────────────────────
    # Dependency Check
    # ──────────────────────────────────────────────────────────

    def _ensure_vc_redist(self):
        """Pastikan Visual C++ Redistributables terinstall."""
        try:
            import ctypes
            # Coba load vcruntime140.dll — indikasi VC++ sudah ada
            try:
                ctypes.CDLL("vcruntime140.dll")
                return True
            except OSError:
                pass
            
            print("[VC++] Tidak terdeteksi. Coba unduh & install dari Microsoft...")
            self.lbl_status.configure(text="⚙ Menginstall Visual C++ Redistributables...", text_color=C_ACCENT)
            self.update()
            
            import urllib.request
            import tempfile
            
            url = "https://aka.ms/vs/17/release/vc_redist.x64.exe"
            with tempfile.NamedTemporaryFile(delete=False, suffix=".exe") as tmp:
                tmp_path = tmp.name
            
            print(f"[VC++] Mengunduh dari {url}...")
            urllib.request.urlretrieve(url, tmp_path)
            
            print(f"[VC++] Menginstall {tmp_path} (silent mode)...")
            startupinfo = None
            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            
            subprocess.run(
                [tmp_path, "/install", "/quiet", "/norestart"],
                check=True,
                startupinfo=startupinfo,
                creationflags=0x08000000 if os.name == 'nt' else 0
            )
            os.unlink(tmp_path)
            print("[VC++] Instalasi berhasil!")
            return True
            
        except Exception as e:
            print(f"[VC++ WARN] Gagal install: {e} (lanjutkan anyway)")
            return True  # Tetap lanjut meski error

    # ──────────────────────────────────────────────────────────
    # File
    # ──────────────────────────────────────────────────────────

    def _browse_file(self):
        filename = filedialog.askopenfilename(
            title="Pilih Data Pelanggan",
            filetypes=(("Excel files", "*.xlsx"), ("All files", "*.*")),
        )
        if filename:
            self.selected_file = filename
            short_name = os.path.basename(filename)
            self.lbl_file.configure(text=short_name)
            print(f"[INFO] File dipilih: {short_name}")
            self._load_nik_data()

    # ──────────────────────────────────────────────────────────
    # Bot Control
    # ──────────────────────────────────────────────────────────

    def _get_batch_limit(self) -> int:
        val = self.combo_batch.get()
        mapping = {"50 Data": 50, "100 Data": 100, "200 Data": 200}
        return mapping.get(val, 0)

    def _get_jumlah_tabung(self) -> int:
        try:
            return int(self.combo_tabung.get())
        except (ValueError, AttributeError):
            return 1

    def _get_captcha_mode(self) -> str:
        """Get captcha mode: 'auto' or 'manual'"""
        val = self.combo_captcha.get()
        from map_bot_visual import CAPTCHA_AUTO, CAPTCHA_MANUAL
        return CAPTCHA_MANUAL if "Manual" in val else CAPTCHA_AUTO

    def _reset_session(self):
        """Hapus file hasil agar bisa mulai dari awal."""
        import tkinter.messagebox as mb
        if not mb.askyesno("Reset Sesi", "Yakin reset? Semua file hasil (sukses/gagal) akan dihapus."):
            return
        for f in [RESULT_FILE, SUKSES_FILE, GAGAL_FILE]:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except Exception:
                pass
        self.stat_sukses.configure(text="0")
        self.stat_gagal.configure(text="0")
        self.stat_invalid.configure(text="0")
        self.stat_sisa.configure(text="0")
        self.progress_bar.set(0)
        self.lbl_progress.configure(text="0 / 0 data diproses")
        self.lbl_status.configure(text="● Data direset. Siap dijalankan ulang.", text_color=C_SUCCESS)
        print("[INFO] File hasil dihapus. Sesi direset.")
        self._load_nik_data()

    def _refresh_pangkalan_dropdown(self):
        """Memuat daftar pangkalan ke ComboBox."""
        from credentials import get_pangkalan_profiles, get_active_pangkalan
        profiles = get_pangkalan_profiles()
        if not profiles:
            self.combo_pangkalan.configure(values=["Pangkalan Utama"])
            self.combo_pangkalan.set("Pangkalan Utama")
            return

        names = [p.get("name", "Pangkalan") for p in profiles]
        self.combo_pangkalan.configure(values=names)
        active = get_active_pangkalan()
        if active and active.get("name") in names:
            self.combo_pangkalan.set(active["name"])
        else:
            self.combo_pangkalan.set(names[0])

    def _on_pangkalan_selected(self, choice: str):
        """Saat user memilih nama pangkalan di dropdown."""
        from credentials import get_pangkalan_profiles, set_active_pangkalan
        profiles = get_pangkalan_profiles()
        match = next((p for p in profiles if p.get("name") == choice), None)
        if match:
            set_active_pangkalan(match["id"])
            self.entry_username.delete(0, "end")
            self.entry_username.insert(0, match.get("username", ""))
            self.entry_password.delete(0, "end")
            self.entry_password.insert(0, match.get("password", ""))
            self.lbl_status.configure(text=f"● Beralih ke pangkalan: {choice}", text_color=C_SUCCESS)
            print(f"[PANGKALAN] Aktif: {choice}")

    def _add_new_pangkalan(self):
        """Tambah profil pangkalan baru (Bisa untuk semua paket)."""
        from credentials import add_or_update_pangkalan

        # Simple Dialog Input Nama Pangkalan Baru
        import tkinter.simpledialog as sd
        name = sd.askstring("Pangkalan Baru", "Masukkan Nama Pangkalan Baru:\n(Contoh: Pangkalan Gas Berkah 2)")
        if not name or not name.strip():
            return

        new_p = add_or_update_pangkalan(name.strip(), "", "")
        self._refresh_pangkalan_dropdown()
        self.combo_pangkalan.set(name.strip())
        self.entry_username.delete(0, "end")
        self.entry_password.delete(0, "end")
        self.lbl_status.configure(text=f"✓ Pangkalan '{name.strip()}' dibuat. Silakan isi Username & PIN.", text_color=C_SUCCESS)
        print(f"[PANGKALAN] Berhasil menambahkan pangkalan: {name.strip()}")

    def _delete_current_pangkalan(self):
        """Hapus profil pangkalan aktif."""
        from credentials import get_pangkalan_profiles, get_active_pangkalan, delete_pangkalan
        import tkinter.messagebox as mb

        profiles = get_pangkalan_profiles()
        if len(profiles) <= 1:
            mb.showwarning("Perhatian", "Tidak dapat menghapus satu-satunya profil pangkalan tersimpan.")
            return

        active = get_active_pangkalan()
        if not active:
            return

        if not mb.askyesno("Hapus Pangkalan", f"Apakah Anda yakin ingin menghapus profil '{active.get('name')}'?"):
            return

        delete_pangkalan(active["id"])
        self._refresh_pangkalan_dropdown()
        self._load_saved_credentials()
        self.lbl_status.configure(text="✓ Profil pangkalan dihapus", text_color=C_MUTED)

    def _save_credentials(self):
        """Simpan profil username & password pangkalan aktif."""
        from credentials import get_active_pangkalan, add_or_update_pangkalan, save_credentials
        username = self.entry_username.get().strip()
        password = self.entry_password.get().strip()
        active = get_active_pangkalan()
        p_name = active.get("name") if active else self.combo_pangkalan.get().strip()

        if username and password:
            if active:
                add_or_update_pangkalan(p_name, username, password, profile_id=active.get("id"))
            else:
                add_or_update_pangkalan(p_name, username, password)
            save_credentials(username, password)
            self.lbl_status.configure(text=f"✓ Profil '{p_name}' tersimpan", text_color=C_SUCCESS)
            print(f"[INFO] Profil pangkalan '{p_name}' tersimpan")
        else:
            self.lbl_status.configure(text="⚠ Isi username dan PIN", text_color=C_WARNING)

    def _load_saved_credentials(self):
        """Load credentials pangkalan aktif ke UI."""
        self._refresh_pangkalan_dropdown()
        from credentials import get_active_pangkalan, load_credentials
        active = get_active_pangkalan()
        if active:
            self.entry_username.delete(0, "end")
            self.entry_username.insert(0, active.get("username", ""))
            self.entry_password.delete(0, "end")
            self.entry_password.insert(0, active.get("password", ""))
        else:
            u, p = load_credentials()
            if u:
                self.entry_username.delete(0, "end")
                self.entry_username.insert(0, u)
            if p:
                self.entry_password.delete(0, "end")
                self.entry_password.insert(0, p)

    def _start_bot(self):
        # AUTO-SAVE credentials sebelum bot mulai
        try:
            from credentials import save_credentials, load_credentials
            username = self.entry_username.get().strip()
            password = self.entry_password.get().strip()
            if username and password:
                save_credentials(username, password)
                print(f"[CRED] Credentials auto-save: {username[:4]}***")
            elif not load_credentials()[0]:
                # Tidak ada credentials, wajib isi
                self.lbl_status.configure(text="⚠ Isi Username/HP dan PIN dulu!", text_color=C_WARNING)
                return
        except Exception as e:
            print(f"[CRED] Error auto-save: {e}")

        # Health check sebelum mulai
        ok, err_msg = health_check(self.selected_file, self.hwid)
        if not ok:
            self.lbl_status.configure(text=f"❌ {err_msg}", text_color=C_DANGER)
            print(f"[HEALTH CHECK] GAGAL: {err_msg}")
            return

        # Cek kecukupan kuota awal berbasis jumlah tabung sebelum browser dibuka
        from license_manager import verify_license
        valid, msg, _ = verify_license(self.hwid, self._get_jumlah_tabung())
        if not valid:
            self.lbl_status.configure(text=f"❌ Lisensi: {msg}", text_color=C_DANGER)
            print(f"[LISENSI] GAGAL: {msg}")
            return
        
        # Pastikan VC++ Redistributables tersedia
        print("[DEPS] Memeriksa Visual C++ Redistributables...")
        self._ensure_vc_redist()

        self.bot_failed = False
        self.bot_error_msg = ""
        self.btn_start.configure(state="disabled", text="⚙  BOT SEDANG BERJALAN...")
        self.btn_stop.configure(state="normal")
        self.btn_pause.configure(state="disabled")
        self.lbl_status.configure(text="● Bot berjalan...", text_color=C_ACCENT)
        self.progress_bar.set(0)
        self._is_paused = False
        self._bot_start_time = time.time()
        self._nik_times = []

        self.stop_event  = threading.Event()
        self.pause_event = threading.Event()
        self.bot_thread  = threading.Thread(target=self._run_bot_worker, daemon=True)
        self.bot_thread.start()

    def _run_bot_worker(self):
        try:
            print("[BROWSER] Memeriksa engine browser Chromium...")
            self.after(0, lambda: self.lbl_status.configure(text="⚙ Menyiapkan browser Chromium...", text_color=C_ACCENT))
            
            from playwright._impl._driver import compute_driver_executable, get_driver_env
            driver_executable, driver_cli = compute_driver_executable()
            env = get_driver_env()
            
            startupinfo = None
            if os.name == 'nt':
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                
            print("[BROWSER] Memulai proses instalasi browser Chromium...")
            process = subprocess.Popen(
                [str(driver_executable), str(driver_cli), "install", "chromium"],
                env=env,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                startupinfo=startupinfo,
                creationflags=0x08000000 if os.name == 'nt' else 0,
                text=True,
                encoding="utf-8",
                errors="ignore"
            )
            
            # Stream stdout live ke console / log textbox
            if process.stdout:
                for line in process.stdout:
                    print(line, end="")
            process.wait()
            
            if process.returncode != 0:
                raise subprocess.CalledProcessError(process.returncode, process.args)

            print("[BROWSER] Chromium siap digunakan!")
            run_bot(
                data_file     = self.selected_file,
                stop_event    = self.stop_event,
                pause_event   = self.pause_event,
                batch_limit   = self._get_batch_limit(),
                jumlah_tabung = self._get_jumlah_tabung(),
                on_progress   = self._on_progress,
                hwid          = self.hwid,
                captcha_mode  = self._get_captcha_mode(),
            )

        except Exception as e:
            self.bot_failed = True
            self.bot_error_msg = str(e)
            print(f"\n[ERROR] Fatal: {e}")
        finally:
            self.after(0, self._on_bot_finished)

    def _open_batch_runner_dialog(self):
        """Buka dialog eksekusi antrean batch semua pangkalan (Eksklusif Enterprise 5000)."""
        from license_manager import can_use_multi_pangkalan, verify_license
        from credentials import get_pangkalan_profiles
        import tkinter.messagebox as mb
        from tkinter import filedialog

        # Validasi Hak Akses Enterprise 5000
        if not can_use_multi_pangkalan(self.hwid):
            valid, _, payload = verify_license(self.hwid)
            cur_paket = payload.get("paket", "STARTER") if valid and payload else "STARTER"
            mb.showinfo(
                "Fitur Enterprise",
                f"🏢 Fitur Jalankan Semua Pangkalan Otomatis (Auto-Batch Queue) eksklusif untuk Paket Enterprise 5.000 Tabung.\n\n"
                f"Paket aktif Anda: {cur_paket}.\n\n"
                f"Paket Starter & Pro dapat berganti profil pangkalan secara manual melalui dropdown pangkalan.\n"
                f"Untuk memproses seluruh antrean pangkalan secara otomatis sekaligus tanpa ditunggu, silakan hubungi Admin untuk upgrade ke Paket Enterprise."
            )
            return

        profiles = get_pangkalan_profiles()
        if not profiles:
            mb.showwarning("Perhatian", "Belum ada profil pangkalan tersimpan. Tambahkan profil pangkalan terlebih dahulu.")
            return

        # Buat Custom TopLevel Window untuk Batch Runner
        dlg = ctk.CTkToplevel(self)
        dlg.title("🏢 Antrean Batch Semua Pangkalan")
        dlg.geometry("640x520")
        dlg.configure(fg_color=C_BG)
        dlg.grab_set()

        ctk.CTkLabel(
            dlg, text="🏢 Eksekusi Antrean Semua Pangkalan (Auto-Batch)",
            font=ctk.CTkFont(family="Segoe UI", size=16, weight="bold"),
            text_color=C_GOLD
        ).pack(pady=(16, 4))

        ctk.CTkLabel(
            dlg, text="Pilih file Excel untuk setiap pangkalan. Bot akan memproses setiap pangkalan secara otomatis berurutan sampai selesai semua tanpa henti.",
            font=ctk.CTkFont(size=11), text_color=C_MUTED, wraplength=580
        ).pack(pady=(0, 12))

        scroll_frame = ctk.CTkScrollableFrame(dlg, fg_color=C_PANEL, height=300)
        scroll_frame.pack(fill="both", expand=True, padx=16, pady=6)

        queue_vars = []

        for p in profiles:
            p_card = ctk.CTkFrame(scroll_frame, fg_color=C_BG, corner_radius=8)
            p_card.pack(fill="x", pady=6, padx=4)

            top_row = ctk.CTkFrame(p_card, fg_color="transparent")
            top_row.pack(fill="x", padx=8, pady=4)

            chk_var = ctk.BooleanVar(value=True)
            chk = ctk.CTkCheckBox(
                top_row, text=f"🏢 {p.get('name', 'Pangkalan')} ({p.get('username', '-')})",
                variable=chk_var, font=ctk.CTkFont(size=13, weight="bold"),
                text_color=C_TEXT, fg_color=C_ACCENT
            )
            chk.pack(side="left")

            bot_row = ctk.CTkFrame(p_card, fg_color="transparent")
            bot_row.pack(fill="x", padx=8, pady=(0, 6))

            file_var = ctk.StringVar(value="")
            lbl_file = ctk.CTkLabel(bot_row, text="File: (Belum dipilih)", font=ctk.CTkFont(size=11), text_color=C_MUTED)
            lbl_file.pack(side="left", padx=(28, 8))

            def _make_picker(f_var, l_file):
                def _picker():
                    path = filedialog.askopenfilename(
                        title="Pilih File Excel Pangkalan",
                        filetypes=[("Excel Files", "*.xlsx *.xls"), ("All Files", "*.*")]
                    )
                    if path:
                        f_var.set(path)
                        l_file.configure(text=f"📁 {os.path.basename(path)}", text_color=C_SUCCESS)
                return _picker

            ctk.CTkButton(
                bot_row, text="Pilih File Excel...", width=120, height=26,
                font=ctk.CTkFont(size=11), fg_color=C_BORDER, hover_color=C_ACCENT,
                command=_make_picker(file_var, lbl_file)
            ).pack(side="right")

            queue_vars.append({
                "profile": p,
                "chk_var": chk_var,
                "file_var": file_var,
                "lbl_file": lbl_file,
            })

        def _start_queue():
            active_queue = []
            for item in queue_vars:
                if item["chk_var"].get():
                    f_path = item["file_var"].get().strip()
                    if not f_path or not os.path.exists(f_path):
                        mb.showwarning("File Belum Dipilih", f"Silakan pilih file Excel untuk pangkalan: {item['profile'].get('name')}")
                        return
                    active_queue.append((item["profile"], f_path))

            if not active_queue:
                mb.showwarning("Perhatian", "Centang minimal 1 pangkalan untuk dijalankan.")
                return

            dlg.destroy()
            self._start_batch_queue(active_queue)

        btn_run = ctk.CTkButton(
            dlg, text="▶️ MULAI PROSES SELURUH ANTREAN", height=44,
            font=ctk.CTkFont(size=14, weight="bold"),
            fg_color="#8B5CF6", hover_color="#7C3AED",
            command=_start_queue
        )
        btn_run.pack(fill="x", padx=16, pady=12)

    def _start_batch_queue(self, queue_items):
        """Memulai antrean batch multi-pangkalan."""
        self.bot_failed = False
        self.bot_error_msg = ""
        self.btn_start.configure(state="disabled", text="⚙  BATCH BERJALAN...")
        self.btn_batch.configure(state="disabled")
        self.btn_stop.configure(state="normal")
        self.btn_pause.configure(state="disabled")
        self.lbl_status.configure(text="● Memulai Antrean Batch Multi-Pangkalan...", text_color=C_ACCENT)
        self.progress_bar.set(0)
        self._is_paused = False
        self._bot_start_time = time.time()
        self._nik_times = []

        self.stop_event = threading.Event()
        self.pause_event = threading.Event()
        self.bot_thread = threading.Thread(target=self._run_batch_queue_worker, args=(queue_items,), daemon=True)
        self.bot_thread.start()

    def _run_batch_queue_worker(self, queue_items):
        """Worker thread untuk memproses tiap pangkalan dalam antrean secara otomatis berurutan."""
        try:
            total_pangkalans = len(queue_items)
            for idx, (p_profile, excel_path) in enumerate(queue_items, 1):
                if self.stop_event.is_set():
                    print("[BATCH QUEUE] Dihentikan oleh pengguna.")
                    break

                p_name = p_profile.get("name", f"Pangkalan {idx}")
                print(f"\n=======================================================")
                print(f"[BATCH QUEUE {idx}/{total_pangkalans}] MEMPROSES: {p_name}")
                print(f"[BATCH QUEUE] File: {excel_path}")
                print(f"=======================================================\n")

                # Set aktif kredensial & pangkalan
                self.after(0, lambda n=p_name: self._on_pangkalan_selected(n))
                self.selected_file = excel_path

                status_msg = f"🏢 [ANTREAN {idx}/{total_pangkalans}] Memproses: {p_name}..."
                self.after(0, lambda m=status_msg: self.lbl_status.configure(text=m, text_color=C_GOLD))

                # Jalankan bot untuk pangkalan ini
                run_bot(
                    data_file     = excel_path,
                    stop_event    = self.stop_event,
                    pause_event   = self.pause_event,
                    batch_limit   = self._get_batch_limit(),
                    jumlah_tabung = self._get_jumlah_tabung(),
                    on_progress   = self._on_progress,
                    hwid          = self.hwid,
                    captcha_mode  = self._get_captcha_mode(),
                )

                if self.stop_event.is_set():
                    break

                if idx < total_pangkalans:
                    print(f"[BATCH QUEUE] Pangkalan '{p_name}' selesai. Jeda 3 detik sebelum pangkalan berikutnya...")
                    time.sleep(3)

            if not self.stop_event.is_set():
                print(f"\n🎉 [BATCH QUEUE SELESAI] Seluruh {total_pangkalans} pangkalan berhasil diproses otomatis!\n")
                self.after(0, lambda: self.lbl_status.configure(text=f"✓ Selesai! Seluruh {total_pangkalans} Pangkalan berhasil diproses!", text_color=C_SUCCESS))

        except Exception as e:
            self.bot_failed = True
            self.bot_error_msg = str(e)
            print(f"\n[ERROR BATCH QUEUE] Fatal: {e}")
        finally:
            self.after(0, self._on_bot_finished)
            self.after(0, lambda: self.btn_batch.configure(state="normal"))

    def _on_progress(self, current: int, total: int, status_text: str):
        """Callback dari bot → update UI (thread-safe via after)."""
        def _update():
            self.lbl_status.configure(text=status_text, text_color=C_TEXT)
            if total > 0:
                self.progress_bar.set(current / total)
            self.lbl_progress.configure(text=f"{current} / {total} data diproses")
            self._update_stats()
            self._refresh_license_info()

            # ETA calculation
            if self._bot_start_time and current > 0 and total > 0:
                elapsed = time.time() - self._bot_start_time
                avg_per_nik = elapsed / current
                remaining = total - current
                eta_sec = avg_per_nik * remaining
                if eta_sec > 3600:
                    eta_str = f"{int(eta_sec//3600)}j {int((eta_sec%3600)//60)}m"
                elif eta_sec > 60:
                    eta_str = f"{int(eta_sec//60)}m {int(eta_sec%60)}d"
                else:
                    eta_str = f"{int(eta_sec)}d"
                self.lbl_eta.configure(text=f"⏱ Estimasi sisa: ~{eta_str}")
            elif current >= total and total > 0:
                self.lbl_eta.configure(text="")

            # Tampilkan tombol Lanjutkan jika pause
            if self.pause_event and self.pause_event.is_set():
                self.btn_pause.configure(state="normal", text=f"▶  LANJUTKAN")
                self.lbl_status.configure(text=status_text, text_color=C_WARNING)

        self.after(0, _update)

    def _resume_batch(self):
        """Lanjutkan setelah pause batch."""
        if self.pause_event:
            self.pause_event.clear()
        self.btn_pause.configure(state="disabled", text="⏸  LANJUTKAN")
        self.lbl_status.configure(text="● Bot dilanjutkan...", text_color=C_ACCENT)

    def _stop_bot(self):
        if self.stop_event:
            self.stop_event.set()
        if self.pause_event:
            self.pause_event.clear()  # clear pause agar bot tidak stuck di pause loop
        self.btn_stop.configure(state="disabled")
        self.btn_pause.configure(state="disabled")
        self.lbl_status.configure(text="⏹ Menghentikan bot...", text_color=C_WARNING)

    def _on_bot_finished(self):
        self.btn_start.configure(state="normal", text="▶  MULAI BOT")
        self.btn_stop.configure(state="disabled")
        self.btn_pause.configure(state="disabled")
        if getattr(self, "bot_failed", False):
            self.lbl_status.configure(text=f"❌ Gagal: {self.bot_error_msg}", text_color=C_DANGER)
        else:
            self.lbl_status.configure(text="✅ Selesai", text_color=C_SUCCESS)
        self.lbl_eta.configure(text="")
        self._update_stats()
        self._refresh_license_info()
        print("\n[INFO] Bot selesai.")
        # Notifikasi suara
        try:
            winsound.MessageBeep(winsound.MB_ICONASTERISK)
        except Exception:
            pass

    def _toggle_theme(self):
        current = ctk.get_appearance_mode()
        if current == "Dark":
            ctk.set_appearance_mode("light")
            self.btn_theme.configure(text="🌙")
        else:
            ctk.set_appearance_mode("dark")
            self.btn_theme.configure(text="☀️")

    def _export_log(self):
        """Simpan isi log ke file .txt"""
        try:
            self.textbox_log.configure(state="normal")
            content = self.textbox_log.get("1.0", "end")
            self.textbox_log.configure(state="disabled")
            filename = filedialog.asksaveasfilename(
                title="Simpan Log",
                defaultextension=".txt",
                filetypes=(("Text files", "*.txt"), ("All files", "*.*")),
                initialfile=f"log_bot_{time.strftime('%Y%m%d_%H%M%S')}.txt",
            )
            if filename:
                with open(filename, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"[INFO] Log disimpan ke {filename}")
        except Exception as e:
            print(f"[ERROR] Gagal simpan log: {e}")

    def _open_results_folder(self):
        """Buka folder hasil di Windows Explorer."""
        folder = os.path.dirname(os.path.abspath(RESULT_FILE))
        try:
            os.startfile(folder)
        except Exception:
            subprocess.Popen(["explorer", folder])


# ============================================================
# Root Application
# ============================================================
class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Bot MAP Pertamina v3")
        self.geometry("900x680")
        self.minsize(860, 620)
        self.configure(fg_color=C_BG)

        self.hwid = get_hwid()
        self._current_screen = None

        # Cek lisensi
        valid, _, _ = verify_license(self.hwid)
        if valid:
            self._show_main()
        else:
            self._show_license()

    def _clear(self):
        if self._current_screen:
            self._current_screen.destroy()

    def _show_license(self):
        self._clear()
        self._current_screen = LicenseScreen(self, self.hwid, on_success=self._show_main)

    def _show_main(self):
        self._clear()
        self._current_screen = MainScreen(self, self.hwid)


# ============================================================
# Entry Point
# ============================================================
if __name__ == "__main__":
    app = App()
    app.mainloop()
