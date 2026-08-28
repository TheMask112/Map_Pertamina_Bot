'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function FailedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div style={styles.container}>
      <div style={styles.card} className="glass-card animate-fade-in">
        <div style={styles.iconWrapper}>
          <div style={styles.iconGlow}></div>
          <span style={styles.icon}>❌</span>
        </div>
        
        <h1 style={styles.title}>Pembayaran Gagal / Dibatalkan</h1>
        
        <p style={styles.description}>
          Mohon maaf, transaksi Anda tidak dapat diproses atau Anda telah membatalkannya. 
          Tidak ada dana yang ditarik dari rekening/e-Wallet Anda.
        </p>

        {orderId && (
          <div style={styles.orderBox}>
            <span style={styles.orderLabel}>Order ID</span>
            <strong style={styles.orderValue}>{orderId}</strong>
          </div>
        )}

        <div style={styles.instructionBox}>
          <h3 style={styles.instructionTitle}>Apa yang harus dilakukan?</h3>
          <ul style={styles.instructionList}>
            <li>Pastikan saldo Anda mencukupi atau limit kartu kredit Anda masih tersedia.</li>
            <li>Jika Anda membatalkan pembayaran secara sengaja, Anda bisa mengabaikan halaman ini.</li>
            <li>Silakan klik tombol di bawah untuk membuat pesanan baru dan mencoba kembali.</li>
          </ul>
        </div>

        <div style={styles.actionGroup}>
          <a href="/checkout" style={styles.primaryBtn} className="btn btn-primary pulse">
            Coba Pembayaran Lagi
          </a>
          <a href="/" style={styles.secondaryBtn}>
            Kembali ke Beranda
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>Memuat...</div>}>
      <FailedContent />
    </Suspense>
  );
}

const styles = {
  container: {
    minHeight: '60vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    padding: '40px',
    textAlign: 'center' as const,
    background: 'rgba(9, 11, 15, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  },
  iconWrapper: {
    position: 'relative' as const,
    width: '80px',
    height: '80px',
    margin: '0 auto 20px',
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
    background: '#ef4444',
    filter: 'blur(30px)',
    opacity: 0.4,
    borderRadius: '50%',
  },
  icon: {
    fontSize: '48px',
    position: 'relative' as const,
    zIndex: 2,
  },
  title: {
    color: '#ffffff',
    fontSize: '2rem',
    fontWeight: 800,
    marginBottom: '16px',
    letterSpacing: '-0.02em',
  },
  description: {
    color: 'hsl(215, 20%, 75%)',
    fontSize: '1rem',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  orderBox: {
    background: 'rgba(255,255,255,0.03)',
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  orderLabel: {
    color: 'hsl(215, 20%, 65%)',
    fontSize: '0.9rem',
  },
  orderValue: {
    color: '#ef4444',
    fontFamily: 'monospace',
    fontSize: '1rem',
  },
  instructionBox: {
    background: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '24px',
    borderRadius: '16px',
    textAlign: 'left' as const,
    marginBottom: '32px',
  },
  instructionTitle: {
    color: '#ef4444',
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '12px',
  },
  instructionList: {
    color: 'hsl(215, 20%, 75%)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    margin: 0,
    paddingLeft: '20px',
  },
  actionGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  primaryBtn: {
    display: 'block',
    padding: '16px 24px',
    fontSize: '1.1rem',
    fontWeight: 600,
    borderRadius: '12px',
    textDecoration: 'none',
  },
  secondaryBtn: {
    display: 'block',
    padding: '16px 24px',
    color: 'hsl(215, 20%, 65%)',
    fontSize: '1rem',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'color 0.2s',
  }
};
