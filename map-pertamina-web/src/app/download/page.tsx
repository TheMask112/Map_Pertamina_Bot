'use client';

// page.tsx (src/app/download/page.tsx)
// Download Page & Complete Visual Interactive Tutorial for Bot MAP Pertamina (v1.0.9)

import React, { useState } from 'react';

export default function DownloadPage() {
  const downloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_URL || 'https://drive.google.com/drive/folders/1Y2aWbsPPDtrsdfMdY1DTX_1sp_XZk-Ou?usp=sharing';
  const androidDownloadUrl = process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL || 'https://github.com/TheMask112/Map_Pertamina_Bot/releases/download/v1.0.9/MAP_Pertamina_Bot_v1.0.9.apk';

  // State untuk Dropdown Accordion Tutorial
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
          Unduh aplikasi resmi <strong>v1.0.9</strong> dan pelajari panduan visual interaktif dari awal hingga siap transaksi.
        </p>
      </div>

      {/* DOWNLOAD GRID CARDS */}
      <div style={styles.downloadGrid}>
        {/* WINDOWS DOWNLOAD CARD */}
        <div style={styles.card} className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={styles.cardTitle}>💻 Windows Desktop (PC/Laptop)</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              v1.0.9 (Stabil)
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
              v1.0.9 (Terbaru)
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
            💾 Unduh APK Android (v1.0.9)
          </a>
          <span style={styles.safetyBadge}>🛡️ Unduhan Resmi Cepat (GitHub Releases)</span>
        </div>
      </div>

      {/* SYSTEM REQUIREMENTS & TEMPLATE BANNER */}
      <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '20px 24px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>📑 Contoh Format File Excel Pelanggan</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Pastikan file Excel Anda memiliki kolom <code>NIK</code> (16 digit angka teks).</p>
        </div>
        <a 
          href="/data_pelanggan.xlsx" 
          download="data_pelanggan_template.xlsx"
          style={{ padding: '8px 16px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.3)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700 }}
        >
          📥 Download Template Excel (.xlsx)
        </a>
      </div>

      {/* INTERACTIVE DROPDOWN TUTORIAL SECTION */}
      <section id="tutorial" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
              📖 Panduan Visual Langkah demi Langkah (A–Z)
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#94a3b8', margin: 0 }}>
              Klik pada topik di bawah untuk membuka panduan visual lengkap tanpa membuat halaman berat:
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
                    
                    {/* Visual UI Frame Mockup */}
                    <div style={styles.uiMockupFrame}>
                      <div style={styles.mockupHeader}>Layar Instalasi Android</div>
                      <div style={styles.mockupBody}>
                        <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                          <div style={{ fontSize: '2.5rem' }}>🤖</div>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem', marginTop: '4px' }}>MAP Pertamina Bot</div>
                          <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '2px' }}>v1.0.9 (Release Terverifikasi)</div>
                          <div style={{ margin: '14px 0', padding: '8px', background: 'rgba(234, 179, 8, 0.15)', borderRadius: '8px', fontSize: '0.78rem', color: '#facc15' }}>
                            ⚠️ Klik "Tetap Pasang (Install Anyway)" jika muncul peringatan keamanan Google Play Protect
                          </div>
                          <div style={{ padding: '8px', background: '#059669', color: '#fff', fontWeight: 700, borderRadius: '8px', fontSize: '0.85rem' }}>
                            ✓ PASANG SELESAI
                          </div>
                        </div>
                      </div>
                    </div>

                    <ol style={styles.stepList}>
                      <li>Klik tombol <strong>Unduh APK Android (v1.0.9)</strong> di atas.</li>
                      <li>Buka file <code>MAP_Pertamina_Bot_v1.0.9.apk</code> dari notifikasi download atau File Manager HP Anda.</li>
                      <li>Tekan <strong>Install / Pasang</strong>. Jika muncul peringatan sumber tidak dikenal, pilih <em>Izinkan dari sumber ini</em> atau <em>Tetap Pasang</em>.</li>
                      <li>Selesai! Ikon <strong>MAP Bot Pro</strong> akan muncul di menu aplikasi HP Anda.</li>
                    </ol>
                  </div>

                  {/* Windows Step */}
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#38bdf8', fontWeight: 700, margin: '0 0 12px 0' }}>💻 Pada Laptop / PC Windows</h4>
                    
                    {/* Visual UI Frame Mockup */}
                    <div style={styles.uiMockupFrame}>
                      <div style={styles.mockupHeader}>Folder Installer Windows</div>
                      <div style={styles.mockupBody}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px' }}>
                            <span>📁</span>
                            <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>1. Ekstrak <code>Bot_MAP_Pertamina_Installer.zip</code></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(234,179,8,0.12)', borderRadius: '6px' }}>
                            <span>⚙️</span>
                            <span style={{ fontSize: '0.8rem', color: '#facc15' }}>2. Klik kanan <code>Instal_Bot.bat</code> ➔ Run As Administrator</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(56,189,248,0.15)', borderRadius: '6px' }}>
                            <span>🚀</span>
                            <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>3. Buka <code>Bot_MAP_Pertamina.exe</code></span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <ol style={styles.stepList}>
                      <li>Klik <strong>Unduh Installer (.zip)</strong> dari tautan Google Drive resmi di atas.</li>
                      <li>Klik kanan file <code>.zip</code> yang terunduh ➔ pilih <strong>Extract All (Ekstrak Semua)</strong>.</li>
                      <li>Buka folder hasil ekstrak, klik kanan file <code>Instal_Bot.bat</code> ➔ pilih <strong>Run as administrator</strong> (hanya perlu dijalankan 1x diawal).</li>
                      <li>Klik 2x pada <code>Bot_MAP_Pertamina.exe</code> untuk membuka antarmuka bot.</li>
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
                  {/* Step 1 Checkout */}
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#facc15', fontWeight: 700, margin: '0 0 12px 0' }}>1. Pilih Paket & Bayar QRIS</h4>
                    
                    <div style={styles.uiMockupFrame}>
                      <div style={styles.mockupHeader}>Checkout Midtrans Otomatis</div>
                      <div style={{ ...styles.mockupBody, textAlign: 'center', padding: '16px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Scan QRIS Nasional</div>
                        <div style={{ width: '100px', height: '100px', margin: '8px auto', background: '#ffffff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900, fontSize: '0.75rem' }}>
                          [ QRIS CODE ]
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>BCA / Mandiri / BRI / DANA / Gopay / OVO</div>
                      </div>
                    </div>

                    <ol style={styles.stepList}>
                      <li>Buka halaman beranda <strong><a href="/#pricing" style={{ color: '#38bdf8' }}>Pilihan Paket</a></strong>.</li>
                      <li>Pilih paket: <strong>Starter (500)</strong>, <strong>Pro (2.000)</strong>, atau <strong>Enterprise (5.000)</strong>.</li>
                      <li>Masukkan <strong>Nomor WhatsApp</strong> Anda untuk menerima rincian invoice & lisensi.</li>
                      <li>Lakukan pembayaran QRIS dari m-Banking atau e-Wallet favorit Anda.</li>
                    </ol>
                  </div>

                  {/* Step 2 Activation */}
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#38bdf8', fontWeight: 700, margin: '0 0 12px 0' }}>2. Aktivasi Lisensi di Aplikasi Bot</h4>
                    
                    <div style={styles.uiMockupFrame}>
                      <div style={styles.mockupHeader}>Layar Aktivasi Lisensi</div>
                      <div style={{ ...styles.mockupBody, padding: '14px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>KODE VOUCHER / LISENSI:</div>
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '6px', fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.85rem', fontWeight: 700 }}>
                          VCH-987654ABCD
                        </div>
                        <div style={{ marginTop: '10px', padding: '8px', background: '#2563eb', color: '#fff', textAlign: 'center', fontWeight: 700, borderRadius: '6px', fontSize: '0.8rem' }}>
                          AKTIFKAN SEKARANG ➔
                        </div>
                      </div>
                    </div>

                    <ol style={styles.stepList}>
                      <li>Setelah bayar lunas, layar website langsung menampilkan <strong>Kode Voucher</strong> & <strong>License Key</strong> Anda.</li>
                      <li>Salin Kode Voucher atau License Key tersebut.</li>
                      <li>Buka aplikasi Bot di HP/PC, tempelkan kode lisensi ke kotak input ➔ Tekan <strong>Aktivasi</strong>.</li>
                      <li>Status lisensi langsung berubah menjadi <strong>Aktif</strong> dengan kuota segar!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 3: CARA MENYIAPKAN FILE EXCEL */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-3')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>MODUL 3</span>
                <span style={styles.accordionTitle}>📊 Format & Cara Menyiapkan File Excel NIK</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-3') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-3') && (
              <div style={styles.accordionContent}>
                <p style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '14px', lineHeight: 1.6 }}>
                  Bot MAP Pertamina mendukung file Microsoft Excel (<code>.xlsx</code>). Susunan kolom sangat sederhana dan fleksibel:
                </p>

                {/* Table Excel Preview */}
                <div style={{ overflowX: 'auto', marginBottom: '16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.05)', color: '#facc15', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ padding: '10px 14px' }}>Kolom A (NIK - Wajib)</th>
                        <th style={{ padding: '10px 14px' }}>Kolom B (Jumlah Tabung - Opsional)</th>
                        <th style={{ padding: '10px 14px' }}>Kolom C (Catatan / Nama - Opsional)</th>
                        <th style={{ padding: '10px 14px' }}>Kolom D (Status Output Bot)</th>
                      </tr>
                    </thead>
                    <tbody style={{ color: '#e2e8f0' }}>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>1807010101900001</td>
                        <td style={{ padding: '10px 14px' }}>1</td>
                        <td style={{ padding: '10px 14px' }}>Budi Santoso</td>
                        <td style={{ padding: '10px 14px', color: '#34d399', fontWeight: 700 }}>SUKSES</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>1808020202910002</td>
                        <td style={{ padding: '10px 14px' }}>2</td>
                        <td style={{ padding: '10px 14px' }}>Warung Makan Barokah</td>
                        <td style={{ padding: '10px 14px', color: '#34d399', fontWeight: 700 }}>SUKSES</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>1801030303920003</td>
                        <td style={{ padding: '10px 14px' }}>1</td>
                        <td style={{ padding: '10px 14px' }}>Siti Aminah</td>
                        <td style={{ padding: '10px 14px', color: '#f87171', fontWeight: 700 }}>NIK TIDAK TERDAFTAR</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.85rem', color: '#bae6fd', lineHeight: 1.5 }}>
                  💡 <strong>TIPS PENTING:</strong> Pastikan format kolom NIK pada Excel diubah ke tipe <strong>Text</strong> (bukan Scientific/Number) agar angka 0 di depan (seperti <code>08...</code>) dan 16-digit utuh tidak berubah menjadi format pecahan.
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 4: PEMAKAIAN & MULTI-PANGKALAN */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-4')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>MODUL 4</span>
                <span style={styles.accordionTitle}>🏢 Cara Pakai Bot, Auto-Relogin & Fitur Multi-Pangkalan</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-4') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-4') && (
              <div style={styles.accordionContent}>
                <div style={styles.gridSteps}>
                  {/* Auto-Relogin Info */}
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#c084fc', fontWeight: 700, margin: '0 0 10px 0' }}>🔑 1. Pengisian Akun Hanya 1 Kali (Auto-Relogin)</h4>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Anda hanya memasukkan No HP dan Password MAP <strong>satu kali saja di awal</strong> pada menu profil pangkalan. 
                      Jika sewaktu-waktu sesi Pertamina habis (<em>session expired</em>) di tengah proses transaksi, 
                      <strong> bot otomatis mengisi kredensial dan login ulang sendiri</strong> tanpa Anda perlu menghentikan pekerjaan.
                    </p>
                  </div>

                  {/* Multi-Pangkalan Workflow */}
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#38bdf8', fontWeight: 700, margin: '0 0 10px 0' }}>🔄 2. Pengelolaan Multi-Pangkalan (Enterprise)</h4>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Bagi pemilik Paket Enterprise (5.000 Tabung), Anda dapat mendaftarkan banyak akun pangkalan sekaligus:
                    </p>
                    <ol style={{ ...styles.stepList, paddingLeft: '16px' }}>
                      <li>Tekan tombol <strong>➕ Tambah Pangkalan</strong> ➔ Isi Nama Pangkalan, No HP, dan PIN MAP.</li>
                      <li>Simpan profil pangkalan (contoh: *Pangkalan Berkah*, *Pangkalan Jaya Gas*).</li>
                      <li>Setiap mau menjalankan bot, cukup pilih nama pangkalan dari dropdown ➔ pilih file Excel pangkalan tersebut ➔ Klik <strong>Mulai</strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 5: CARA RESET LISENSI / TOP-UP */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-5')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>MODUL 5</span>
                <span style={styles.accordionTitle}>🔄 Cara Reset Lisensi & Top-Up Perpanjangan Kuota</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-5') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-5') && (
              <div style={styles.accordionContent}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#f87171', fontWeight: 700, margin: '0 0 8px 0' }}>Kapan Harus Reset Lisensi?</h4>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                      Jika kuota tabung NIK Anda sudah habis (misal 500/500 atau 2.000/2.000) dan Anda telah membeli paket baru di website, Anda cukup melakukan reset lisensi untuk memasukkan kode baru.
                    </p>
                  </div>

                  <div style={styles.stepBox}>
                    <h4 style={{ color: '#34d399', fontWeight: 700, margin: '0 0 8px 0' }}>Langkah Reset & Masukkan Kode Baru</h4>
                    <ol style={styles.stepList}>
                      <li>Buka menu <strong>Pengaturan</strong> di aplikasi bot.</li>
                      <li>Tekan tombol merah <strong>Reset Lisensi</strong> ➔ Konfirmasi Ya.</li>
                      <li>Aplikasi akan kembali ke layar awal aktivasi. Masukkan Kode Voucher atau License Key baru Anda.</li>
                      <li>Tekan <strong>Aktivasi</strong> ➔ Kuota tabung langsung terisi penuh kembali!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODUL 6: TROUBLESHOOTING & FAQ */}
          {/* ======================================================== */}
          <div style={styles.accordionCard} className="glass-card">
            <button onClick={() => toggleSection('modul-6')} style={styles.accordionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ ...styles.moduleBadge, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>MODUL 6</span>
                <span style={styles.accordionTitle}>🛠️ Troubleshooting & Solusi Kendala Teknis</span>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>{isExpanded('modul-6') ? '▲' : '▼'}</span>
            </button>

            {isExpanded('modul-6') && (
              <div style={styles.accordionContent}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontWeight: 700, color: '#facc15', fontSize: '0.9rem', marginBottom: '4px' }}>
                      ❓ Q: Bot sering berhenti saat HP Android di-minimize atau layar mati?
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      <strong>Solusi:</strong> Masuk ke Pengaturan HP ➔ Aplikasi ➔ MAP Bot ➔ Baterai / Penghemat Daya ➔ Pilih <strong>"Tidak Dibatasi / No Restrictions"</strong> agar fitur Background Service Mesin Ghoib berjalan lancar tanpa dimatikan oleh sistem Android.
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontWeight: 700, color: '#facc15', fontSize: '0.9rem', marginBottom: '4px' }}>
                      ❓ Q: Mengapa NIK tertentu berstatus "NIK TIDAK TERDAFTAR"?
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      <strong>Solusi:</strong> NIK tersebut memang belum didaftarkan sebagai penerima subsidi di database Pertamina Pusat. Bot akan otomatis menandai status tersebut di file Excel hasil agar Anda bisa meminta KTP/KK pelanggan untuk didaftarkan terlebih dahulu.
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontWeight: 700, color: '#facc15', fontSize: '0.9rem', marginBottom: '4px' }}>
                      ❓ Q: Bagaimana jika Captcha Subsidi Tepat sulit digeser?
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                      <strong>Solusi:</strong> Bot MAP v1.0.9 sudah dilengkapi algoritma AI Slider Captcha Solver otomatis dengan batas toleransi retry hingga 999x. Jika server sedang lambat, bot akan otomatis meminta gambar baru (refresh captcha) sampai berhasil.
                    </div>
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
