'use client';

// page.tsx (src/app/page.tsx)
// Landing Page for Bot MAP Pertamina - Solusi Otomatisasi Transaksi Subsidi Tepat LPG (With Dynamic Affiliate Pricing)

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CONFIG } from '@/lib/config';

function LandingPageContent() {
  const searchParams = useSearchParams();
  const [affiliateInfo, setAffiliateInfo] = useState<any>(null);

  useEffect(() => {
    let ref = searchParams.get('ref');
    if (!ref && typeof document !== 'undefined') {
      const match = document.cookie.match(/affiliate_ref=([^;]+)/);
      if (match) ref = match[1];
    }

    if (ref) {
      const cleanRef = ref.trim().toUpperCase();
      // Simpan ke cookie 30 hari
      if (typeof document !== 'undefined') {
        document.cookie = `affiliate_ref=${cleanRef}; path=/; max-age=2592000; SameSite=Lax`;
      }

      fetch(`/api/affiliate/info?code=${encodeURIComponent(cleanRef)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.success && data?.affiliate) {
            setAffiliateInfo(data.affiliate);
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  const pakets = Object.values(CONFIG.pakets);
  const markupPercent = affiliateInfo ? (affiliateInfo.markupPercent || 0) : 0;

  return (
    <div style={styles.container}>
      {/* AFFILIATE MITRA BANNER (HANYA MUNCUL JIKA LEWAT LINK AFFILIATOR) */}
      {affiliateInfo && (
        <div style={styles.affiliateBanner} className="animate-fade-in">
          <div style={styles.affiliateBannerContent}>
            <span>
              🤝 Direkomendasikan oleh Mitra Resmi: <strong>{affiliateInfo.name}</strong> (Kode: <code>{affiliateInfo.code}</code>)
            </span>
            {affiliateInfo.whatsapp && (() => {
              let cleanWa = String(affiliateInfo.whatsapp).replace(/\D/g, '');
              if (cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.slice(1);
              else if (cleanWa.startsWith('8')) cleanWa = '62' + cleanWa;
              return (
                <a
                  href={`https://wa.me/${cleanWa}?text=Halo%20Pak%20${encodeURIComponent(affiliateInfo.name)},%20saya%20tertarik%20dengan%20Bot%20MAP%20Pertamina`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.affiliateWaBtn}
                >
                  💬 Butuh Bantuan Pasang? Chat WA ({affiliateInfo.whatsapp})
                </a>
              );
            })()}
          </div>
        </div>
      )}

      {/* 1. HERO SECTION */}
      <section style={styles.hero} className="animate-fade-in">
        <div style={styles.badge}>🚀 UPDATE TERBARU: AUTO-FILL TEMPAT & TANGGAL LAHIR NIK</div>
        <h1 style={styles.heroTitle}>
          Capek Input NIK Satu per Satu? Biarkan <span className="gradient-text">Bot MAP Pertamina</span> yang Bekerja Otomatis!
        </h1>
        <p style={styles.heroSub}>
          Aplikasi pintar khusus Pangkalan & Agen Gas LPG 3Kg untuk memproses ribuan transaksi Subsidi Tepat MyPertamina dari file Excel secara <strong>otomatis, cepat, anti-ribet, dan bebas lelah</strong>.
        </p>
        <div style={styles.heroCtas}>
          <a href="#pricing" className="btn btn-primary" style={{ padding: '16px 28px', fontSize: '1rem', fontWeight: 700 }}>
            🛒 Beli Kuota Lisensi
          </a>
          <a href="#cara-kerja" className="btn btn-secondary" style={{ padding: '16px 28px', fontSize: '1rem' }}>
            📖 Lihat Cara Pakai
          </a>
          <a href="/download" className="btn" style={{ padding: '16px 24px', fontSize: '0.95rem', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>
            📥 Unduh Aplikasi
          </a>
        </div>
      </section>

      {/* 2. CERITA MASALAH & SOLUSI PANGKALAN */}
      <section style={styles.storySection} className="glass-card">
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>😫 ➔ 😌</span>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '10px', color: '#fff' }}>
            Apakah Anda Mengalami Masalah Ini Setiap Hari?
          </h2>
          <div style={styles.problemGrid}>
            <div style={styles.problemItem}>
              <div style={styles.problemIcon}>❌</div>
              <div><strong>Mata lelah & tangan pegal</strong> mengetik NIK manual ratusan kali di website Subsidi Tepat.</div>
            </div>
            <div style={styles.problemItem}>
              <div style={styles.problemIcon}>❌</div>
              <div><strong>Stres dengan Puzzle Captcha geser</strong> yang sering gagal dan bikin transaksi macet.</div>
            </div>
            <div style={styles.problemItem}>
              <div style={styles.problemIcon}>❌</div>
              <div><strong>Form baru Pertamina makin ribet</strong> meminta Tempat Lahir & Tanggal Lahir pelanggan.</div>
            </div>
            <div style={styles.problemItem}>
              <div style={styles.problemIcon}>❌</div>
              <div><strong>Waktu terbuang seharian</strong> di depan komputer hanya untuk input data jatah gas.</div>
            </div>
          </div>

          <div style={styles.solutionBox}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8', marginBottom: '8px' }}>
              💡 Solusi Praktis: Tinggal Masukkan Excel, Klik Mulai, Selesai!
            </h3>
            <p style={{ color: 'hsl(215, 20%, 80%)', fontSize: '0.95rem', lineHeight: '1.6' }}>
              Dengan <strong>Bot MAP Pertamina</strong>, Anda cukup sediakan daftar NIK di Excel. Bot akan otomatis membuka browser, mengisi form, memecahkan captcha puzzle sendiri, membaca tanggal lahir dari NIK, dan mencatat transaksi hingga lunas tanpa perlu ditunggui!
            </p>
          </div>
        </div>
      </section>

      {/* 3. CARA PENGGUNAAN MUDAH */}
      <section id="cara-kerja" style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.badgeSmall}>SANGAT MUDAH</div>
          <h2 style={styles.sectionTitle}>Hanya 3 Langkah Mudah Menggunakan Bot</h2>
          <p style={styles.sectionSub}>Tidak butuh keahlian komputer tinggi. Siapa pun bisa langsung pakai dalam 2 menit!</p>
        </div>

        <div style={styles.stepsGridModern}>
          <div style={styles.stepCard} className="glass-card">
            <div style={styles.stepHeader}>
              <div style={styles.stepBadgeNum}>1</div>
              <div style={styles.stepHeaderIcon}>📂</div>
            </div>
            <h3 style={styles.stepCardTitle}>Siapkan File Excel NIK</h3>
            <p style={styles.stepCardDesc}>
              Buka Excel, masukkan nomor NIK pelanggan di kolom pertama. Anda bisa memasukkan 10, 100, hingga ribuan NIK sekaligus.
            </p>
            <div style={styles.stepTip}>
              💡 <em>Contoh template Excel sudah disediakan di aplikasi.</em>
            </div>
          </div>

          <div style={styles.stepCard} className="glass-card">
            <div style={styles.stepHeader}>
              <div style={styles.stepBadgeNum}>2</div>
              <div style={styles.stepHeaderIcon}>🔑</div>
            </div>
            <h3 style={styles.stepCardTitle}>Buka Bot & Login Akun</h3>
            <p style={styles.stepCardDesc}>
              Buka aplikasi Bot di Laptop (Windows) atau HP (Android). Masukkan nomor HP & kata sandi Merchant Pertamina Anda.
            </p>
            <div style={styles.stepTip}>
              🔒 <em>Akun tersimpan aman di perangkat lokal Anda sendiri.</em>
            </div>
          </div>

          <div style={styles.stepCard} className="glass-card">
            <div style={styles.stepHeader}>
              <div style={styles.stepBadgeNum}>3</div>
              <div style={styles.stepHeaderIcon}>🚀</div>
            </div>
            <h3 style={styles.stepCardTitle}>Klik 'Mulai' & Duduk Santai</h3>
            <p style={styles.stepCardDesc}>
              Tekan tombol <strong>Mulai Transaksi</strong>. Bot akan memproses seluruh NIK secara otomatis, melewati captcha, dan menyimpan laporan sukses ke Excel!
            </p>
            <div style={styles.stepTip}>
              ☕ <em>Bisa Anda tinggal ngopi atau melayani pembeli fisik.</em>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DUA PILIHAN APLIKASI (WINDOWS & ANDROID) */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Pilih Perangkat Sesuai Kebutuhan Anda</h2>
          <p style={styles.sectionSub}>Gunakan di Laptop/PC untuk proses partai besar, atau di HP Android saat bepergian.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '30px', borderLeft: '4px solid #38bdf8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💻</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Versi Windows Desktop (.exe)</h3>
            <p style={{ color: 'hsl(215, 20%, 65%)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '16px' }}>
              Cocok untuk pangkalan besar yang mengolah ribuan NIK per hari. Layar interaktif, visual browser langsung terlihat, dan fitur multi-batch antrean tanpa batas.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '20px' }}>
              <li>✔ Tampilan GUI modern & mudah dioperasikan</li>
              <li>✔ AI Captcha Solver otomatis super presisi</li>
              <li>✔ Kompatibel Windows 10 & 11 (64-bit)</li>
            </ul>
            <a href="/download" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>Unduh Versi Windows</a>
          </div>

          <div className="glass-card" style={{ padding: '30px', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📱</div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Versi Android (.apk)</h3>
            <p style={{ color: 'hsl(215, 20%, 65%)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '16px' }}>
              Praktis dalam genggaman. Dilengkapi teknologi <strong>Background Service</strong> sehingga bot tetap berjalan memproses transaksi meskipun aplikasi diminimize atau HP dikunci.
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#e2e8f0', marginBottom: '20px' }}>
              <li>✔ Berjalan di latar belakang tanpa panas/macet</li>
              <li>✔ Kirim laporan rekap otomatis ke Telegram</li>
              <li>✔ Kompatibel Android 8.0 hingga Android 14+</li>
            </ul>
            <a href="/download" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center', borderColor: '#10b981', color: '#34d399' }}>Unduh Versi Android</a>
          </div>
        </div>
      </section>

      {/* 5. PRICING SECTION (DYNAMIC ACCORDING TO AFFILIATE MARKUP) */}
      <section id="pricing" style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.badgeSmall}>HARGA TERJANGKAU</div>
          <h2 style={styles.sectionTitle}>Pilih Paket Kuota Lisensi</h2>
          <p style={styles.sectionSub}>Beli kuota sekali aktif selamanya (Lifetime). Pembayaran otomatis 24/7 via QRIS, BCA, Mandiri, BRI, Dana, GoPay.</p>
        </div>

        <div style={styles.pricingGrid}>
          {pakets.map((paket) => {
            const isPro = paket.id === 'PRO';
            const isEnt = paket.id === 'ENTERPRISE';
            const finalPrice = Math.round(paket.harga * (1 + markupPercent / 100));
            const checkoutUrl = affiliateInfo
              ? `/checkout?paket=${paket.id}&ref=${encodeURIComponent(affiliateInfo.code)}`
              : `/checkout?paket=${paket.id}`;
            
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
                    <span style={styles.priceNumber}>{finalPrice.toLocaleString('id-ID')}</span>
                  </div>
                  <div style={styles.pricePeriod}>
                    Sekali Bayar / Lifetime
                  </div>
                  <div style={styles.pricePerTabung}>
                    Hanya Rp {(finalPrice / paket.kuota).toFixed(0)} per tabung
                  </div>
                </div>

                <ul style={styles.featureList}>
                  {paket.fitur.map((fitur, i) => (
                    <li key={i} style={styles.featureItem}>{fitur}</li>
                  ))}
                </ul>

                <a 
                  href={checkoutUrl} 
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

      {/* 6. FITUR DETAIL */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.badgeSmall}>KEUNGGULAN</div>
          <h2 style={styles.sectionTitle}>Mengapa Bot MAP Pertamina Jadi Pilihan Utama Pangkalan?</h2>
          <p style={styles.sectionSub}>Fitur lengkap dan canggih yang dirancang khusus untuk mempermudah operasional harian Anda.</p>
        </div>

        <div style={styles.featuresGrid}>
          <div style={styles.featureDetailCard} className="glass-card">
            <h4 style={styles.featureDetailTitle}>🧩 AI Captcha Auto-Solver</h4>
            <p style={styles.featureDetailDesc}>Teknologi computer vision membaca posisi puzzle captcha geser dan menggesernya dengan kurva gerakan tangan manusia (anti-bot detection).</p>
          </div>
          <div style={styles.featureDetailCard} className="glass-card">
            <h4 style={styles.featureDetailTitle}>🎂 Auto-Fill Tempat & Tanggal Lahir</h4>
            <p style={styles.featureDetailDesc}>Sistem otomatis membedah struktur 16 digit NIK pelanggan untuk mengisi data tempat & tanggal lahir Dukcapil secara akurat.</p>
          </div>
          <div style={styles.featureDetailCard} className="glass-card">
            <h4 style={styles.featureDetailTitle}>🔄 Auto-Recovery & Smart Resume</h4>
            <p style={styles.featureDetailDesc}>Jika internet sempat putus, bot otomatis menyimpan sisa antrean NIK yang belum selesai. Anda bisa melanjutkannya kapan saja tanpa risiko transaksi ganda.</p>
          </div>
          <div style={styles.featureDetailCard} className="glass-card">
            <h4 style={styles.featureDetailTitle}>📑 Laporan Excel & Notifikasi Telegram</h4>
            <p style={styles.featureDetailDesc}>Hasil transaksi langsung dikelompokkan ke file <code>sukses.xlsx</code> dan <code>gagal.xlsx</code>, serta otomatis dikirimkan ke bot Telegram pangkalan Anda.</p>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section id="faq" style={styles.section}>
        <div style={styles.sectionHeader}>
          <div style={styles.badgeSmall}>TANYA JAWAB</div>
          <h2 style={styles.sectionTitle}>Pertanyaan yang Sering Diajukan (FAQ)</h2>
          <p style={styles.sectionSub}>Jawaban lengkap dan jelas untuk pertanyaan seputar penggunaan bot dan lisensi.</p>
        </div>

        <div style={styles.faqList}>
          <div style={styles.faqCard} className="glass-card">
            <h4 style={styles.faqQ}>❓ Apakah lisensi ini ada masa berlakunya / langganan bulanan?</h4>
            <p style={styles.faqA}><strong>Tidak ada batas waktu (Lifetime)!</strong> Pembelian kuota bersifat sekali bayar. Kuota tabung NIK yang Anda beli akan tetap aktif selamanya sampai kuota tersebut habis Anda gunakan.</p>
          </div>
          <div style={styles.faqCard} className="glass-card">
            <h4 style={styles.faqQ}>❓ Bagaimana jika website Pertamina meminta Tempat Lahir & Tanggal Lahir?</h4>
            <p style={styles.faqA}>Bot versi terbaru sudah <strong>100% otomatis mendeteksi dan mengisi data kelahiran</strong> dari 16 digit NIK pelanggan Anda. Anda tidak perlu repot mencari atau mengetik tanggal lahir secara manual.</p>
          </div>
          <div style={styles.faqCard} className="glass-card">
            <h4 style={styles.faqQ}>❓ Setelah saya transfer / bayar QRIS, bagaimana cara mengaktifkan lisensinya?</h4>
            <p style={styles.faqA}>Begitu pembayaran berhasil, kode lisensi langsung muncul di layar checkout dan dikirim ke WhatsApp Anda. Buka Bot di Laptop atau HP Anda, tempelkan kodenya ke kolom Lisensi, lalu klik <strong>Aktivasi</strong>. Bot langsung siap digunakan!</p>
          </div>
        </div>
      </section>

      {/* 8. AFFILIATE FOOTER PROMO BOX */}
      <section style={styles.affiliateFooterBox} className="glass-card">
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <span style={{ fontSize: '2.5rem' }}>💼 🤝 💰</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', marginTop: '12px', marginBottom: '8px' }}>
            Ingin Dapat Penghasilan Tambahan dari Bot MAP Pertamina?
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '20px' }}>
            Bergabunglah menjadi <strong>Mitra Affiliate / Reseller Resmi</strong>. Atur harga markup Anda sendiri dan dapatkan komisi langsung cair ke rekening / e-wallet Anda!
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <Link href="/affiliate/register" className="btn btn-primary" style={{ padding: '12px 24px', fontWeight: 800 }}>
              🚀 Gabung Jadi Mitra Affiliate
            </Link>
            <Link href="/affiliate/login" className="btn btn-secondary" style={{ padding: '12px 20px', fontWeight: 700 }}>
              🔐 Login Dashboard Mitra
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#38bdf8' }}>Memuat...</div>}>
      <LandingPageContent />
    </Suspense>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '80px',
  },
  affiliateBanner: {
    background: 'linear-gradient(90deg, rgba(14, 165, 233, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    borderRadius: '16px',
    padding: '16px 20px',
    marginTop: '-20px',
  },
  affiliateBannerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '12px',
    fontSize: '0.92rem',
    color: '#e2e8f0',
  },
  affiliateWaBtn: {
    padding: '8px 16px',
    borderRadius: '20px',
    background: '#10b981',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.82rem',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  },
  hero: {
    textAlign: 'center' as const,
    maxWidth: '850px',
    margin: '0 auto',
    padding: '40px 0 20px 0',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '24px',
  },
  badge: {
    fontSize: '0.85rem',
    fontWeight: 700,
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    borderRadius: '30px',
    padding: '8px 18px',
    letterSpacing: '0.04em',
  },
  badgeSmall: {
    fontSize: '0.75rem',
    fontWeight: 800,
    color: '#38bdf8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: '4px',
  },
  heroTitle: {
    fontSize: '2.8rem',
    fontWeight: 800,
    lineHeight: '1.2',
    color: '#ffffff',
    letterSpacing: '-0.03em',
  },
  heroSub: {
    fontSize: '1.1rem',
    color: 'hsl(215, 20%, 75%)',
    lineHeight: '1.6',
    maxWidth: '720px',
  },
  heroCtas: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    gap: '14px',
    marginTop: '8px',
  },
  storySection: {
    padding: '40px 30px',
    background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(56, 189, 248, 0.2)',
  },
  problemGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
    margin: '30px 0',
    textAlign: 'left' as const,
  },
  problemItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '0.9rem',
    color: 'hsl(215, 20%, 85%)',
    lineHeight: '1.4',
  },
  problemIcon: {
    fontSize: '1.2rem',
  },
  solutionBox: {
    background: 'rgba(56, 189, 248, 0.08)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    padding: '24px',
    borderRadius: '16px',
    textAlign: 'left' as const,
    marginTop: '20px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '30px',
  },
  sectionHeader: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
  },
  sectionTitle: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  sectionSub: {
    fontSize: '0.95rem',
    color: 'hsl(215, 20%, 65%)',
    maxWidth: '600px',
  },
  stepsGridModern: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
  },
  stepCard: {
    padding: '28px 24px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  stepHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepBadgeNum: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#38bdf8',
    color: '#0f172a',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepHeaderIcon: {
    fontSize: '1.8rem',
  },
  stepCardTitle: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#fff',
  },
  stepCardDesc: {
    fontSize: '0.9rem',
    color: 'hsl(215, 20%, 75%)',
    lineHeight: '1.5',
  },
  stepTip: {
    fontSize: '0.8rem',
    color: '#38bdf8',
    marginTop: 'auto',
    paddingTop: '8px',
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  priceCard: {
    padding: '36px 28px',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    position: 'relative' as const,
  },
  priceCardFeatured: {
    border: '2px solid #38bdf8',
    transform: 'scale(1.02)',
  },
  featuredBadge: {
    position: 'absolute' as const,
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#38bdf8',
    color: '#0f172a',
    fontSize: '0.75rem',
    fontWeight: 800,
    padding: '4px 14px',
    borderRadius: '20px',
  },
  cardHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  cardIcon: {
    fontSize: '2rem',
  },
  cardName: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#fff',
  },
  cardDesc: {
    fontSize: '0.85rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.4',
  },
  priceContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  priceVal: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  priceCurrency: {
    fontSize: '1.2rem',
    fontWeight: 700,
    color: '#38bdf8',
  },
  priceNumber: {
    fontSize: '2.4rem',
    fontWeight: 800,
    color: '#fff',
  },
  pricePeriod: {
    fontSize: '0.8rem',
    color: '#94a3b8',
  },
  pricePerTabung: {
    fontSize: '0.8rem',
    color: '#34d399',
    fontWeight: 700,
  },
  featureList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    margin: '10px 0',
  },
  featureItem: {
    fontSize: '0.88rem',
    color: '#e2e8f0',
  },
  cardButton: {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    textAlign: 'center' as const,
    fontWeight: 700,
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
  },
  featureDetailCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    padding: '24px',
    borderRadius: '14px',
  },
  featureDetailTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#fff',
  },
  featureDetailDesc: {
    fontSize: '0.88rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.5',
  },
  faqList: {
    maxWidth: '850px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    width: '100%',
  },
  faqCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    padding: '20px 24px',
    borderRadius: '12px',
  },
  faqQ: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  faqA: {
    fontSize: '0.9rem',
    color: 'hsl(215, 20%, 75%)',
    lineHeight: '1.6',
  },
  affiliateFooterBox: {
    padding: '40px 24px',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    marginTop: '20px',
  }
};
