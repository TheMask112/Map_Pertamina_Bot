# Perbaikan Captcha Bot MAP Pertamina

## Ringkasan Perbaikan

### 1. **captcha_solver.py** - Solver Captcha Multi-Strategy ✅
**Masalah:** Solver sering gagal karena single strategy dengan threshold yang terlalu rendah.

**Perbaikan:**
- Tambahkan 5 strategi captcha yang berbeda:
  1. *Edge Shadow Detection* - Deteksi hole/shadow di background menggunakan edge matching
  2. *Multi-scale Template Matching* - Normalize grayscale untuk lighting invariance
  3. *Color Histogram Similarity* - HSV histogram sliding window
  4. *Masked Template Matching* - Template matching dengan alpha mask
  5. *Sobel Gradient Comparison* - Gradient pattern matching

- Cek consensus: Jika 2+ strategies agree (within 20px), gunakan average posisi

- Threshold dibuat tiingkat:
  - HS: 0.25 → 0.35 → 0.4 untuk strategi yang berbeda
  - Consensus requirement: 0.5 confidence minimum

- Returns: Jarak pixel dalam domain DOM (dinamis berdasarkan capture resolution)

---

### 2. **map_bot_visual.py** - Logic Captcha & Anti-Bot ✅

#### 2.1. Mode Captcha Override
**Perbaikan:**
- Tambahkan constant `CAPTCHA_AUTO` & `CAPTCHA_MANUAL`
- Parameter `captcha_mode: str` di function `run_bot()`
- Manual mode:
  - Bot pause otomatis saat popup captcha muncul
  - Tunggu user 120 detik untuk solve captcha
  - Set `pause_event` sehingga bot menunggu user klik "LANJUTKAN"

#### 2.2. Anti-Bot Detection
**Perbaikan:**
- Tambahkan `MAX_RETRY_CAPTCHA = 3` (sebelumnya `MAX_RETRY = 2`)
- Tambahkan environment variable untuk path browser chromium

#### 2.3. Random Delay Antar-NIK
**Perbaikan:**
- Tambahkan:
  - `INTER_NIK_DELAY_MIN = 5` detik
  - `INTER_NIK_DELAY_MAX = 15` detik
- Setelah NIK sukses sebelumlanjut ke berikutnya
- Mencegah deteksi IP sebagai bot karena request terlalu cepat

#### 2.4. Skip Duplicates
**Perbaikan:**
- DONE_STATUSES sudah ada dan berfungsi
- Auto-resume dari checkpoint (ini sudah biasa)

**Status:** Skip logic sudah berjalan - solo perbaikan hanya tuning.

**Logika Skip:**
```python
DONE_STATUSES = {STATUS_SUKSES, STATUS_NIK_INVALID, STATUS_SKIP}
if row.get("Status") in DONE_STATUSES:
    processed_count += 1
    continue
```
✅ Sudah ada di V1, tidak perlu di-ubah.

---

### 3. **gui_app.py** - UI Captcha Mode ✅

**Perbaikan:**
- Tambahkan dropdown "Mode Captcha" di pengaturan
- Options:
  - "Auto (Bot)" → captcha_mode = "auto"
  - "Manual (User)" → captcha_mode = "manual"

- Tambahkan function:
  ```python
  def _get_captcha_mode(self) -> str:
      val = self.combo_captcha.get()
      from map_bot_visual import CAPTCHA_AUTO, CAPTCHA_MANUAL
      return CAPTCHA_MANUAL if "Manual" in val else CAPTCHA_AUTO
  ```

- Teruskan parameter ke `run_bot()`:
  ```python
  captcha_mode=self._get_captcha_mode()
  ```

---

## Penggunaan

### Auto Mode (Default)
Bot otomatis mengecek dan melakukan 3x retry captcha setiap NIK:
1. Ambil gambar background + slider
2. Hitung position puzzle (memakai multi-strategy)
3. Drag slider dengan mouse movement human-like
4. Retry max 3x dengan delay random 1-2 detik
5. Jika仍然失败 → SKIP NIK (gak blocked IP)

### Manual Mode
1. Bot jalankan NIK, klik PROSES PENJUALAN
2. Jika popup captcha muncul:
   - Bot PAUSE (btn Lanjutkan aktif)
   - Tunggu user 120 detik
   - Solusi user:
     - Download/screenshot screen
     - Solve canvas di editor tool random
     - Upload screenshot kembali (opsional → cukup block/batal)
     - Biarkan browser terbuka di desktop
   - Manual step opsional: Setelah selesai solve, tak-lan INDONES setelah 3-5 detik dengan drag manual
3. Jika user sukses: klik LANJUTKAN di GUI
4. Jika timeout 120 detik: Ganti gambar captcha (auto)

---

## Pengujian Rekomendasi

1. ✅ **Test Solver Captcha** - Jalankan dengan NIK sample kecil (10-20 data)
2. ✅ **Test Anti-Detection** - Catat latency antar NIK & random interval
3. ✅ **Test Auto Mode** - Validasi 5 strategies & consensus
4. ✅ **Test Manual Mode** - Validasi pause & resume logic
5. ✅ **Test Block IP** - Jalankan paling beef (20-50 NIK) lalu cek

---

## Kelemahan Terdeteksiitas (Perlu Brainstorming Jika Masih Block)

Jika masih dicek IP:
1. Tambahkan latency random sebelum klik Catat Penjualan
2. Randomize `slow_mo=600` → `800-1200` ms per request
3. Rotasi user-agent/hardware profile
4. Gunakan Proxi pool (updating)

---

## Output Files

- `hasil_proses.xlsx` - Master file (semua NIK)
- `sukses.xlsx` - NIK yang sukses
- `gagal.xlsx` - NIK yang gagal (kapasbility baik: skip tapi tetap dicatat beda)
- `bg.png` / `slider.png` / `cap_bg.png` / `cap_slider.png` - Debug images (dihapus manual jika tidak dibutuhkan)

---

**Status:** Semuanya selesai, siap test.