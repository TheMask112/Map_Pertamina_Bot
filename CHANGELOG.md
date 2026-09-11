# Changelog — Bot MAP Pertamina

Semua perubahan penting pada proyek **Bot MAP Pertamina (Desktop EXE & Android APK)** akan didokumentasikan di dalam file ini.

Format changelog ini mengacu pada standar [Keep a Changelog](https://keepachangelog.com/id/1.0.0/),
dan proyek ini mematuhi prinsip [Semantic Versioning (SemVer)](https://semver.org/lang/id/).

---

## [1.4.0] - 2026-09-11
### Ditambahkan (Added)
- **Pemindai & Filter NIK Cepat (REST API Engine)**:
  - Modul multithreading `fast_filter_service.py` untuk memindai 100–1000 NIK dalam 15–30 detik (150–300 ms/NIK).
  - Ekstraksi langsung kategori: *Rumah Tangga*, *Usaha Mikro*, atau *Belum Terdaftar*.
  - Pembuatan otomatis 2 file Excel: `hasil_filter_nik.xlsx` (laporan audit detail) dan `data_siap_proses.xlsx` (hanya NIK valid siap transaksi).
  - Tombol GUI baru pada Desktop: ⚡ Scan NIK Cepat (REST) lengkap dengan live counter dan tombol cepat untuk langsung memakai data bersih ke bot.
- **Pemeriksa Legalitas NIB Usaha Mikro (OSS)**:
  - Modul `nib_service.py` yang terhubung ke endpoint OSS MyPertamina `/general/oss/v1/nib/check/micro-business?nib={nib}`.
  - Validasi otomatis jenis usaha terhadap Surat Edaran Dirjen Migas No. B-2461/MG.05/DJM/2022 (deteksi otomatis larangan untuk restoran besar, hotel, binatu/laundry komersil, peternakan besar, dan manufaktur).
  - Tombol GUI baru pada Desktop: 🏢 Cek NIB Usaha Mikro (OSS) untuk verifikasi legalitas perizinan dan kelayakan subsidi 3 kg.
- **Pemisahan Pintar Tabung UM vs RT (Smart Tabung Split)**:
  - Kontrol jumlah tabung independen untuk Rumah Tangga (default: 1) dan Usaha Mikro (default: 2).
  - Checkbox *Otomatis bedakan tabung UM vs RT (Prioritas UM)* pada Desktop dan Switch interaktif pada Android APK.
  - Penyesuaian otomatis tombol + pada UI transaksi Pertamina dan pemotongan kuota lisensi sesuai jumlah tabung aktual (bukan flat 1 tabung).
- **Penampil Catatan Rilis Langsung di Aplikasi (In-App Changelog)**:
  - Tombol `📜 Catatan Rilis` di topbar Desktop app untuk melihat riwayat pembaruan dan versi langsung di dalam aplikasi.
  - Dukungan bundling file changelog pada standalone PyInstaller executable via `sys._MEIPASS`.
- **Skills Antigravity Baru**:
  - `persistent-memory` (v1.0.0): Arsitektur memori multi-tingkat (Working, Episodic, Semantic, Procedural) untuk ingatan lintas-sesi.
  - `second-brain` (v1.0.0): Manajemen pengetahuan P.A.R.A. (Projects, Areas, Resources, Archives) dan Architectural Decision Records (ADR).

### Diperbaiki (Fixed)
- **Pembaruan Tempat & Tanggal Lahir (TTL)**:
  - Penanganan stabil untuk Mantine UI custom dropdowns (`[data-testid="daySelect"]`, `monthSelect`, `yearSelect`) dengan konversi nama bulan Indonesia.
  - Alur klik tombol SELANJUTNYA (`[data-testid="btnSubmitUpdate"]`), konfirmasi YA, PERBARUI DATA PELANGGAN, hingga kembali ke alur transaksi.
- **Kompilasi & Build Artifacts**:
  - Rebuild `Bot_MAP_Pertamina.exe` (PyInstaller) menyertakan modul REST scanner, NIB validator, dan dialog changelog.
  - Rebuild Android APK v1.4.0 (`versionCode = 14`, `versionName = "1.4.0"`).

---

## [1.3.0] - 2026-08-31
### Ditambahkan (Added)
- Big Data v3 frontend UI dan Android telemetry client.
- Pangkalan telemetry scraper & reporting ke server backend.
- Ekstraksi otomatis kuota sisa pangkalan dan nama agen penyalur (PT Agen).

---

## [1.2.1] - 2026-08-31
### Ditambahkan (Added)
- Display full telemetry pangkalan pada Admin Dashboard (sisa alokasi, status pangkalan, omset harian).
- Joki / Freelance Agency Hub clustering analysis.

---

## [1.2.0] - 2026-08-31
### Ditambahkan (Added)
- 8-Tab Intelligence Dashboard (Pusat Komando, Intelijen Pangkalan, Analisa Keuangan, Radar Peluang, Transaksi, Lisensi, Katalog, Monitoring).
- Telemetry session reporting endpoint `/api/report-session` dengan Neon PostgreSQL.

---

## [1.1.0] - 2026-08-30
### Ditambahkan (Added)
- Sinkronisasi kode wilayah Kemendagri 2024 (514 kabupaten/kota).
- Multi-Pangkalan Switcher untuk paket Enterprise.
- Auto-updater JSON & portal download.

---

## [1.0.7] - 2026-08-30
### Ditambahkan (Added)
- Rilis basis ultra-cepat dan stabil untuk Desktop dan Android.
- Sistem lisensi berbasis RSA-2048 offline + online sync.
- Solver captcha berbasis OpenCV template matching dengan slider adaptif.
- Notifikasi error dan status transaksi via Telegram Bot.

### Keamanan (Security)
- Proteksi file sensitif (`.pem`, `.dat`, `.xlsx`, session dump) melalui `.gitignore`.
- Aturan pemotongan kuota: hanya dipotong setelah status transaksi 100% terverifikasi berhasil.

---

## Panduan Kontrol Versi untuk Pembaruan Selanjutnya (Versioning Rules)
1. **Peningkatan Versi (Semantic Versioning)**:
   - **PATCH** (misal 1.4.0 -> 1.4.1): Untuk perbaikan bug, penyesuaian selector UI, dan perbaikan minor.
   - **MINOR** (misal 1.4.0 -> 1.5.0): Untuk penambahan fitur atau menu baru yang kompatibel ke belakang.
   - **MAJOR** (misal 1.4.0 -> 2.0.0): Untuk perombakan arsitektur besar atau perubahan protokol API yang memutus alur lama.
2. **Setiap Rilis Baru Wajib**:
   - Menambahkan catatan di file CHANGELOG.md ini di bawah judul versi baru.
   - Mengupdate nilai versi di file VERSION dan konstanta versi di gui_app.py & build.gradle.kts.
   - Menggunakan Conventional Commit di Git (misal: feat(...), fix(...), docs(...)).
   - Membuat Git Tag untuk rilis tersebut (misal: git tag v1.4.0).
