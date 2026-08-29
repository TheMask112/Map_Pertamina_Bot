// page.tsx (src/app/checkout/page.tsx)
// Interactive Checkout Page with QRIS Generator and Payment Polling

'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// Pricing config (Client-safe copy of IDs to prevent SSR/CSR import leaks)
const PAKETS_CLIENT = {
  STARTER: { nama: 'Starter', kuota: 500, harga: 75000, icon: '🟢' },
  PRO: { nama: 'Pro', kuota: 2000, harga: 250000, icon: '🔵' },
  ENTERPRISE: { nama: 'Enterprise', kuota: 5000, harga: 500000, icon: '🟣' }
} as any;

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const paketParam = (searchParams.get('paket') || 'STARTER').toUpperCase();
  const selectedPaket = PAKETS_CLIENT[paketParam] ? paketParam : 'STARTER';
  const paketInfo = PAKETS_CLIENT[selectedPaket];

  const [step, setStep] = useState(1); // 1: Input HP, 2: QRIS Payment, 3: Success Voucher
  const [whatsapp, setWhatsapp] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [pangkalanName, setPangkalanName] = useState('');
  const [customerType, setCustomerType] = useState('Pangkalan');
  const [showOptionalData, setShowOptionalData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Affiliate State
  const [affiliateCode, setAffiliateCode] = useState('');
  const [affiliateInfo, setAffiliateInfo] = useState<any>(null);
  const [showRefInput, setShowRefInput] = useState(false);

  // Check referral code on mount
  useEffect(() => {
    let ref = searchParams.get('ref');
    if (!ref && typeof document !== 'undefined') {
      const match = document.cookie.match(/affiliate_ref=([^;]+)/);
      if (match) ref = match[1];
    }
    if (ref) {
      setAffiliateCode(ref.toUpperCase());
      fetchAffiliateInfo(ref.toUpperCase());
    }
  }, [searchParams]);

  const fetchAffiliateInfo = async (code: string) => {
    try {
      const res = await fetch(`/api/affiliate/info?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        setAffiliateInfo(data.affiliate);
      } else {
        setAffiliateInfo(null);
      }
    } catch {
      setAffiliateInfo(null);
    }
  };

  const handleApplyRef = (e: React.FormEvent) => {
    e.preventDefault();
    if (affiliateCode.trim()) {
      fetchAffiliateInfo(affiliateCode.trim().toUpperCase());
    }
  };

  // Calculate dynamic price based on affiliate markup
  const markupPercent = affiliateInfo ? (affiliateInfo.markupPercent || 0) : 0;
  const displayPrice = Math.round(paketInfo.harga * (1 + markupPercent / 100));
  
  // Order state
  const [orderId, setOrderId] = useState('');
  const [finalAmount, setFinalAmount] = useState(0);
  const [snapToken, setSnapToken] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  
  // Polling ref to clear interval
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Submit Order ke API
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp.match(/^(08|628)[0-9]{8,13}$/)) {
      setError('Masukkan nomor WhatsApp yang valid (contoh: 08123456789)');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paket: selectedPaket,
          whatsapp,
          affiliateCode: affiliateInfo ? affiliateInfo.code : (affiliateCode.trim() || undefined),
          customerName: customerName.trim() || undefined,
          pangkalanName: pangkalanName.trim() || undefined,
          customerType: customerType || undefined
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses checkout');
      
      setOrderId(data.orderId);
      setFinalAmount(data.amount);
      setExpiresAt(new Date(data.expiresAt));
      
      // Save snap token
      setSnapToken(data.snapToken);
      
      setStep(2);
      startPolling(data.orderId);

      // Call Midtrans Snap JS
      if (typeof window !== 'undefined' && (window as any).snap) {
        (window as any).snap.pay(data.snapToken, {
          onSuccess: function(result: any) {
            console.log('Payment success', result);
          },
          onPending: function(result: any) {
            console.log('Payment pending', result);
          },
          onError: function(result: any) {
            setError('Pembayaran gagal atau dibatalkan oleh gateway.');
            setStep(1);
          },
          onClose: function() {
            // Biarkan user di step 2 (bisa klik ulang)
          }
        });
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  // 2. Timer Countdown 15 Menit
  useEffect(() => {
    if (step !== 2 || !expiresAt) return;

    const updateTimer = () => {
      const diff = expiresAt.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00');
        setError('Waktu pembayaran telah kadaluwarsa. Silakan checkout ulang.');
        setStep(1);
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, expiresAt]);

  // 3. Polling Status Pembayaran (Setiap 5 detik)
  const startPolling = (id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${id}/status`);
        if (!res.ok) return;
        
        const data = await res.json();
        if (data.status === 'PAID' || data.status === 'REDEEMED') {
          setVoucherCode(data.voucherCode);
          setStep(3);
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
        } else if (data.status === 'EXPIRED') {
          setError('Order ini telah kedaluwarsa.');
          setStep(1);
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Format nominal pas sesuai harga paket
  const formatAmountWithGlow = (amount: number) => {
    return <span>{amount.toLocaleString('id-ID')}</span>;
  };

  return (
    <div style={styles.container}>
      {/* STEP 1: INPUT WHATSAPP */}
      {step === 1 && (
        <div style={styles.box} className="glass-card animate-fade-in">
          <div style={styles.boxHeader}>
            <span style={styles.boxIcon}>{paketInfo.icon}</span>
            <h2 style={styles.boxTitle}>Checkout Paket {paketInfo.nama}</h2>
            <p style={styles.boxDesc}>Konfirmasikan pembelian lisensi Anda dan masukkan nomor WhatsApp.</p>
          </div>

          {affiliateInfo && (
            <div style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.85rem', color: '#38bdf8' }}>
              🤝 <strong>Direkomendasikan oleh Mitra:</strong> {affiliateInfo.name} (<code>{affiliateInfo.code}</code>)
              {affiliateInfo.whatsapp && (
                <span style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                  Bantuan & Support: {affiliateInfo.whatsapp}
                </span>
              )}
            </div>
          )}

          <div style={styles.summaryList}>
            <div style={styles.summaryItem}>
              <span>Paket Terpilih</span>
              <strong style={{ color: '#fff' }}>{paketInfo.nama}</strong>
            </div>
            <div style={styles.summaryItem}>
              <span>Kuota Tabung NIK</span>
              <strong style={{ color: '#fff' }}>{paketInfo.kuota.toLocaleString('id-ID')} Tabung</strong>
            </div>
            <div style={styles.summaryItem}>
              <span>Total Tagihan</span>
              <strong style={{ color: '#38bdf8', fontSize: '1.2rem' }}>Rp {displayPrice.toLocaleString('id-ID')}</strong>
            </div>
          </div>

          <form onSubmit={handleCheckoutSubmit} style={styles.form}>
            <div className="form-group">
              <label className="form-label">Nomor WhatsApp Anda</label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: 08123456789"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                required
                disabled={loading}
              />
              <span style={styles.inputHelp}>Voucher lisensi dan instruksi akan dikirimkan otomatis ke nomor WA ini.</span>
            </div>

            {/* DATA PELANGGAN / USAHA (OPSIONAL UNTUK DATABASE & GARANSI) */}
            <div style={{ marginTop: '4px', marginBottom: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '12px' }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }} 
                onClick={() => setShowOptionalData(!showOptionalData)}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🏢 Data Pelanggan / Pangkalan <span style={{ fontSize: '0.7rem', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', padding: '2px 6px', borderRadius: '4px' }}>Opsional</span>
                </span>
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 500 }}>
                  {showOptionalData ? '▲ Tutup' : '▼ Lengkapi Data'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', marginBottom: showOptionalData ? '12px' : '0', lineHeight: 1.4 }}>
                💡 Dianjurkan diisi untuk mempermudah bantuan teknis & layanan garansi prioritas.
              </p>

              {showOptionalData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Nama Lengkap / Kontak (Opsional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: Budi Santoso"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      disabled={loading}
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Nama Pangkalan / Agen / Toko (Opsional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Contoh: Pangkalan Gas Berkah"
                      value={pangkalanName}
                      onChange={(e) => setPangkalanName(e.target.value)}
                      disabled={loading}
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Kategori Usaha</label>
                    <select
                      className="form-input"
                      value={customerType}
                      onChange={(e) => setCustomerType(e.target.value)}
                      disabled={loading}
                      style={{ padding: '8px 12px', fontSize: '0.85rem', background: '#0f172a', color: '#fff' }}
                    >
                      <option value="Pangkalan">Pangkalan LPG 3Kg</option>
                      <option value="Agen">Agen / Sub-Penyalur Gas</option>
                      <option value="Perorangan">Perorangan / Retail</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* KODE REFERRAL TOGGLE / INPUT */}
            {!affiliateInfo && (
              <div style={{ marginTop: '8px' }}>
                {!showRefInput ? (
                  <button
                    type="button"
                    onClick={() => setShowRefInput(true)}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.82rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    🏷️ Punya Kode Referral / Mitra? Masukkan di sini
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="KODE REFERRAL (contoh: AGUS88)"
                      value={affiliateCode}
                      onChange={(e) => setAffiliateCode(e.target.value.toUpperCase())}
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyRef}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                    >
                      Terapkan
                    </button>
                  </div>
                )}
              </div>
            )}

            {error && <div style={styles.errorBox}>❌ {error}</div>}

            <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={loading}>
              {loading ? 'Memproses Order...' : `Bayar Rp ${displayPrice.toLocaleString('id-ID')}`}
            </button>
          </form>
        </div>
      )}

      {/* STEP 2: MIDTRANS SNAP POPUP & COUNTDOWN */}
      {step === 2 && (
        <div style={styles.boxLarge} className="glass-card animate-fade-in">
          <div style={styles.countdownHeader}>
            <div>
              <span style={styles.liveBadge} className="pulse">●</span> LIVE POLLING
            </div>
            <div style={styles.countdownTimer}>
              Sisa Waktu: <strong style={{ color: 'hsl(346, 84%, 50%)' }}>{timeLeft}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💳</div>
            <h2 style={styles.paymentTitle}>Selesaikan Pembayaran Anda</h2>
            <p style={styles.paymentSub}>Jendela pop-up Midtrans (semua metode pembayaran) seharusnya telah muncul di layar Anda. Silakan selesaikan pembayaran di sana.</p>
            
            <button 
              type="button"
              className="btn btn-primary pulse" 
              style={{ marginTop: '24px', padding: '14px 28px', fontSize: '1.05rem', borderRadius: '12px' }}
              onClick={() => {
                if (typeof window !== 'undefined' && (window as any).snap) {
                  (window as any).snap.pay(snapToken);
                }
              }}
            >
              Buka Ulang Jendela Pembayaran
            </button>

            <div style={{ ...styles.statusIndicator, justifyContent: 'center', marginTop: '40px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px' }}>
              <div style={styles.spinner}></div>
              <span>Menunggu konfirmasi otomatis...</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUCCESS & VOUCHER CODE */}
      {step === 3 && (
        <div style={styles.box} className="glass-card animate-fade-in">
          <div style={styles.successBadge}>🎉 PEMBAYARAN DISETUJUI</div>
          
          <div style={{ ...styles.boxHeader, marginTop: '16px' }}>
            <h2 style={styles.boxTitle}>Terima Kasih Atas Pembelian Anda!</h2>
            <p style={styles.boxDesc}>Pembayaran Anda telah diverifikasi otomatis. Kode voucher lisensi Anda telah diterbitkan.</p>
          </div>

          <div style={styles.voucherContainer}>
            <div style={styles.voucherLabel}>KODE VOUCHER LISENSI ANDA</div>
            <div style={styles.voucherVal} onClick={() => {
              navigator.clipboard.writeText(voucherCode);
              alert('Kode voucher disalin ke clipboard!');
            }} title="Klik untuk menyalin">
              {voucherCode}
            </div>
            <div style={styles.copyNotice}>👉 Klik pada kode di atas untuk menyalin 👈</div>
          </div>

          <div style={styles.guideCard}>
            <h4 style={styles.guideTitle}>Langkah Aktivasi Lisensi:</h4>
            <ol style={styles.guideList}>
              <li>Buka Telegram dan hubungi Bot keygen resmi di <a href="https://t.me/M4PGenerator_bot" target="_blank" rel="noopener noreferrer" style={{ color: 'hsl(194, 96%, 52%)', textDecoration: 'underline' }}>@M4PGenerator_bot</a>.</li>
              <li>Kirim perintah: <code>/redeem {voucherCode}</code></li>
              <li>Bot akan merespons dan meminta <strong>Hardware ID (HWID)</strong> komputer Anda.</li>
              <li>Masukkan HWID Anda, dan Bot akan mengirimkan <strong>License Key</strong> secara instan!</li>
              <li>Copy License Key tersebut, dan masukkan ke dalam aplikasi Bot MAP Pertamina Anda.</li>
            </ol>
          </div>

          <a href="/download" className="btn btn-secondary" style={{ width: '100%', marginTop: '24px' }}>
            Unduh Software Bot MAP Pertamina
          </a>
        </div>
      )}
    </div>
  );
}

// Suspense Boundary Wrapper to comply with Next.js 14 searchParams dynamic optimization
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div style={styles.loadingWrapper}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '16px', color: 'hsl(215, 20%, 65%)' }}>Memuat Portal Pembayaran...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

const styles = {
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px 0',
  },
  box: {
    maxWidth: '520px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'stretch',
    gap: '24px',
  },
  boxLarge: {
    maxWidth: '850px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  boxHeader: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  boxIcon: {
    fontSize: '3rem',
  },
  boxTitle: {
    fontSize: '1.8rem',
    fontWeight: 800,
  },
  boxDesc: {
    fontSize: '0.9rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.5',
  },
  summaryList: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    color: 'hsl(215, 20%, 65%)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  inputHelp: {
    fontSize: '0.75rem',
    color: 'hsl(215, 12%, 40%)',
    marginTop: '2px',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '1rem',
    borderRadius: '10px',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    padding: '12px',
    color: 'hsl(346, 84%, 50%)',
    fontSize: '0.85rem',
  },
  countdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '10px',
    padding: '12px 20px',
    border: '1px solid rgba(255,255,255,0.04)',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  liveBadge: {
    color: 'hsl(142, 76%, 45%)',
    marginRight: '6px',
  },
  countdownTimer: {
    color: 'hsl(215, 20%, 65%)',
  },
  paymentTitle: {
    fontSize: '1.8rem',
    fontWeight: 800,
  },
  paymentSub: {
    fontSize: '0.9rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.5',
  },

  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.9rem',
    color: 'hsl(194, 96%, 52%)',
    fontWeight: 600,
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255, 255, 255, 0.1)',
    borderTop: '3px solid hsl(194, 96%, 52%)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  successBadge: {
    alignSelf: 'center',
    background: 'rgba(142, 76, 45, 0.1)',
    border: '1px solid rgba(142, 76, 45, 0.2)',
    color: 'hsl(142, 76%, 45%)',
    fontSize: '0.8rem',
    fontWeight: 800,
    borderRadius: '30px',
    padding: '6px 16px',
    letterSpacing: '0.05em',
  },
  voucherContainer: {
    background: 'rgba(142, 76, 45, 0.05)',
    border: '2px dashed hsla(142, 76%, 45%, 0.3)',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  voucherLabel: {
    fontSize: '0.75rem',
    fontWeight: 800,
    color: 'hsl(142, 76%, 45%)',
    letterSpacing: '0.08em',
  },
  voucherVal: {
    fontSize: '2.5rem',
    fontWeight: 900,
    letterSpacing: '0.05em',
    color: '#ffffff',
  },
  copyNotice: {
    fontSize: '0.75rem',
    color: 'hsl(215, 12%, 40%)',
  },
  guideCard: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.04)',
    textAlign: 'left' as const,
  },
  guideTitle: {
    fontSize: '0.95rem',
    fontWeight: 700,
    marginBottom: '12px',
    color: '#ffffff',
  },
  guideList: {
    paddingLeft: '20px',
    fontSize: '0.85rem',
    color: 'hsl(215, 20%, 65%)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    lineHeight: '1.4',
  },
};

// CSS Injection for dynamic spinner spin animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
