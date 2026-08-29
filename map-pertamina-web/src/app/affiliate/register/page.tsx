'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AffiliateRegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '',
    pin: '',
    code: '',
    bankName: 'DANA',
    bankAccountNumber: '',
    bankAccountName: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'pin') {
      // Only allow 6 digits
      const digitsOnly = value.replace(/\D/g, '').slice(0, 6);
      setFormData(prev => ({ ...prev, [name]: digitsOnly }));
    } else if (name === 'code') {
      // Only allow uppercase alphanumeric
      const codeVal = value.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 20);
      setFormData(prev => ({ ...prev, [name]: codeVal }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.pin.length !== 6) {
      setError('PIN harus tepat 6 digit angka.');
      return;
    }

    if (!formData.name || !formData.whatsapp || !formData.code) {
      setError('Harap lengkapi semua kolom wajib.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/affiliate/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          ...formData
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan saat mendaftar.');
        setLoading(false);
        return;
      }

      setSuccess('Pendaftaran berhasil! Mengalihkan ke dashboard...');
      setTimeout(() => {
        router.push('/affiliate/dashboard');
      }, 1200);

    } catch (err: any) {
      setError('Gagal menghubungi server. Periksa koneksi internet Anda.');
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="glass-card animate-fade-in">
        <div style={styles.header}>
          <div style={styles.badge}>🤝 MITRA AFFILIATE RESELLER</div>
          <h1 style={styles.title}>Daftar Jadi Mitra Bot MAP</h1>
          <p style={styles.subtitle}>
            Dapatkan penghasilan tanpa batas dengan membagikan bot MAP Pertamina ke rekan pangkalan & agen gas LPG.
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={styles.successBox}>
            ✅ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Nama Lengkap / Nama Pangkalan <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              placeholder="Contoh: Pak Agus / Pangkalan Berkah"
              value={formData.name}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Nomor WhatsApp Aktif <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="tel"
              name="whatsapp"
              placeholder="Contoh: 081234567890"
              value={formData.whatsapp}
              onChange={handleChange}
              style={styles.input}
              required
            />
            <span style={styles.hint}>Digunakan untuk notifikasi penjualan masuk & login akun.</span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Buat PIN Keamanan (6 Digit Angka) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="password"
              inputMode="numeric"
              name="pin"
              placeholder="Contoh: 123456"
              value={formData.pin}
              onChange={handleChange}
              style={{ ...styles.input, letterSpacing: '4px', fontSize: '1.2rem' }}
              required
              maxLength={6}
            />
            <span style={styles.hint}>PIN rahasia Anda untuk login ke dashboard (seperti PIN ATM).</span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Pilih Kode Referral Unik <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={styles.inputGroup}>
              <span style={styles.inputPrefix}>?ref=</span>
              <input
                type="text"
                name="code"
                placeholder="CONTOH: AGUS88"
                value={formData.code}
                onChange={handleChange}
                style={{ ...styles.input, ...styles.inputWithPrefix }}
                required
              />
            </div>
            <span style={styles.hint}>Kode ini akan menjadi link promosi Anda. Contoh: <code>map-pertamina-web.vercel.app/?ref={formData.code || 'KODE'}</code></span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '10px 0' }} />

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>
            💳 Rekening Pencairan Komisi (Bisa Diubah Nanti)
          </h3>

          <div style={styles.row}>
            <div style={{ ...styles.formGroup, flex: 1 }}>
              <label style={styles.label}>Bank / E-Wallet</label>
              <select name="bankName" value={formData.bankName} onChange={handleChange} style={styles.select}>
                <option value="DANA">DANA</option>
                <option value="GOPAY">GoPay</option>
                <option value="OVO">OVO</option>
                <option value="SHOPEEPAY">ShopeePay</option>
                <option value="BCA">Bank BCA</option>
                <option value="BRI">Bank BRI</option>
                <option value="MANDIRI">Bank Mandiri</option>
                <option value="BNI">Bank BNI</option>
                <option value="BSI">Bank BSI</option>
              </select>
            </div>

            <div style={{ ...styles.formGroup, flex: 2 }}>
              <label style={styles.label}>Nomor Rekening / No E-Wallet</label>
              <input
                type="text"
                name="bankAccountNumber"
                placeholder="Contoh: 081234567890 / 1234567890"
                value={formData.bankAccountNumber}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Atas Nama Pemilik Rekening</label>
            <input
              type="text"
              name="bankAccountName"
              placeholder="Contoh: Agus Setiawan"
              value={formData.bankAccountName}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '16px', fontSize: '1.05rem', fontWeight: 800, marginTop: '12px' }}
          >
            {loading ? '⏳ Mendaftarkan Akun...' : '🚀 DAFTAR JADI MITRA SEKARANG'}
          </button>
        </form>

        <div style={styles.footer}>
          Sudah punya akun mitra? <Link href="/affiliate/login" style={{ color: '#38bdf8', fontWeight: 700 }}>Masuk di Sini</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '85vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '30px 16px',
  },
  card: {
    maxWidth: '550px',
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
  badge: {
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    fontSize: '0.78rem',
    fontWeight: 800,
    letterSpacing: '0.05em',
    marginBottom: '12px',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
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
    padding: '12px 14px',
    borderRadius: '10px',
    background: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  select: {
    padding: '12px 14px',
    borderRadius: '10px',
    background: 'rgba(30, 41, 59, 0.9)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  inputPrefix: {
    padding: '12px 14px',
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRight: 'none',
    borderTopLeftRadius: '10px',
    borderBottomLeftRadius: '10px',
    color: '#38bdf8',
    fontWeight: 800,
    fontSize: '0.9rem',
  },
  inputWithPrefix: {
    borderTopLeftRadius: '0',
    borderBottomLeftRadius: '0',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#94a3b8',
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
  successBox: {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#34d399',
    padding: '12px',
    borderRadius: '10px',
    fontSize: '0.85rem',
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center' as const,
    fontSize: '0.88rem',
    color: '#94a3b8',
  }
};
