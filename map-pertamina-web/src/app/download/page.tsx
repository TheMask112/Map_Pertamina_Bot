// page.tsx (src/app/download/page.tsx)
// Download Page for Bot MAP Pertamina Installer and Instructions (Vercel-optimized)

export default function DownloadPage() {
  // Gunakan variabel lingkungan NEXT_PUBLIC_DOWNLOAD_URL untuk tautan Google Drive / cloud storage eksternal
  const downloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_URL || 'https://drive.google.com/drive/folders/1Y2aWbsPPDtrsdfMdY1DTX_1sp_XZk-Ou?usp=sharing';
  const androidDownloadUrl = process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL || 'https://github.com/TheMask112/Map_Pertamina_Bot/releases/download/v1.0.6/MAP_Pertamina_Bot_v1.0.6.apk';

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <div style={styles.icon}>📥</div>
        <h1 style={styles.title}>Unduh Bot MAP Pertamina</h1>
        <p style={styles.subtitle}>Unduh aplikasi resmi versi stabil terbaru untuk Windows dan Android.</p>
      </div>

      <div style={styles.downloadGrid}>
        {/* WINDOWS DOWNLOAD CARD */}
        <div style={styles.card} className="glass-card">
          <h2 style={styles.cardTitle}>Versi Windows Desktop</h2>
          <div style={styles.versionInfo}>
            <span>Tipe: <strong>ZIP Archive</strong></span>
            <span>Ukuran: <strong>~200 MB</strong></span>
            <span>Rilis: <strong>v4.1 (Stabil)</strong></span>
          </div>

          <p style={styles.preBundledNotice}>
            📦 <strong>ALL-IN-ONE PACKAGE:</strong> Telah dibundel lengkap dengan <strong>VC++ Redistributable</strong> dan <strong>Chromium</strong>.
          </p>

          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary pulse" style={styles.downloadBtn}>
            💾 Unduh Installer (.zip)
          </a>
          <span style={styles.safetyBadge}>🛡️ Cloud Storage Aman (Google Drive)</span>
        </div>

        {/* ANDROID DOWNLOAD CARD */}
        <div style={styles.card} className="glass-card">
          <h2 style={styles.cardTitle}>Versi Aplikasi Android</h2>
          <div style={styles.versionInfo}>
            <span>Tipe: <strong>APK Installer</strong></span>
            <span>Ukuran: <strong>~135 MB</strong></span>
            <span>Rilis: <strong>Terbaru (Background Service)</strong></span>
          </div>

          <p style={{...styles.preBundledNotice, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)'}}>
            🚀 <strong>MESIN GHOIB:</strong> Mendukung fitur background service (Minimize aman, tidak putus koneksi).
          </p>

          <a href={androidDownloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary pulse" style={{...styles.downloadBtn, background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'}}>
            💾 Unduh APK Android
          </a>
          <span style={styles.safetyBadge}>🛡️ Cloud Storage Aman (Google Drive)</span>
        </div>

        {/* SYSTEM REQUIREMENTS CARD */}
        <div style={styles.card} className="glass-card">
          <h2 style={styles.cardTitle}>Persyaratan Sistem</h2>
          <div style={styles.requirements}>
            <div style={styles.reqItem}>
              <strong>Sistem Operasi</strong>
              <span>Windows 10 atau Windows 11 (64-bit saja)</span>
            </div>
            <div style={styles.reqItem}>
              <strong>RAM / Memori</strong>
              <span>Minimal 4 GB (Direkomendasikan 8 GB untuk multi-batch)</span>
            </div>
            <div style={styles.reqItem}>
              <strong>Penyimpanan</strong>
              <span>Sisa ruang minimal 500 MB untuk browser cache</span>
            </div>
            <div style={styles.reqItem}>
              <strong>Koneksi Internet</strong>
              <span>Koneksi stabil (dibutuhkan untuk bypass captcha & Pertamina API)</span>
            </div>
          </div>
        </div>
      </div>

      {/* INSTALLATION STEPS */}
      <section style={styles.instructionsSection} className="glass-card">
        <h2 style={styles.instructionsTitle}>Panduan Mudah Cara Pasang & Pakai</h2>
        <p style={{ color: 'hsl(215, 20%, 65%)', fontSize: '0.95rem', marginBottom: '32px' }}>
          Ikuti langkah mudah di bawah ini untuk mulai menjalankan bot di perangkat Anda:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', textAlign: 'left' }}>
          {/* PANDUAN WINDOWS */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '14px', border: '1px solid rgba(56,189,248,0.2)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              💻 Panduan Windows Desktop (Laptop/PC)
            </h3>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', color: '#e2e8f0', lineHeight: '1.5' }}>
              <li>
                <strong>Unduh File ZIP:</strong> Klik tombol <em>Unduh Installer (.zip)</em> di atas untuk masuk ke Google Drive, lalu unduh filenya.
              </li>
              <li>
                <strong>Ekstrak File:</strong> Klik kanan pada file <code>Bot_MAP_Pertamina_Installer.zip</code> yang sudah diunduh, lalu pilih <strong>Extract All... (Ekstrak Semua)</strong>.
              </li>
              <li>
                <strong>Instal Awal (Hanya 1x):</strong> Buka folder hasil ekstrak, klik kanan file <code>Instal_Bot.bat</code> lalu pilih <strong>Run as administrator</strong>. Tunggu sampai selesai.
              </li>
              <li>
                <strong>Jalankan Bot:</strong> Klik 2x pada <code>Bot_MAP_Pertamina.exe</code>. Salin Hardware ID Anda untuk aktivasi lisensi, dan bot langsung siap memproses NIK dari Excel!
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
                <strong>Unduh File APK:</strong> Klik tombol <em>Unduh APK Android</em> di atas untuk masuk ke Google Drive, lalu download file <code>MAP_Pertamina_Bot_v1.0.1.apk</code>.
              </li>
              <li>
                <strong>Pasang di HP:</strong> Buka file APK yang sudah selesai diunduh, lalu tekan <strong>Install / Pasang</strong>.
              </li>
              <li>
                <strong>Izin Keamanan:</strong> Jika muncul jendela <em>"Aplikasi dari sumber tidak dikenal"</em>, pilih <strong>Izinkan / Tetap Pasang (Install Anyway)</strong>.
              </li>
              <li>
                <strong>Buka & Aktivasi:</strong> Buka aplikasi di HP Anda, masukkan lisensi Anda, dan mulai proses transaksi NIK kapan saja!
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
    maxWidth: '900px',
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
    fontSize: '1.4rem',
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
    fontSize: '1.05rem',
    borderRadius: '12px',
    textAlign: 'center' as const,
  },
  safetyBadge: {
    fontSize: '0.75rem',
    color: 'hsl(215, 12%, 40%)',
    textAlign: 'center' as const,
  },
  requirements: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  reqItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    fontSize: '0.9rem',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    paddingBottom: '12px',
  },
  instructionsSection: {
    padding: '40px',
    textAlign: 'center' as const,
  },
  instructionsTitle: {
    fontSize: '1.8rem',
    fontWeight: 800,
    marginBottom: '30px',
  },
  stepsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '30px',
    textAlign: 'left' as const,
  },
  step: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  stepNum: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(194, 96%, 52%) 100%)',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '1rem',
  },
  stepTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
  },
  stepDesc: {
    fontSize: '0.85rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.5',
  },
};
