'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AffiliateLoginPage() {
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(val);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!whatsapp || pin.length !== 6) {
      setError('Masukkan nomor WhatsApp dan PIN 6 digit yang benar.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/affiliate/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          whatsapp,
          pin
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Nomor WhatsApp atau PIN salah.');
        setLoading(false);
        return;
      }

      router.push('/affiliate/dashboard');

    } catch (err: any) {
      setError('Gagal menghubungi server. Periksa koneksi internet Anda.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="glass-card animate-fade-in">
        <div style={styles.header}>
          <div style={styles.icon}>💼</div>
          <h1 style={styles.title}>Login Mitra Affiliate</h1>
          <p style={styles.subtitle}>
            Masuk ke dashboard reseller Anda untuk memantau komisi dan mengatur harga.
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nomor WhatsApp</label>
            <input
              type="tel"
              placeholder="Contoh: 081234567890"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>PIN Keamanan (6 Digit)</label>
            <input
              type="password"
              inputMode="numeric"
              placeholder="••••••"
              value={pin}
              onChange={handlePinChange}
              style={{ ...styles.input, letterSpacing: '6px', textAlign: 'center', fontSize: '1.4rem' }}
              maxLength={6}
              required
            />
            <span style={styles.hint}>Masukkan 6 digit angka PIN Anda.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: '1.05rem', fontWeight: 800, marginTop: '8px' }}
          >
            {loading ? '⏳ Memeriksa PIN...' : '🔐 MASUK KE DASHBOARD'}
          </button>
        </form>

        <div style={styles.footer}>
          Belum jadi mitra? <Link href="/affiliate/register" style={{ color: '#38bdf8', fontWeight: 700 }}>Daftar Gratis di Sini</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '80vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px 16px',
  },
  card: {
    maxWidth: '450px',
    width: '100%',
    padding: '36px 28px',
    borderRadius: '20px',
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    backdropFilter: 'blur(12px)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  icon: {
    fontSize: '2.8rem',
    marginBottom: '8px',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '0.88rem',
    color: '#94a3b8',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '18px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    textAlign: 'left' as const,
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#e2e8f0',
  },
  input: {
    padding: '13px 14px',
    borderRadius: '10px',
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  hint: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '2px',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '12px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    marginBottom: '16px',
    textAlign: 'left' as const,
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center' as const,
    fontSize: '0.88rem',
    color: '#94a3b8',
  }
};
