// page.tsx (src/app/download/page.tsx)
// Download Page for Bot MAP Pertamina Installer and Instructions (Vercel-optimized)

export default function DownloadPage() {
  // Gunakan variabel lingkungan NEXT_PUBLIC_DOWNLOAD_URL untuk tautan Google Drive / cloud storage eksternal
  const downloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_URL || 'https://drive.google.com/file/d/1TZeTrXRV1vtsgK55WUkLKcuE07enABFo/view?usp=drive_link';
  const androidDownloadUrl = process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL || 'https://drive.google.com/drive/folders/1YbkWYl-fxjz1BBK06X2f2reWi0JXFY-G?usp=sharing';

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
        <h2 style={styles.instructionsTitle}>Langkah Demi Langkah Cara Instalasi</h2>
        <div style={styles.stepsGrid}>
          <div style={styles.step}>
            <div style={styles.stepNum}>1</div>
            <h4 style={styles.stepTitle}>Ekstrak ZIP</h4>
            <p style={styles.stepDesc}>Klik kanan pada file <code>Bot_MAP_Pertamina_Installer.zip</code> yang telah diunduh, lalu pilih <strong>Extract All...</strong>.</p>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNum}>2</div>
            <h4 style={styles.stepTitle}>Jalankan Installer</h4>
            <p style={styles.stepDesc}>Masuk ke folder hasil ekstrak, jalankan file <code>Instal_Bot.bat</code> dengan klik kanan dan pilih <strong>Run as Administrator</strong>.</p>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNum}>3</div>
            <h4 style={styles.stepTitle}>Pasang Dependensi</h4>
            <p style={styles.stepDesc}>Skrip instalasi akan otomatis memeriksa dan memasang Microsoft VC++ Redistributable jika belum ada di PC Anda.</p>
          </div>
          <div style={styles.step}>
            <div style={styles.stepNum}>4</div>
            <h4 style={styles.stepTitle}>Aktivasi & Mulai</h4>
            <p style={styles.stepDesc}>Buka aplikasi <code>Bot_MAP_Pertamina.exe</code>, salin Hardware ID Anda untuk di-redeem di Telegram, masukkan License Key, dan mulai!</p>
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
