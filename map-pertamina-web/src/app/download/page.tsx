// page.tsx (src/app/download/page.tsx)
// Download Page for Bot MAP Pertamina Installer and Instructions (v1.0.9)

export default function DownloadPage() {
  const downloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_URL || 'https://drive.google.com/drive/folders/1Y2aWbsPPDtrsdfMdY1DTX_1sp_XZk-Ou?usp=sharing';
  const androidDownloadUrl = process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL || 'https://github.com/TheMask112/Map_Pertamina_Bot/releases/download/v1.0.9/MAP_Pertamina_Bot_v1.0.9.apk';

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <div style={styles.icon}>📥</div>
        <h1 style={styles.title}>Unduh Bot MAP Pertamina</h1>
        <p style={styles.subtitle}>Unduh aplikasi resmi versi stabil terbaru v1.0.9 untuk Windows dan Android.</p>
      </div>

      <div style={styles.downloadGrid}>
        {/* WINDOWS DOWNLOAD CARD */}
        <div style={styles.card} className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={styles.cardTitle}>Versi Windows Desktop</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              v1.0.9 (Stabil)
            </span>
          </div>

          <div style={styles.versionInfo}>
            <span>Tipe: <strong>Portable EXE / ZIP Package</strong></span>
            <span>Ukuran: <strong>~180 MB</strong></span>
            <span>Wilayah: <strong>514 Kab/Kota Kemendagri</strong></span>
          </div>

          <p style={styles.preBundledNotice}>
            📦 <strong>ALL-IN-ONE PACKAGE:</strong> Sudah dibundel lengkap dengan engine Chromium & Database Wilayah resmi Kemendagri 38 Provinsi.
          </p>

          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary pulse" style={styles.downloadBtn}>
            💾 Unduh Installer (.zip)
          </a>
          <span style={styles.safetyBadge}>🛡️ Cloud Storage Aman (Google Drive)</span>
        </div>

        {/* ANDROID DOWNLOAD CARD */}
        <div style={styles.card} className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={styles.cardTitle}>Versi Aplikasi Android</h2>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              v1.0.9 Terbaru
            </span>
          </div>

          <div style={styles.versionInfo}>
            <span>Tipe: <strong>APK Installer</strong></span>
            <span>Ukuran: <strong>~134 MB</strong></span>
            <span>Fitur: <strong>Multi-Pangkalan & Background Service</strong></span>
          </div>

          <p style={{...styles.preBundledNotice, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)'}}>
            🚀 <strong>MESIN GHOIB:</strong> Berjalan di latar belakang (Minimize aman tanpa terputus) + Auto-Bypass Captcha.
          </p>

          <a href={androidDownloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary pulse" style={{...styles.downloadBtn, background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'}}>
            💾 Unduh APK Android (v1.0.9)
          </a>
          <span style={styles.safetyBadge}>🛡️ Unduhan Resmi & Cepat (GitHub Releases)</span>
        </div>

        {/* SYSTEM REQUIREMENTS CARD */}
        <div style={styles.card} className="glass-card">
          <h2 style={styles.cardTitle}>Persyaratan Sistem</h2>
          <div style={styles.requirements}>
            <div style={styles.reqItem}>
              <strong>Sistem Operasi</strong>
              <span>Windows 10 / 11 (64-bit) atau Android 8.0 ke atas</span>
            </div>
            <div style={styles.reqItem}>
              <strong>RAM / Memori</strong>
              <span>Minimal 3 GB RAM (HP Android / Laptop)</span>
            </div>
            <div style={styles.reqItem}>
              <strong>Format Excel</strong>
              <span>File .xlsx dengan kolom NIK pelanggan</span>
            </div>
            <div style={styles.reqItem}>
              <strong>Koneksi Internet</strong>
              <span>Koneksi internet aktif untuk Subsidi Tepat Pertamina</span>
            </div>
          </div>
        </div>
      </div>

      {/* PANDUAN KHUSUS MULTI-PANGKALAN & EXCEL */}
      <section style={{ ...styles.instructionsSection, border: '1px solid rgba(234, 179, 8, 0.3)', background: 'linear-gradient(180deg, rgba(234, 179, 8, 0.05) 0%, rgba(15, 23, 42, 0.6) 100%)' }} className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '1.8rem' }}>🏢</span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#facc15', margin: 0 }}>
            Panduan Fitur Multi-Pangkalan & Penggunaan File Excel
          </h2>
        </div>
        <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.6 }}>
          Fitur eksklusif untuk pemilik pangkalan dan agen yang mengelola beberapa akun pangkalan sekaligus dalam satu perangkat:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', textAlign: 'left' }}>
          {/* KARTU 1: LOGIN OTOMATIS */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8', marginBottom: '10px' }}>
              🔑 1. Pengisian Akun Hanya 1x (Auto-Relogin)
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              Nomor HP dan Password/PIN akun MAP dimasukkan <strong>hanya 1 kali</strong> saat Anda membuat profil pangkalan. 
              Jika di tengah proses transaksi sesi Pertamina keluar sendiri (<em>session expired</em>), 
              <strong> bot otomatis login ulang</strong> menggunakan data akun pangkalan aktif tanpa perlu Anda ketik manual.
            </p>
          </div>

          {/* KARTU 2: MANAJEMEN EXCEL */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#34d399', marginBottom: '10px' }}>
              📊 2. File Excel Terpisah per Pangkalan
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              Gunakan file Excel logbook masing-masing untuk setiap pangkalan (contoh: <code>Logbook_Pangkalan_A.xlsx</code> dan <code>Logbook_Pangkalan_B.xlsx</code>). 
              Cukup pilih nama pangkalan di dropdown $\rightarrow$ pilih file Excel pangkalan tersebut $\rightarrow$ jalankan bot. 
              Data logbook dijamin <strong>100% rapi dan tidak akan tertukar</strong> antar-pangkalan.
            </p>
          </div>

          {/* KARTU 3: BERALIH 1 KLIK */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f472b6', marginBottom: '10px' }}>
              ⚡ 3. Ganti Pangkalan dalam 1 Klik
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              Setelah pangkalan pertama selesai diproses, Anda cukup memilih nama pangkalan kedua pada kartu <strong>Pangkalan Aktif</strong> di aplikasi. 
              Bot akan langsung berganti sesi dan siap memproses file Excel pangkalan berikutnya.
            </p>
          </div>
        </div>
      </section>

      {/* INSTALLATION STEPS */}
      <section style={styles.instructionsSection} className="glass-card">
        <h2 style={styles.instructionsTitle}>Panduan Mudah Cara Pasang & Pemakaian Bot</h2>
        <p style={{ color: 'hsl(215, 20%, 65%)', fontSize: '0.95rem', marginBottom: '32px' }}>
          Ikuti 4 langkah sederhana berikut untuk mulai menjalankan transaksi otomatis di perangkat Anda:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', textAlign: 'left' }}>
          {/* PANDUAN WINDOWS */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '14px', border: '1px solid rgba(56,189,248,0.2)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💻 Panduan Windows Desktop (Laptop / PC)
            </h3>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.5' }}>
              <li>
                <strong>Unduh File ZIP:</strong> Klik tombol <em>Unduh Installer (.zip)</em> di atas.
              </li>
              <li>
                <strong>Ekstrak File:</strong> Klik kanan pada file <code>Bot_MAP_Pertamina_Installer.zip</code> yang telah diunduh, lalu pilih <strong>Extract All... (Ekstrak Semua)</strong>.
              </li>
              <li>
                <strong>Instal Awal (Hanya 1x):</strong> Buka folder hasil ekstrak, klik kanan file <code>Instal_Bot.bat</code> lalu pilih <strong>Run as administrator</strong>.
              </li>
              <li>
                <strong>Jalankan & Masukkan Lisensi:</strong> Buka <code>Bot_MAP_Pertamina.exe</code>, masukkan kunci lisensi Anda, pilih file Excel pelanggan, dan klik <strong>Mulai Transaksi</strong>.
              </li>
            </ol>
          </div>

          {/* PANDUAN ANDROID */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '14px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📱 Panduan Aplikasi Android (HP)
            </h3>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.5' }}>
              <li>
                <strong>Unduh File APK:</strong> Klik tombol <em>Unduh APK Android (v1.0.9)</em> di atas.
              </li>
              <li>
                <strong>Pasang di HP:</strong> Buka file APK yang sudah selesai diunduh di HP Anda, lalu tekan <strong>Install / Pasang</strong>.
              </li>
              <li>
                <strong>Izin Keamanan:</strong> Jika muncul peringatan <em>"Aplikasi dari sumber tidak dikenal"</em>, pilih <strong>Izinkan / Tetap Pasang (Install Anyway)</strong>.
              </li>
              <li>
                <strong>Aktivasi & Pilih File:</strong> Buka aplikasi, masukkan lisensi Anda, pilih pangkalan aktif dan file Excel, lalu tekan <strong>Buka Layar Bot</strong> untuk menjalankan proses otomatis.
              </li>
            </ol>
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
    gap: '40px',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '30px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    padding: '36px 30px',
    gap: '20px',
  },
  cardTitle: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  versionInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '10px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.03)',
    fontSize: '0.9rem',
    color: 'hsl(215, 20%, 65%)',
  },
  preBundledNotice: {
    fontSize: '0.85rem',
    color: 'hsl(194, 96%, 52%)',
    lineHeight: '1.5',
    background: 'rgba(6, 182, 212, 0.05)',
    border: '1px dashed rgba(6, 182, 212, 0.25)',
    borderRadius: '10px',
    padding: '14px',
  },
  downloadBtn: {
    width: '100%',
    padding: '16px',
    textAlign: 'center' as const,
    fontWeight: 700,
    textDecoration: 'none',
  },
  safetyBadge: {
    fontSize: '0.8rem',
    color: 'hsl(215, 20%, 65%)',
    textAlign: 'center' as const,
  },
  requirements: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  reqItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    fontSize: '0.88rem',
    color: 'hsl(215, 20%, 65%)',
  },
  instructionsSection: {
    padding: '40px 30px',
    textAlign: 'center' as const,
  },
  instructionsTitle: {
    fontSize: '1.8rem',
    fontWeight: 800,
    marginBottom: '12px',
    color: '#ffffff',
  },
};
