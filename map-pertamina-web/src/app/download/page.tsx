'use client';

// page.tsx (src/app/download/page.tsx)
// Pusat Unduhan & Panduan Interaktif Lengkap (Sistem Dropdown Accordion Ringan v1.0.9)

import React, { useState } from 'react';

export default function DownloadPage() {
  const downloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_URL || 'https://drive.google.com/drive/folders/1Y2aWbsPPDtrsdfMdY1DTX_1sp_XZk-Ou?usp=sharing';
  const androidDownloadUrl = process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL || 'https://github.com/TheMask112/Map_Pertamina_Bot/releases/download/v1.1.4/MAP_Pertamina_Bot_v1.1.4.apk';

  // State Dropdown Accordion
  const [openSection, setOpenSection] = useState<string | null>('modul-1');

  const toggleSection = (id: string) => {
    setOpenSection(prev => prev === id ? null : id);
  };

  const expandAll = () => setOpenSection('all');
  const collapseAll = () => setOpenSection(null);

  const isExpanded = (id: string) => openSection === 'all' || openSection === id;

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.icon}>📥</div>
        <h1 style={styles.title}>Pusat Unduhan & Panduan Lengkap</h1>
        <p style={styles.subtitle}>
          Unduh aplikasi resmi <strong>v1.1.4</strong> dan pelajari panduan visual mandiri dari awal hingga mahir.
        </p>
      </div>

      {/* DOWNLOAD GRID CARDS */}
      <div style={styles.downloadGrid}>
        {/* WINDOWS DOWNLOAD CARD */}
        <div style={styles.card} className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={styles.cardTitle}>💻 Windows Desktop (PC/Laptop)</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              v1.1.4 (Stabil)
            </span>
          </div>

          <div style={styles.versionInfo}>
            <span>Tipe: <strong>Portable Installer (.zip)</strong></span>
            <span>Ukuran: <strong>~180 MB</strong></span>
            <span>Kompatibel: <strong>Windows 10 / 11 (64-bit)</strong></span>
          </div>

          <p style={styles.preBundledNotice}>
            📦 <strong>ALL-IN-ONE PACKAGE:</strong> Sudah dibundel engine Chromium & Database Resmi Kemendagri 514 Daerah 38 Provinsi.
          </p>

          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary pulse" style={styles.downloadBtn}>
            💾 Unduh Installer (.zip)
          </a>
          <span style={styles.safetyBadge}>🛡️ Cloud Storage Aman (Google Drive)</span>
        </div>

        {/* ANDROID DOWNLOAD CARD */}
        <div style={styles.card} className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={styles.cardTitle}>📱 Aplikasi Android (HP)</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              v1.1.4 (Terbaru)
            </span>
          </div>

          <div style={styles.versionInfo}>
            <span>Tipe: <strong>APK Installer</strong></span>
            <span>Ukuran: <strong>~134 MB</strong></span>
            <span>Fitur: <strong>Multi-Pangkalan & Mesin Ghoib</strong></span>
          </div>

          <p style={{ ...styles.preBundledNotice, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            🚀 <strong>MESIN GHOIB:</strong> Berjalan di latar belakang (Minimize aman tanpa terputus) + Auto-Bypass Captcha & Auto-Relogin.
          </p>

          <a href={androidDownloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary pulse" style={{ ...styles.downloadBtn, background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
            💾 Unduh APK Android (v1.1.4)
          </a>
          <span style={styles.safetyBadge}>🛡️ Unduhan Resmi Cepat (GitHub Releases)</span>
        </div>
      </div>

      {/* TEMPLATE EXCEL BANNER */}
      <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '20px 24px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>📑 Contoh Format File Excel Pelanggan</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Pastikan file Excel Anda memiliki kolom <code>NIK</code> (16 digit angka berformat teks).</p>
        </div>
        <a 
          href="/data_pelanggan.xlsx" 
          download="data_pelanggan_template.xlsx"
          style={{ padding: '8px 16px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 }}
        >
          📥 Download Template Excel (.xlsx)
        </a>
      </div>

      {/* INTERACTIVE ACCORDION TUTORIAL SECTION */}
      <section id="tutorial" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
              📖 Pusat Panduan Mandiri Lengkap (A–Z)
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#94a3b8', margin: 0 }}>
              Klik modul di bawah untuk melihat panduan lengkap tanpa membuat halaman berat:
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={expandAll} style={styles.toggleBtn}>Buka Semua</button>
            <button onClick={collapseAll} style={styles.toggleBtn}>Tutup Semua</button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* ======================================================== */}
          {/* MODUL 1: CARA DOWNLOAD & INSTALL */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-1')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={styles.moduleBadge}>MODUL 1</span>
                <span style={styles.accordionTitle}>📥 Cara Download & Instalasi Aplikasi (Android & PC)</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-1') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-1') && (
              <div style={styles.accordionContent}>
                <div style={styles.gridSteps}>
                  {/* Android Step */}
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#34d399', fontWeight: 700, margin: '0 0 12px 0' }}>📱 Pada HP Android</h4>
                    <div style={styles.uiMockupFrame}>
                      <div style={styles.mockupHeader}>Layar Instalasi Android</div>
                      <div style={{ ...styles.mockupBody, textAlign: 'center', padding: '16px 8px' }}>
                        <div style={{ fontSize: '2rem' }}>🤖</div>
                        <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem', marginTop: '4px' }}>MAP Pertamina Bot</div>
                        <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '2px' }}>v1.0.9 (Release Terverifikasi)</div>
                        <div style={{ margin: '12px 0', padding: '8px', background: 'rgba(234, 179, 8, 0.15)', borderRadius: '8px', fontSize: '0.78rem', color: '#facc15' }}>
                          ⚠️ Jika muncul peringatan Play Protect, klik "Tetap Pasang (Install Anyway)"
                        </div>
                        <div style={{ padding: '6px', background: '#059669', color: '#fff', fontWeight: 700, borderRadius: '6px', fontSize: '0.8rem' }}>
                          ✓ PASANG SELESAI
                        </div>
                      </div>
                    </div>

                    <ol style={styles.stepList}>
                      <li>Klik tombol <strong>Unduh APK Android (v1.0.9)</strong> di atas.</li>
                      <li>Buka file <code>MAP_Pertamina_Bot_v1.0.9.apk</code> dari notifikasi download atau File Manager.</li>
                      <li>Tekan <strong>Install / Pasang</strong>. Jika diminta izin sumber tidak dikenal, pilih <em>Izinkan / Tetap Pasang</em>.</li>
                      <li>Selesai! Aplikasi langsung siap digunakan.</li>
                    </ol>
                  </div>

                  {/* Windows Step */}
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#38bdf8', fontWeight: 700, margin: '0 0 12px 0' }}>💻 Pada Laptop / PC Windows</h4>
                    <div style={styles.uiMockupFrame}>
                      <div style={styles.mockupHeader}>Folder Installer Windows</div>
                      <div style={{ ...styles.mockupBody, padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', fontSize: '0.8rem', color: '#cbd5e1' }}>
                          📁 1. Ekstrak <code>Bot_MAP_Pertamina_Installer.zip</code>
                        </div>
                        <div style={{ padding: '6px 10px', background: 'rgba(234,179,8,0.12)', borderRadius: '6px', fontSize: '0.8rem', color: '#facc15' }}>
                          ⚙️ 2. Klik kanan <code>Instal_Bot.bat</code> ➔ Run As Administrator
                        </div>
                        <div style={{ padding: '6px 10px', background: 'rgba(56,189,248,0.15)', borderRadius: '6px', fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>
                          🚀 3. Klik 2x <code>Bot_MAP_Pertamina.exe</code>
                        </div>
                      </div>
                    </div>

                    <ol style={styles.stepList}>
                      <li>Klik <strong>Unduh Installer (.zip)</strong> dari tautan Google Drive resmi di atas.</li>
                      <li>Klik kanan file <code>.zip</code> yang terunduh ➔ pilih <strong>Extract All (Ekstrak Semua)</strong>.</li>
                      <li>Buka folder hasil ekstrak, klik kanan file <code>Instal_Bot.bat</code> ➔ pilih <strong>Run as administrator</strong> (hanya 1x diawal).</li>
                      <li>Klik 2x pada <code>Bot_MAP_Pertamina.exe</code> untuk mulai.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 2: CARA BELI LISENSI & AKTIVASI */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-2')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(234, 179, 8, 0.2)', color: '#facc15' }}>MODUL 2</span>
                <span style={styles.accordionTitle}>💳 Cara Beli Lisensi & Aktivasi Otomatis (QRIS 5 Detik)</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-2') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-2') && (
              <div style={styles.accordionContent}>
                <div style={styles.gridSteps}>
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#facc15', fontWeight: 700, margin: '0 0 12px 0' }}>1. Pilih Paket & Bayar QRIS Otomatis</h4>
                    <ol style={styles.stepList}>
                      <li>Buka halaman beranda <strong><a href="/#pricing" style={{ color: '#38bdf8' }}>Pilihan Paket</a></strong>.</li>
                      <li>Pilih paket: <strong>Starter (500)</strong>, <strong>Pro (2.000)</strong>, atau <strong>Enterprise (5.000)</strong>.</li>
                      <li>Masukkan <strong>Nomor WhatsApp</strong> Anda untuk menerima invoice resmi.</li>
                      <li>Scan QRIS dari aplikasi m-Banking (BCA, Mandiri, BRI, BNI) atau e-Wallet (DANA, Gopay, OVO, ShopeePay).</li>
                    </ol>
                  </div>

                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#38bdf8', fontWeight: 700, margin: '0 0 12px 0' }}>2. Aktivasi Lisensi di Aplikasi</h4>
                    <ol style={styles.stepList}>
                      <li>Setelah pembayaran lunas, layar website dalam 5 detik langsung memunculkan <strong>Kode Voucher</strong> & <strong>License Key</strong>.</li>
                      <li>Salin Kode Voucher / Lisensi tersebut.</li>
                      <li>Buka aplikasi Bot di HP/PC, tempelkan kode ke kolom aktivasi ➔ Tekan <strong>Aktivasi</strong>.</li>
                      <li>Status lisensi langsung berubah menjadi <strong>Aktif</strong> dengan kuota penuh!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 3: FORMAT FILE EXCEL */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-3')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>MODUL 3</span>
                <span style={styles.accordionTitle}>📊 Format Standar File Excel NIK Pelanggan</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-3') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-3') && (
              <div style={styles.accordionContent}>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '14px', lineHeight: 1.6 }}>
                  Gunakan format tabel Excel berikut untuk mencatat daftar NIK pembeli:
                </p>

                <div style={{ overflowX: 'auto', marginBottom: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', color: '#facc15', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ padding: '10px 14px' }}>Kolom A (NIK - Wajib)</th>
                        <th style={{ padding: '10px 14px' }}>Kolom B (Jumlah Tabung)</th>
                        <th style={{ padding: '10px 14px' }}>Kolom C (Nama Pembeli)</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: '#e2e8f0' }}>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>1807010101900001</td>
                        <td style={{ padding: '10px 14px' }}>1</td>
                        <td style={{ padding: '10px 14px' }}>Budi Santoso</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>1808020202910002</td>
                        <td style={{ padding: '10px 14px' }}>2</td>
                        <td style={{ padding: '10px 14px' }}>Warung Makan Berkah</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 4: MENGATASI FORMAT NIK RUSAK DI EXCEL (Item 5.2) */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-4')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185' }}>MODUL 4</span>
                <span style={styles.accordionTitle}>📑 Cara Mengatasi Format NIK Rusak di Excel (Notasi Ilmiah 1.807E+15)</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-4') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-4') && (
              <div style={styles.accordionContent}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: '16px', fontSize: '0.88rem', color: '#fca5a5' }}>
                  ⚠️ <strong>MASALAH SERING TERJADI:</strong> Microsoft Excel sering mengubah angka NIK 16-digit menjadi notasi ilmiah seperti <code>1.80701E+15</code> atau memotong angka <code>0</code> di awal NIK.
                </div>

                <h4 style={{ color: '#38bdf8', fontWeight: 700, margin: '0 0 10px 0' }}>Solusi Mudah 3 Langkah:</h4>
                <ol style={styles.stepList}>
                  <li><strong>Blok Seluruh Kolom NIK:</strong> Klik huruf kolom (misal kolom <code>A</code>) di Excel.</li>
                  <li><strong>Ubah Format Cell:</strong> Klik kanan ➔ pilih <strong>Format Cells (Format Sel)</strong>.</li>
                  <li><strong>Pilih Kategori Text:</strong> Di tab <em>Number</em>, pilih <strong>Text (Teks)</strong> ➔ Klik <strong>OK</strong>.</li>
                  <li>Ketik NIK 16-digit. Angka tidak akan berubah dan angka 0 di depan akan tetap utuh!</li>
                </ol>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 5: CARA PAKAI BOT, AUTO-RELOGIN & MULTI-PANGKALAN */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-5')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>MODUL 5</span>
                <span style={styles.accordionTitle}>🏢 Cara Pakai Bot, Fitur Auto-Relogin & Multi-Pangkalan</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-5') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-5') && (
              <div style={styles.accordionContent}>
                <div style={styles.gridSteps}>
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#c084fc', fontWeight: 700, margin: '0 0 10px 0' }}>🔑 1. Pengisian Akun Hanya 1 Kali (Auto-Relogin)</h4>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      No HP dan PIN akun MAP hanya dimasukkan <strong>1 kali saja</strong> saat Anda menyimpan profil pangkalan. 
                      Jika di tengah proses transaksi sesi Pertamina keluar sendiri (<em>session expired</em>), 
                      <strong> bot otomatis mengisi data dan login ulang sendiri</strong> tanpa Anda perlu mengulang dari awal.
                    </p>
                  </div>

                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#38bdf8', fontWeight: 700, margin: '0 0 10px 0' }}>🔄 2. Multi-Pangkalan Switcher (Enterprise)</h4>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Bagi pemilik Paket Enterprise (5.000 Tabung), Anda dapat mendaftarkan banyak akun pangkalan sekaligus:
                    </p>
                    <ol style={{ ...styles.stepList, paddingLeft: '16px' }}>
                      <li>Tekan tombol <strong>➕ Tambah Pangkalan</strong> ➔ Isi Nama Pangkalan, No HP, dan PIN MAP.</li>
                      <li>Simpan profil pangkalan (contoh: *Pangkalan Berkah*, *Pangkalan Jaya Gas*).</li>
                      <li>Setiap mau memproses pangkalan, cukup pilih nama pangkalan di dropdown ➔ pilih file Excel pangkalan tersebut ➔ Klik <strong>Mulai</strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 6: PANDUAN IZIN KHUSUS HP ANDROID (Item 2) */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-6')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>MODUL 6</span>
                <span style={styles.accordionTitle}>📱 Panduan Izin Khusus HP (Xiaomi, Oppo, Vivo, Samsung, Realme)</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-6') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-6') && (
              <div style={styles.accordionContent}>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '14px', lineHeight: 1.6 }}>
                  Agar fitur <strong>Mesin Ghoib (Background Service)</strong> tidak dimatikan oleh sistem penghemat baterai HP saat layar mati, lakukan pengaturan cepat berikut:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  {/* Xiaomi */}
                  <div style={styles.stepBox}>
                    <h5 style={{ color: '#facc15', margin: '0 0 8px 0', fontWeight: 700 }}>Xiaomi / Redmi / POCO (MIUI / HyperOS)</h5>
                    <ul style={{ fontSize: '0.82rem', color: '#cbd5e1', paddingLeft: '16px', margin: 0, lineHeight: 1.5 }}>
                      <li>Buka <em>Pengaturan ➔ Aplikasi ➔ Kelola Aplikasi ➔ MAP Bot</em>.</li>
                      <li>Aktifkan <strong>Mulai Otomatis (Autostart)</strong>.</li>
                      <li>Pilih <strong>Penghemat Baterai ➔ Tidak ada pembatasan</strong>.</li>
                    </ul>
                  </div>

                  {/* Oppo / Vivo / Realme */}
                  <div style={styles.stepBox}>
                    <h5 style={{ color: '#38bdf8', margin: '0 0 8px 0', fontWeight: 700 }}>Oppo / Vivo / Realme</h5>
                    <ul style={{ fontSize: '0.82rem', color: '#cbd5e1', paddingLeft: '16px', margin: 0, lineHeight: 1.5 }}>
                      <li>Buka Recent Apps (Layar aplikasi berjalan).</li>
                      <li>Tekan dan tahan ikon <strong>MAP Bot</strong> ➔ pilih <strong>Kunci Aplikasi (Lock App 🔒)</strong>.</li>
                      <li>Izinkan <em>Jalankan di latar belakang</em>.</li>
                    </ul>
                  </div>

                  {/* Samsung */}
                  <div style={styles.stepBox}>
                    <h5 style={{ color: '#34d399', margin: '0 0 8px 0', fontWeight: 700 }}>Samsung Galaxy</h5>
                    <ul style={{ fontSize: '0.82rem', color: '#cbd5e1', paddingLeft: '16px', margin: 0, lineHeight: 1.5 }}>
                      <li>Buka <em>Pengaturan ➔ Perawatan Perangkat ➔ Baterai</em>.</li>
                      <li>Pilih <em>Batas Penggunaan Latar Belakang</em>.</li>
                      <li>Pastikan MAP Bot dimasukkan ke dalam <strong>Aplikasi yang tidak pernah tidur (Never Sleeping Apps)</strong>.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 7: CARA RESET LISENSI / TOP-UP */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-7')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>MODUL 7</span>
                <span style={styles.accordionTitle}>🔄 Cara Reset Lisensi & Top-Up Perpanjangan Kuota</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-7') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-7') && (
              <div style={styles.accordionContent}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#f87171', fontWeight: 700, margin: '0 0 8px 0' }}>Kapan Harus Reset Lisensi?</h4>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Jika kuota tabung NIK Anda sudah habis dan Anda telah membeli paket baru di website, Anda cukup melakukan reset lisensi untuk memasukkan kode baru.
                    </p>
                  </div>

                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#34d399', fontWeight: 700, margin: '0 0 8px 0' }}>Langkah Reset & Masukkan Kode Baru</h4>
                    <ol style={styles.stepList}>
                      <li>Buka menu <strong>Pengaturan</strong> di aplikasi bot.</li>
                      <li>Tekan tombol merah <strong>Reset Lisensi</strong> ➔ Konfirmasi Ya.</li>
                      <li>Aplikasi akan kembali ke layar aktivasi. Masukkan Kode Voucher atau License Key baru Anda.</li>
                      <li>Tekan <strong>Aktivasi</strong> ➔ Kuota tabung langsung terisi penuh kembali!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 8: MEMBACA & MEMFILTER LAPORAN HASIL (Item 3) */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-8')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>MODUL 8</span>
                <span style={styles.accordionTitle}>📑 Cara Membaca & Memfilter Laporan Hasil Transaksi (Output Excel)</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-8') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-8') && (
              <div style={styles.accordionContent}>
                <h4 style={{ color: '#38bdf8', fontWeight: 700, margin: '0 0 10px 0' }}>Lokasi File & Arti Status Hasil:</h4>
                <ul style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6, paddingLeft: '18px', margin: '0 0 16px 0' }}>
                  <li><strong>Lokasi File:</strong> Tersimpan otomatis di folder <code>Download</code> (di Android) atau di satu folder yang sama dengan bot (di Windows) dengan nama <code>data_pelanggan_hasil.xlsx</code>.</li>
                  <li><strong style={{ color: '#34d399' }}>SUKSES:</strong> Transaksi NIK berhasil tercatat di sistem MAP Pertamina.</li>
                  <li><strong style={{ color: '#facc15' }}>SUDAH TRANSAKSI HARI INI:</strong> Pembeli tersebut sudah mengambil jatah tabung di hari yang sama.</li>
                  <li><strong style={{ color: '#f87171' }}>NIK TIDAK TERDAFTAR:</strong> NIK belum terdaftar di database Subsidi Tepat Pusat.</li>
                  <li><strong style={{ color: '#94a3b8' }}>TIMEOUT / ERROR:</strong> Terkendala koneksi, data akan otomatis diproses ulang pada percobaan berikutnya.</li>
                </ul>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.85rem', color: '#94a3b8' }}>
                  💡 <strong>Cara Filter Cepat:</strong> Buka file hasil di Excel ➔ Pilih baris judul ➔ Klik menu <strong>Data ➔ Filter</strong> ➔ Centang hanya status <strong>SUKSES</strong> untuk menyerahkan laporan resmi ke agen penyalur.
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 9: PINDAH PERANGKAT / GANTI HP (Item 5.1) */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-9')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(234, 179, 8, 0.2)', color: '#facc15' }}>MODUL 9</span>
                <span style={styles.accordionTitle}>🔄 Kebijakan Pindah Perangkat / Ganti HP / Ganti Laptop</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-9') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-9') && (
              <div style={styles.accordionContent}>
                <div style={{ background: 'rgba(234, 179, 8, 0.08)', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(234, 179, 8, 0.2)', fontSize: '0.88rem', color: '#fef08a', lineHeight: 1.6 }}>
                  🛡️ <strong>JAMINAN LISENSI AMAN:</strong> Lisensi terikat pada Hardware ID perangkat untuk mencegah pembajakan. Namun jika HP Anda rusak, hilang, atau Anda membeli laptop/HP baru, <strong>lisensi Anda TIDAK HANGUS</strong>.
                </div>

                <h4 style={{ color: '#f8fafc', fontWeight: 700, margin: '16px 0 10px 0' }}>Cara Klaim Pindah Lisensi ke Perangkat Baru:</h4>
                <ol style={styles.stepList}>
                  <li>Buka aplikasi Bot di HP/Laptop baru Anda dan salin <strong>Hardware ID (HWID)</strong> yang tertera.</li>
                  <li>Kirimkan bukti pembelian / Nomor WhatsApp pembelian ke Admin Telegram Resmi <strong>@Dadilan</strong>.</li>
                  <li>Admin akan memindahkan lisensi Anda ke perangkat baru secara gratis (selama sisa kuota tabung masih tersedia).</li>
                </ol>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 10: TIPS & TRIK TRANSAKSI CEPAT & AMAN (Item 4) */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-10')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>MODUL 10</span>
                <span style={styles.accordionTitle}>⚡ Tips & Trik Transaksi Cepat & Aman (Best Practices)</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-10') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-10') && (
              <div style={styles.accordionContent}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  <div style={styles.stepBox}>
                    <h5 style={{ color: '#38bdf8', margin: '0 0 6px 0', fontWeight: 700 }}>🕒 Waktu Transaksi Terbaik</h5>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                      Jalankan bot pada jam kerja (pukul 07.00 – 21.00 WIB). Hindari transaksi di jam tengah malam (00.00 – 03.00) saat server pusat Pertamina sedang melakukan sinkronisasi database rutin.
                    </p>
                  </div>

                  <div style={styles.stepBox}>
                    <h5 style={{ color: '#34d399', margin: '0 0 6px 0', fontWeight: 700 }}>📦 Ukuran Batch Ideal</h5>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                      Untuk stabilitas koneksi terbaik, jalankan 50 – 100 NIK per sesi. Bot akan menyelesaikan 100 NIK dalam beberapa menit tanpa membebani memori HP/Laptop.
                    </p>
                  </div>

                  <div style={styles.stepBox}>
                    <h5 style={{ color: '#facc15', margin: '0 0 6px 0', fontWeight: 700 }}>💾 Backup File Excel Asli</h5>
                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                      Selalu simpan salinan file Excel mentah Anda sebelum diproses agar riwayat data pelanggan tetap aman sebagai arsip logbook cadangan.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 11: PROGRAM MITRA AFFILIATE (Item 1) */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-11')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>MODUL 11</span>
                <span style={styles.accordionTitle}>🤝 Panduan Program Reseller / Mitra Affiliate (Markup Laba)</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-11') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-11') && (
              <div style={styles.accordionContent}>
                <div style={styles.gridSteps}>
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#c084fc', fontWeight: 700, margin: '0 0 10px 0' }}>1. Daftar Jadi Mitra Affiliate</h4>
                    <ol style={styles.stepList}>
                      <li>Buka menu <strong><a href="/affiliate/register" style={{ color: '#38bdf8' }}>Daftar Mitra Affiliate</a></strong> di website.</li>
                      <li>Pilih kode referral Anda sendiri (contoh: <code>AGENBERKAH</code>) dan buat password login.</li>
                      <li>Tentukan <strong>Harga Markup / Laba</strong> Anda sendiri (misal harga modal Rp 75.000, Anda markup Rp 25.000 sehingga harga jual jadi Rp 100.000).</li>
                    </ol>
                  </div>

                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#34d399', fontWeight: 700, margin: '0 0 10px 0' }}>2. Sebarkan Link & Tarik Komisi</h4>
                    <ol style={styles.stepList}>
                      <li>Salin link toko referral Anda dari Dashboard Mitra.</li>
                      <li>Bagikan link ke pangkalan / kenalan Anda. Saat mereka checkout, pembeli membayar harga markup dan komisi laba otomatis masuk ke saldo Anda.</li>
                      <li>Ajukan penarikan dana (payout) kapan saja ke Rekening Bank (BCA, Mandiri, BRI) atau e-Wallet (DANA, Gopay).</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 12: SOP BANTUAN TEKNIS & ANTI-PENIPUAN (Item 5.5) */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-12')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>MODUL 12</span>
                <span style={styles.accordionTitle}>🛡️ SOP Layanan Bantuan Teknis & Himbauan Anti-Penipuan</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-12') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-12') && (
              <div style={styles.accordionContent}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#34d399', fontWeight: 700, margin: '0 0 10px 0' }}>📞 Saluran Resmi Layanan Bantuan</h4>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                      Jika Anda membutuhkan bantuan teknis aktivasi atau konsultasi, hubungi saluran resmi kami:
                    </p>
                    <ul style={{ fontSize: '0.85rem', color: '#cbd5e1', paddingLeft: '18px', margin: 0, lineHeight: 1.6 }}>
                      <li>Telegram Bantuan Resmi: <strong>@Dadilan</strong></li>
                      <li>Website Resmi: <strong>map-pertamina-web.vercel.app</strong></li>
                      <li>Pembayaran Resmi: <strong>Hanya via QRIS Midtrans Otomatis di Website</strong></li>
                    </ul>
                  </div>

                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#f87171', fontWeight: 700, margin: '0 0 10px 0' }}>⚠️ Himbauan Waspada Penipuan</h4>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
                      Admin tidak pernah meminta transfer manual ke rekening pribadi yang tidak tertera di sistem website resmi. 
                      Pastikan selalu melakukan pembelian lisensi dan unduhan aplikasi hanya melalui portal resmi ini demi keamanan transaksi Anda.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '36px',
    maxWidth: '960px',
    margin: '0 auto',
  },
  header: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    alignItems: 'center',
  },
  icon: {
    fontSize: '3.5rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 800,
  },
  subtitle: {
    fontSize: '1.05rem',
    color: 'hsl(215, 20%, 65%)',
  },
  downloadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '24px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    padding: '30px 24px',
    gap: '18px',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  versionInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '10px',
    padding: '14px',
    border: '1px solid rgba(255,255,255,0.03)',
    fontSize: '0.88rem',
    color: 'hsl(215, 20%, 65%)',
  },
  preBundledNotice: {
    fontSize: '0.82rem',
    color: 'hsl(194, 96%, 52%)',
    lineHeight: '1.5',
    background: 'rgba(6, 182, 212, 0.05)',
    border: '1px dashed rgba(6, 182, 212, 0.25)',
    borderRadius: '10px',
    padding: '12px',
  },
  downloadBtn: {
    width: '100%',
    padding: '14px',
    textAlign: 'center' as const,
    fontWeight: 700,
    textDecoration: 'none',
  },
  safetyBadge: {
    fontSize: '0.78rem',
    color: 'hsl(215, 20%, 65%)',
    textAlign: 'center' as const,
  },
  accordionCard: {
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    transition: 'all 0.2s ease',
  },
  accordionHeader: {
    width: '100%',
    padding: '18px 22px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  moduleBadge: {
    fontSize: '0.72rem',
    fontWeight: 800,
    padding: '4px 8px',
    borderRadius: '6px',
    background: 'rgba(56, 189, 248, 0.2)',
    color: '#38bdf8',
    letterSpacing: '0.5px',
  },
  accordionTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#f8fafc',
  },
  accordionContent: {
    padding: '22px',
    background: 'rgba(15, 23, 42, 0.4)',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  gridSteps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    textAlign: 'left' as const,
  },
  stepBox: {
    background: 'rgba(255,255,255,0.02)',
    padding: '18px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  stepList: {
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    fontSize: '0.85rem',
    color: '#e2e8f0',
    lineHeight: '1.5',
    margin: '12px 0 0 0',
  },
  uiMockupFrame: {
    background: '#090d16',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  mockupHeader: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.05)',
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 700,
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  mockupBody: {
    background: '#0d1322',
  },
  toggleBtn: {
    padding: '6px 12px',
    fontSize: '0.8rem',
    fontWeight: 600,
    background: 'rgba(255,255,255,0.05)',
    color: '#cbd5e1',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
