// page.tsx (src/app/page.tsx)
// Landing Page for Bot MAP Pertamina License Web Application

import { CONFIG } from '@/lib/config';

export default function LandingPage() {
  const pakets = Object.values(CONFIG.pakets);

  return (
    <div style={styles.container}>
      {/* 1. HERO SECTION */}
      <section style={styles.hero} className="animate-fade-in">
        <div style={styles.badge}>VERSI TERBARU v4.1 AKTIF 🚀</div>
        <h1 style={styles.heroTitle}>
          Optimalkan Distribusi Gas Anda dengan <span className="gradient-text">Bot MAP Pertamina</span>
        </h1>
        <p style={styles.heroSub}>
          Solusi otomatisasi pencatatan subsidi LPG 3Kg tercanggih. Proses ribuan NIK pelanggan langsung dari Excel secara instan, aman, dan tanpa lelah.
        </p>
        <div style={styles.heroCtas}>
          <a href="#pricing" className="btn btn-primary">Beli Lisensi Sekarang</a>
          <a href="/download" className="btn btn-secondary">Coba Demo Gratis</a>
        </div>
      </section>

      {/* 2. STATS / TRUST SECTION */}
      <section style={styles.stats}>
        <div style={styles.statCard} className="glass-card">
          <div style={styles.statVal}>99.9%</div>
          <div style={styles.statLabel}>Bypass Captcha Sukses</div>
        </div>
        <div style={styles.statCard} className="glass-card">
          <div style={styles.statVal}>&lt; 3 Detik</div>
          <div style={styles.statLabel}>Proses per NIK Pelanggan</div>
        </div>
        <div style={styles.statCard} className="glass-card">
          <div style={styles.statVal}>100%</div>
          <div style={styles.statLabel}>Aman & Terenkripsi Kriptografi</div>
        </div>
      </section>

      {/* 3. PRICING SECTION */}
      <section id="pricing" style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Pilih Paket Lisensi Anda</h2>
          <p style={styles.sectionSub}>Beli lisensi sekali aktif selamanya (Lifetime). Bebas pilih metode pembayaran otomatis (QRIS, VA, E-Wallet), langsung aktif 24/7.</p>
        </div>

        <div style={styles.pricingGrid}>
          {pakets.map((paket) => {
            const isPro = paket.id === 'PRO';
            const isEnt = paket.id === 'ENTERPRISE';
            
            return (
              <div 
                key={paket.id} 
                style={{
                  ...styles.priceCard,
                  ...(isPro ? styles.priceCardFeatured : {}),
                }} 
                className="glass-card"
              >
                {isPro && <div style={styles.featuredBadge}>TERPOPULER 🌟</div>}
                
                <div style={styles.cardHeader}>
                  <span style={styles.cardIcon}>{paket.icon}</span>
                  <h3 style={styles.cardName}>{paket.nama}</h3>
                  <p style={styles.cardDesc}>{paket.desc}</p>
                </div>

                <div style={styles.priceContainer}>
                  <div style={styles.priceVal}>
                    <span style={styles.priceCurrency}>Rp</span>
                    <span style={styles.priceNumber}>{paket.harga.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={styles.pricePeriod}>
                    Sekali Bayar / Lifetime
                  </div>
                  <div style={styles.pricePerTabung}>
                    Hanya Rp {(paket.harga / paket.kuota).toFixed(0)} per tabung
                  </div>
                </div>

                <ul style={styles.featureList}>
                  {paket.fitur.map((fitur, i) => (
                    <li key={i} style={styles.featureItem}>{fitur}</li>
                  ))}
                </ul>

                <a 
                  href={`/checkout?paket=${paket.id}`} 
                  className={`btn ${isEnt ? 'btn-success' : 'btn-primary'}`} 
                  style={styles.cardButton}
                >
                  Pilih Paket {paket.nama}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. BOT FEATURE DETAILS */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Mengapa Memilih Bot MAP Pertamina?</h2>
          <p style={styles.sectionSub}>Fitur terlengkap yang didesain khusus untuk efisiensi pangkalan dan agen gas.</p>
        </div>

        <div style={styles.featuresGrid}>
          <div style={styles.featureDetailCard} className="glass-card">
            <h4 style={styles.featureDetailTitle}>🔥 Bypass Captcha Cerdas</h4>
            <p style={styles.featureDetailDesc}>Mengintegrasikan AI captcha solver tercanggih yang memecahkan captcha secara otomatis tanpa intervensi manual operator.</p>
          </div>
          <div style={styles.featureDetailCard} className="glass-card">
            <h4 style={styles.featureDetailTitle}>📊 Multi-Batch & Auto-Resume</h4>
            <p style={styles.featureDetailDesc}>Unggah file Excel berisi ratusan NIK sekaligus. Sistem otomatis menyimpan progress, sehingga aman jika koneksi terputus.</p>
          </div>
          <div style={styles.featureDetailCard} className="glass-card">
            <h4 style={styles.featureDetailTitle}>💾 Backup Ganda & Log Excel</h4>
            <p style={styles.featureDetailDesc}>Setiap transaksi sukses dicatat ganda dan dilindungi dari file lock Excel. Otomatis membuat salinan backup berkala.</p>
          </div>
          <div style={styles.featureDetailCard} className="glass-card">
            <h4 style={styles.featureDetailTitle}>🛡️ Proteksi Anti-Tamper</h4>
            <p style={styles.featureDetailDesc}>Menggunakan enkripsi tanda tangan digital asimetris RSA-2048 yang tidak bisa dibobol atau dimodifikasi secara lokal.</p>
          </div>
        </div>
      </section>

      {/* 5. FAQ SECTION */}
      <section id="faq" style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Pertanyaan yang Sering Diajukan</h2>
          <p style={styles.sectionSub}>Menjawab keraguan Anda seputar bot dan sistem lisensi otomatis kami.</p>
        </div>

        <div style={styles.faqList}>
          <div style={styles.faqCard} className="glass-card">
            <h4 style={styles.faqQ}>Apakah lisensi ini benar-benar aktif selamanya (Lifetime)?</h4>
            <p style={styles.faqA}>Ya! Pembelian lisensi bersifat sekali bayar (One-time Payment). Lisensi akan terus aktif selamanya hingga kuota tabung NIK yang Anda beli habis digunakan.</p>
          </div>
          <div style={styles.faqCard} className="glass-card">
            <h4 style={styles.faqQ}>Bagaimana cara kerja deteksi pembayaran otomatis?</h4>
            <p style={styles.faqA}>Sistem kami terintegrasi langsung dengan Payment Gateway Midtrans. Anda bebas memilih metode pembayaran (QRIS, Virtual Account, GoPay, dll). Begitu pembayaran berhasil, Midtrans akan mengirimkan sinyal instan ke server kami untuk menerbitkan kode voucher Anda dalam hitungan detik.</p>
          </div>
          <div style={styles.faqCard} className="glass-card">
            <h4 style={styles.faqQ}>Di mana saya melakukan redeem voucher setelah bayar?</h4>
            <p style={styles.faqA}>Voucher yang muncul di website (dan dikirim otomatis ke WA Anda) harus diredeem di Bot Telegram keygen kami. Bot akan menanyakan Hardware ID komputer Anda, lalu memberikan LICENSE KEY resmi.</p>
          </div>
          <div style={styles.faqCard} className="glass-card">
            <h4 style={styles.faqQ}>Apakah saya bisa memindahkan lisensi ke komputer lain?</h4>
            <p style={styles.faqA}>Lisensi resmi dikunci berdasarkan Hardware ID (HWID) komputer Anda. Jika Anda mengalami kerusakan hardware atau ganti komputer baru, Anda dapat menghubungi Admin (@dadilan) via Telegram untuk reset HWID secara gratis.</p>
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
    gap: '80px',
  },
  hero: {
    textAlign: 'center' as const,
    maxWidth: '850px',
    margin: '0 auto',
    padding: '40px 0',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '24px',
  },
  badge: {
    fontSize: '0.85rem',
    fontWeight: 700,
    background: 'rgba(217, 91, 60, 0.1)',
    border: '1px solid rgba(217, 91, 60, 0.2)',
    color: 'hsl(194, 96%, 52%)',
    borderRadius: '30px',
    padding: '6px 16px',
    letterSpacing: '0.05em',
  },
  heroTitle: {
    fontSize: '3rem',
    fontWeight: 800,
    lineHeight: '1.15',
    color: '#ffffff',
    letterSpacing: '-0.03em',
  },
  heroSub: {
    fontSize: '1.15rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.6',
    maxWidth: '700px',
  },
  heroCtas: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  statCard: {
    textAlign: 'center' as const,
    padding: '30px',
  },
  statVal: {
    fontSize: '2.5rem',
    fontWeight: 800,
    color: '#ffffff',
    background: 'linear-gradient(135deg, hsl(194, 96%, 52%) 0%, hsl(217, 91%, 60%) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'hsl(215, 20%, 65%)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '40px',
  },
  sectionHeader: {
    textAlign: 'center' as const,
    maxWidth: '650px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '2.2rem',
    fontWeight: 800,
  },
  sectionSub: {
    fontSize: '1rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.5',
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '30px',
    alignItems: 'stretch',
  },
  priceCard: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    padding: '40px 30px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    height: '100%',
  },
  priceCardFeatured: {
    borderColor: 'rgba(217, 91, 60, 0.25)',
    background: 'rgba(217, 91, 60, 0.02)',
    boxShadow: '0 8px 40px hsla(217, 91%, 60%, 0.1)',
  },
  featuredBadge: {
    position: 'absolute' as const,
    top: '-14px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(194, 96%, 52%) 100%)',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: 800,
    borderRadius: '30px',
    padding: '4px 14px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
    letterSpacing: '0.05em',
  },
  cardHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '24px',
  },
  cardIcon: {
    fontSize: '2.5rem',
  },
  cardName: {
    fontSize: '1.5rem',
    fontWeight: 800,
  },
  cardDesc: {
    fontSize: '0.85rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.5',
  },
  priceContainer: {
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  priceVal: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  priceCurrency: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: 'hsl(215, 20%, 65%)',
  },
  priceNumber: {
    fontSize: '2.5rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  pricePeriod: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'hsl(194, 96%, 52%)',
    marginTop: '4px',
  },
  pricePerTabung: {
    fontSize: '0.8rem',
    color: 'hsl(215, 12%, 40%)',
    marginTop: '2px',
  },
  featureList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '36px',
  },
  featureItem: {
    fontSize: '0.9rem',
    color: 'hsl(210, 40%, 98%)',
  },
  cardButton: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
  },
  featureDetailCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  featureDetailTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
  },
  featureDetailDesc: {
    fontSize: '0.9rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.5',
  },
  faqList: {
    maxWidth: '850px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    width: '100%',
  },
  faqCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  faqQ: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  faqA: {
    fontSize: '0.9rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.6',
  },
};
