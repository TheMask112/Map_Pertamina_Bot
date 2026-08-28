'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orderStatus, setOrderStatus] = useState('PENDING'); // PENDING, PAID, REDEEMED, EXPIRED, etc.
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const checkStatus = async (showRefreshIndicator = false) => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    if (showRefreshIndicator) {
      setRefreshing(true);
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/status`);
      if (!res.ok) {
        throw new Error('Gagal memverifikasi status transaksi dari database.');
      }
      const data = await res.json();
      setOrderStatus(data.status || 'PENDING');
      setVoucherCode(data.voucherCode || null);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat memuat status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [orderId]);

  // Render state: Loading awal
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card} className="glass-card animate-fade-in">
          <div style={styles.spinnerWrapper}>
            <div style={styles.spinnerLarge}></div>
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 700, marginTop: '24px' }}>
            Memverifikasi Status Pembayaran...
          </h2>
          <p style={{ color: 'hsl(215, 20%, 65%)', fontSize: '0.9rem', marginTop: '8px' }}>
            Mohon tunggu sebentar, sistem sedang mencocokkan data transaksi Anda di database.
          </p>
        </div>
      </div>
    );
  }

  // Render state: Error atau Order ID kosong
  if (error || !orderId) {
    return (
      <div style={styles.container}>
        <div style={styles.card} className="glass-card animate-fade-in">
          <div style={styles.iconWrapper}>
            <div style={{ ...styles.iconGlow, background: '#ef4444' }}></div>
            <span style={styles.icon}>⚠️</span>
          </div>
          <h1 style={styles.title}>Transaksi Tidak Ditemukan</h1>
          <p style={styles.description}>
            {error || 'ID Transaksi (Order ID) tidak sah atau tidak ditemukan pada parameter URL.'}
          </p>
          <div style={styles.actionGroup}>
            <a href="/" style={styles.primaryBtn} className="btn btn-primary">
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isPaid = orderStatus === 'PAID' || orderStatus === 'REDEEMED';
  const isPending = orderStatus === 'PENDING';
  const isExpired = orderStatus === 'EXPIRED';

  return (
    <div style={styles.container}>
      <div style={styles.card} className="glass-card animate-fade-in">
        
        {/* Render Bagian Atas Sesuai Status */}
        {isPaid ? (
          <>
            <div style={styles.successBadge}>🎉 PEMBAYARAN DISETUJUI</div>
            <div style={styles.iconWrapper}>
              <div style={styles.iconGlow}></div>
              <span style={styles.icon}>✅</span>
            </div>
            <h1 style={styles.title}>Pembayaran Berhasil!</h1>
            <p style={styles.description}>
              Terima kasih! Pembayaran Anda telah kami terima dan diverifikasi secara otomatis oleh sistem.
            </p>

            {/* VOUCHER CONTAINER - UX PREMIUM */}
            {voucherCode ? (
              <div style={styles.voucherContainer} onClick={() => {
                navigator.clipboard.writeText(voucherCode);
                alert('Kode voucher lisensi berhasil disalin ke clipboard!');
              }} title="Klik untuk menyalin">
                <div style={styles.voucherLabel}>KODE VOUCHER LISENSI ANDA</div>
                <div style={styles.voucherVal}>{voucherCode}</div>
                <div style={styles.copyNotice}>👉 Ketuk pada kode di atas untuk menyalin 👈</div>
              </div>
            ) : (
              <div style={styles.errorBox}>
                Voucher berhasil diterbitkan tetapi gagal dimuat di layar. Silakan cek WhatsApp Anda.
              </div>
            )}

            <div style={styles.instructionBox}>
              <h3 style={styles.instructionTitle}>Langkah Aktivasi Lisensi:</h3>
              <ol style={styles.instructionList}>
                <li>Hubungi Bot keygen resmi kami di Telegram: <a href="https://t.me/M4PGenerator_bot" target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(194, 96%, 52%)', textDecoration: 'underline' }}>@M4PGenerator_bot</a>.</li>
                <li>Kirim perintah: <code>/redeem {voucherCode || 'KODE_VOUCHER'}</code></li>
                <li>Bot akan menanyakan <strong>Hardware ID (HWID)</strong> komputer Anda. Masukkan HWID tersebut untuk mendapatkan License Key instan.</li>
              </ol>
            </div>
          </>
        ) : isPending ? (
          <>
            <div style={styles.pendingBadge}>⏳ MENUNGGU PEMBAYARAN</div>
            <div style={styles.iconWrapper}>
              <div style={{ ...styles.iconGlow, background: '#f59e0b' }}></div>
              <span style={styles.icon}>🕒</span>
            </div>
            <h1 style={styles.title}>Transaksi Belum Lunas</h1>
            <p style={styles.description}>
              Kami belum mendeteksi pelunasan untuk transaksi ini. Jika Anda baru saja membayar (misal lewat e-Wallet atau Virtual Account), mohon tunggu beberapa detik lalu klik tombol **Segarkan Status** di bawah ini.
            </p>

            <button 
              onClick={() => checkStatus(true)} 
              style={{ ...styles.primaryBtn, width: '100%', marginBottom: '16px' }} 
              className="btn btn-primary pulse"
              disabled={refreshing}
            >
              {refreshing ? 'Memperbarui...' : '🔄 Segarkan Status Transaksi'}
            </button>
          </>
        ) : (
          <>
            <div style={styles.expiredBadge}>❌ TRANSAKSI KADALUWARSA / GAGAL</div>
            <div style={styles.iconWrapper}>
              <div style={{ ...styles.iconGlow, background: '#ef4444' }}></div>
              <span style={styles.icon}>❌</span>
            </div>
            <h1 style={styles.title}>Pembayaran Gagal / Kedaluwarsa</h1>
            <p style={styles.description}>
              Batas waktu pembayaran (15 menit) telah terlewati atau transaksi dibatalkan oleh sistem pembayaran. Silakan lakukan pemesanan ulang dari menu utama.
            </p>
          </>
        )}

        {/* Tampilan Ringkasan Order */}
        <div style={styles.orderBox}>
          <span style={styles.orderLabel}>Order ID</span>
          <strong style={styles.orderValue}>{orderId}</strong>
        </div>

        <div style={styles.actionGroup}>
          <a href="/download" style={styles.downloadBtn}>
            📥 Unduh Software Bot MAP Pertamina
          </a>
          <a href="/" style={styles.secondaryBtn}>
            Kembali ke Beranda
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Memuat...</div>}>
      <SuccessContent />
    </Suspense>
  );
}

const styles = {
  container: {
    minHeight: '75vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    padding: '40px',
    textAlign: 'center' as const,
    background: 'rgba(9, 11, 15, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  },
  spinnerWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
  },
  spinnerLarge: {
    width: '50px',
    height: '50px',
    border: '4px solid rgba(255, 255, 255, 0.1)',
    borderTop: '4px solid hsl(194, 96%, 52%)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  iconWrapper: {
    position: 'relative' as const,
    width: '80px',
    height: '80px',
    margin: '10px auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '60px',
    height: '60px',
    background: '#10b981',
    filter: 'blur(24px)',
    opacity: 0.45,
    borderRadius: '50%',
  },
  icon: {
    fontSize: '44px',
    position: 'relative' as const,
    zIndex: 2,
  },
  title: {
    color: '#ffffff',
    fontSize: '1.9rem',
    fontWeight: 800,
    marginBottom: '14px',
    letterSpacing: '-0.02em',
  },
  description: {
    color: 'hsl(215, 20%, 70%)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    marginBottom: '28px',
  },
  orderBox: {
    background: 'rgba(255,255,255,0.02)',
    padding: '14px 20px',
    borderRadius: '12px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  orderLabel: {
    color: 'hsl(215, 20%, 65%)',
    fontSize: '0.85rem',
  },
  orderValue: {
    color: 'hsl(194, 96%, 52%)',
    fontFamily: 'monospace',
    fontSize: '0.95rem',
  },
  successBadge: {
    alignSelf: 'center',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    fontSize: '0.75rem',
    fontWeight: 800,
    borderRadius: '30px',
    padding: '6px 16px',
    letterSpacing: '0.05em',
    marginBottom: '10px',
    display: 'inline-block',
  },
  pendingBadge: {
    alignSelf: 'center',
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    fontSize: '0.75rem',
    fontWeight: 800,
    borderRadius: '30px',
    padding: '6px 16px',
    letterSpacing: '0.05em',
    marginBottom: '10px',
    display: 'inline-block',
  },
  expiredBadge: {
    alignSelf: 'center',
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    fontSize: '0.75rem',
    fontWeight: 800,
    borderRadius: '30px',
    padding: '6px 16px',
    letterSpacing: '0.05em',
    marginBottom: '10px',
    display: 'inline-block',
  },
  voucherContainer: {
    background: 'rgba(16, 185, 129, 0.03)',
    border: '2px dashed rgba(16, 185, 129, 0.25)',
    borderRadius: '16px',
    padding: '20px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    cursor: 'pointer',
    marginBottom: '28px',
    transition: 'all 0.2s ease',
  },
  voucherLabel: {
    fontSize: '0.7rem',
    fontWeight: 800,
    color: '#10b981',
    letterSpacing: '0.08em',
  },
  voucherVal: {
    fontSize: '2.2rem',
    fontWeight: 900,
    letterSpacing: '0.05em',
    color: '#ffffff',
  },
  copyNotice: {
    fontSize: '0.7rem',
    color: 'hsl(215, 12%, 45%)',
  },
  instructionBox: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid rgba(255,255,255,0.04)',
    padding: '20px',
    borderRadius: '16px',
    textAlign: 'left' as const,
    marginBottom: '28px',
  },
  instructionTitle: {
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: 700,
    marginBottom: '10px',
  },
  instructionList: {
    color: 'hsl(215, 20%, 65%)',
    fontSize: '0.85rem',
    lineHeight: 1.5,
    margin: 0,
    paddingLeft: '20px',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '12px',
    padding: '14px',
    color: '#ef4444',
    fontSize: '0.85rem',
    marginBottom: '28px',
  },
  actionGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  primaryBtn: {
    display: 'block',
    padding: '14px 24px',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '10px',
    textDecoration: 'none',
  },
  downloadBtn: {
    display: 'block',
    padding: '14px 24px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: 600,
    borderRadius: '10px',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
  secondaryBtn: {
    display: 'block',
    padding: '10px 24px',
    color: 'hsl(215, 20%, 60%)',
    fontSize: '0.9rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'color 0.2s',
  }
};
