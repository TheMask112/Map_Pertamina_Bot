'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CONFIG } from '@/lib/config';

interface Commission {
  id: string;
  orderId: string;
  paket: string;
  buyerWa: string;
  baseAmount: number;
  grossAmount: number;
  netCommission: number;
  status: string;
  createdAt: string;
}

interface Payout {
  id: string;
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  status: string;
  notes?: string;
  createdAt: string;
  processedAt?: string;
}

export default function AffiliateDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  // State Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'pricing' | 'marketing' | 'payout' | 'history'>('overview');

  // State Markup Editor
  const [markupPercent, setMarkupPercent] = useState<number>(10);
  const [savingMarkup, setSavingMarkup] = useState(false);
  const [markupMsg, setMarkupMsg] = useState('');

  // State Bank Editor & Payout
  const [bankData, setBankData] = useState({
    bankName: 'DANA',
    bankAccountNumber: '',
    bankAccountName: ''
  });
  const [payoutAmount, setPayoutAmount] = useState<number>(50000);
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState('');
  const [payoutError, setPayoutError] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [bankMsg, setBankMsg] = useState('');

  // Copy state
  const [copied, setCopied] = useState(false);
  const [copiedPromoText, setCopiedPromoText] = useState<number | null>(null);

  // Load Dashboard Data
  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/affiliate/dashboard');
      if (!res.ok) {
        router.push('/affiliate/login');
        return;
      }
      const data = await res.json();
      setAffiliate(data.affiliate);
      setMarkupPercent(data.affiliate.markupPercent || 10);
      setBankData({
        bankName: data.affiliate.bankName || 'DANA',
        bankAccountNumber: data.affiliate.bankAccountNumber || '',
        bankAccountName: data.affiliate.bankAccountName || ''
      });
      setCommissions(data.commissions || []);
      setPayouts(data.payouts || []);
      setLoading(false);
    } catch {
      router.push('/affiliate/login');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    await fetch('/api/affiliate/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' })
    });
    router.push('/affiliate/login');
  };

  // Handle Save Markup
  const handleSaveMarkup = async () => {
    setSavingMarkup(true);
    setMarkupMsg('');
    try {
      const res = await fetch('/api/affiliate/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_markup',
          markupPercent
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMarkupMsg(`✅ ${data.message}`);
        setAffiliate((prev: any) => ({ ...prev, markupPercent }));
      } else {
        setMarkupMsg(`❌ ${data.error}`);
      }
    } catch {
      setMarkupMsg('❌ Gagal menyimpan markup.');
    }
    setSavingMarkup(false);
  };

  // Handle Save Bank
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBank(true);
    setBankMsg('');
    try {
      const res = await fetch('/api/affiliate/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_bank',
          ...bankData
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBankMsg('✅ Rekening berhasil disimpan!');
        setAffiliate((prev: any) => ({ ...prev, ...bankData }));
      } else {
        setBankMsg(`❌ ${data.error}`);
      }
    } catch {
      setBankMsg('❌ Gagal menyimpan rekening.');
    }
    setSavingBank(false);
  };

  // Handle Request Payout
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPayout(true);
    setPayoutMsg('');
    setPayoutError('');

    try {
      const res = await fetch('/api/affiliate/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_payout',
          amount: payoutAmount
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPayoutMsg(data.message);
        fetchDashboardData();
      } else {
        setPayoutError(data.error);
      }
    } catch {
      setPayoutError('Gagal mengajukan penarikan.');
    }
    setSubmittingPayout(false);
  };

  const promoUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?ref=${affiliate?.code}`
    : `https://map-pertamina-web.vercel.app/?ref=${affiliate?.code}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(promoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPromoText = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromoText(index);
    setTimeout(() => setCopiedPromoText(null), 2000);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: '#38bdf8', fontSize: '1.2rem', fontWeight: 700 }}>⏳ Memuat Dashboard Mitra...</div>
      </div>
    );
  }

  const pakets = Object.values(CONFIG.pakets);

  // Copywriting Marketing Kits
  const promoTexts = [
    `🔥 *SOLUSI CAPEK INPUT NIK TRANSAKSI LPG 3KG* 🔥\n\nBagi bapak/ibu pemilik Pangkalan Gas LPG 3Kg yang capek input NIK manual satu per satu & pusing dengan Captcha geser di website MyPertamina, sekarang ada solusinya!\n\n🤖 *Bot MAP Pertamina (Otomatis Transaksi dari Excel)*:\n✅ Isi Tempat & Tanggal Lahir NIK otomatis\n✅ Bypass Captcha puzzle sendiri\n✅ Cukup sediakan Excel NIK, bot jalan sendiri\n✅ Bisa di Laptop/PC & HP Android\n\n👉 Info resmi & Coba Aplikasi di sini:\n${promoUrl}\n\n_Butuh bantuan pasang? Hubungi saya di WhatsApp ini ya!_`,
    
    `💡 *Tips Pangkalan Gas Cepat Kelar Transaksi Subsidi Tepat*\n\nNgapain lembur berjam-jam ketik NIK manual kalau bisa selesai otomatis dalam hitungan menit? Pakai *Bot MAP Pertamina*, tinggal upload Excel langsung lunas tercatat.\n\nUnduh & Aktifkan Kuota Resmi di sini:\n👉 ${promoUrl}\n\nKonsultasi & Panduan Pasang: ${affiliate?.whatsapp}`,

    `📢 *Rekomendasi Aplikasi Pangkalan Gas 3Kg*\n\nBot MAP Pertamina sudah update versi terbaru 2026: Auto-fill TTL Dukcapil se-Indonesia & Background Service di Android. Sangat direkomendasikan untuk operasional harian pangkalan!\n\nLihat Detail & Beli Lisensi:\n👉 ${promoUrl}`
  ];

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* 1. TOP HEADER */}
      <div style={styles.topHeader}>
        <div>
          <div style={styles.badge}>DASHBOARD MITRA RESELLER</div>
          <h1 style={styles.welcomeTitle}>Halo, {affiliate.name}! 👋</h1>
          <p style={styles.codeText}>
            Kode Referral Anda: <strong style={{ color: '#38bdf8', fontSize: '1.1rem' }}>{affiliate.code}</strong> | No. WA: {affiliate.whatsapp}
          </p>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          🚪 Keluar Akun
        </button>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statCard, borderLeft: '4px solid #10b981' }} className="glass-card">
          <span style={styles.statLabel}>💵 Saldo Dompet Tersedia</span>
          <h2 style={{ ...styles.statValue, color: '#34d399' }}>
            Rp {(affiliate.availableBalance || 0).toLocaleString('id-ID')}
          </h2>
          <span style={styles.statSub}>Siap dicairkan ke Rekening / E-Wallet</span>
        </div>

        <div style={{ ...styles.statCard, borderLeft: '4px solid #38bdf8' }} className="glass-card">
          <span style={styles.statLabel}>📈 Total Komisi Didapat</span>
          <h2 style={{ ...styles.statValue, color: '#38bdf8' }}>
            Rp {(affiliate.totalEarnings || 0).toLocaleString('id-ID')}
          </h2>
          <span style={styles.statSub}>Dari {affiliate.totalSalesCount || 0} transaksi berhasil</span>
        </div>

        <div style={{ ...styles.statCard, borderLeft: '4px solid #a855f7' }} className="glass-card">
          <span style={styles.statLabel}>💳 Total Sudah Dicairkan</span>
          <h2 style={{ ...styles.statValue, color: '#c084fc' }}>
            Rp {(affiliate.withdrawnAmount || 0).toLocaleString('id-ID')}
          </h2>
          <span style={styles.statSub}>Dana yang sudah ditransfer Admin</span>
        </div>

        <div style={{ ...styles.statCard, borderLeft: '4px solid #f59e0b' }} className="glass-card">
          <span style={styles.statLabel}>🏷️ Setting Markup Aktif</span>
          <h2 style={{ ...styles.statValue, color: '#fbbf24' }}>
            +{affiliate.markupPercent}%
          </h2>
          <span style={styles.statSub}>Tambahan harga di atas harga pokok</span>
        </div>
      </div>

      {/* 3. QUICK SHARE BOX */}
      <div style={styles.shareBox} className="glass-card">
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
            🔗 Tautan Promosi Unik Anda
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Bagikan link ini ke calon pembeli. Web akan otomatis menampilkan harga markup Anda dan banner nama Anda!
          </p>
        </div>
        <div style={styles.shareInputGroup}>
          <input type="text" readOnly value={promoUrl} style={styles.shareInput} />
          <button onClick={copyToClipboard} className="btn btn-primary" style={{ padding: '12px 20px', whiteSpace: 'nowrap' }}>
            {copied ? '✅ Tersalin!' : '📋 Salin Link'}
          </button>
        </div>
      </div>

      {/* 4. NAVIGATION TABS */}
      <div style={styles.tabNav}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{ ...styles.tabBtn, ...(activeTab === 'overview' ? styles.tabBtnActive : {}) }}
        >
          📊 Ringkasan & Link
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          style={{ ...styles.tabBtn, ...(activeTab === 'pricing' ? styles.tabBtnActive : {}) }}
        >
          🏷️ Atur Harga Markup
        </button>
        <button
          onClick={() => setActiveTab('marketing')}
          style={{ ...styles.tabBtn, ...(activeTab === 'marketing' ? styles.tabBtnActive : {}) }}
        >
          📢 Bahan Promosi WA
        </button>
        <button
          onClick={() => setActiveTab('payout')}
          style={{ ...styles.tabBtn, ...(activeTab === 'payout' ? styles.tabBtnActive : {}) }}
        >
          💸 Tarik Komisi
        </button>
        <button
          onClick={() => setActiveTab('history')}
          style={{ ...styles.tabBtn, ...(activeTab === 'history' ? styles.tabBtnActive : {}) }}
        >
          📜 Riwayat Transaksi
        </button>
      </div>

      {/* 5. TAB CONTENTS */}

      {/* TAB: ATUR HARGA MARKUP */}
      {activeTab === 'pricing' && (
        <div style={styles.sectionCard} className="glass-card animate-fade-in">
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
              ⚙️ Pengaturan Persentase Markup Harga
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8' }}>
              Tentukan berapa persen Anda ingin menaikkan harga jual di atas harga pokok. Seluruh selisih harga ini adalah <strong>100% komisi bersih Anda</strong>.
            </p>
          </div>

          <div style={styles.sliderBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Persentase Markup:</span>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>+{markupPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(parseInt(e.target.value, 10))}
              style={{ width: '100%', height: '8px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              <span>0% (Harga Standar)</span>
              <span>25%</span>
              <span>50% (Maksimal Guardrail)</span>
            </div>
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginTop: '24px', marginBottom: '12px' }}>
            📋 Simulasi Harga Jual & Estimasi Komisi Anda per Penjualan:
          </h3>

          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Paket</th>
                  <th style={styles.th}>Kuota Tabung</th>
                  <th style={styles.th}>Harga Pokok Asli</th>
                  <th style={styles.th}>Harga Jual di Link Anda</th>
                  <th style={{ ...styles.th, color: '#34d399' }}>Estimasi Komisi Anda (Bersih)</th>
                </tr>
              </thead>
              <tbody>
                {pakets.map((p) => {
                  const markedPrice = Math.round(p.harga * (1 + markupPercent / 100));
                  const gatewayFee = Math.round(markedPrice * 0.007);
                  const netCommission = Math.max(markedPrice - p.harga - gatewayFee, 0);

                  return (
                    <tr key={p.id} style={styles.tr}>
                      <td style={styles.td}><strong>{p.nama}</strong></td>
                      <td style={styles.td}>{p.kuota.toLocaleString('id-ID')} Tabung</td>
                      <td style={styles.td}>Rp {p.harga.toLocaleString('id-ID')}</td>
                      <td style={{ ...styles.td, color: '#38bdf8', fontWeight: 700 }}>
                        Rp {markedPrice.toLocaleString('id-ID')}
                      </td>
                      <td style={{ ...styles.td, color: '#34d399', fontWeight: 800 }}>
                        +Rp {netCommission.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {markupMsg && (
            <div style={{ marginTop: '16px', fontSize: '0.9rem', color: markupMsg.includes('✅') ? '#34d399' : '#f87171' }}>
              {markupMsg}
            </div>
          )}

          <button
            onClick={handleSaveMarkup}
            disabled={savingMarkup}
            className="btn btn-primary"
            style={{ marginTop: '20px', padding: '14px 28px', fontSize: '1rem', fontWeight: 800 }}
          >
            {savingMarkup ? '⏳ Menyimpan...' : '💾 SIMPAN PENGATURAN HARGA'}
          </button>
        </div>
      )}

      {/* TAB: BAHAN PROMOSI */}
      {activeTab === 'marketing' && (
        <div style={styles.sectionCard} className="glass-card animate-fade-in">
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
            📢 Bahan Promosi Siap Salin (Copy-Paste)
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', marginBottom: '24px' }}>
            Tinggal salin teks di bawah ini dan kirim ke grup WhatsApp atau kontak rekan sesama pangkalan gas LPG 3Kg.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {promoTexts.map((text, idx) => (
              <div key={idx} style={styles.promoCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>📌 Teks Promosi Opsi {idx + 1}</strong>
                  <button
                    onClick={() => copyPromoText(idx, text)}
                    style={styles.copyPromoBtn}
                  >
                    {copiedPromoText === idx ? '✅ Tersalin!' : '📋 Salin Teks'}
                  </button>
                </div>
                <pre style={styles.promoText}>{text}</pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: TARIK KOMISI & SETTING BANK */}
      {activeTab === 'payout' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }} className="animate-fade-in">
          {/* FORM TARIK DANA */}
          <div style={styles.sectionCard} className="glass-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              💸 Form Penarikan Saldo Komisi
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
              Minimal penarikan adalah <strong>Rp 50.000</strong>. Transfer diproses maksimal 1x24 jam.
            </p>

            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '14px', borderRadius: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Saldo Anda yang Dapat Ditarik:</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
                Rp {(affiliate.availableBalance || 0).toLocaleString('id-ID')}
              </div>
            </div>

            {payoutMsg && (
              <div style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
                ✅ {payoutMsg}
              </div>
            )}
            {payoutError && (
              <div style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
                ⚠️ {payoutError}
              </div>
            )}

            <form onSubmit={handleRequestPayout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nominal Penarikan (Rp)</label>
                <input
                  type="number"
                  min="50000"
                  max={affiliate.availableBalance || 0}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(parseInt(e.target.value, 10) || 0)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Dana akan dikirim ke: <strong>{affiliate.bankName || '-'} ({affiliate.bankAccountNumber || '-'}) a/n {affiliate.bankAccountName || '-'}</strong>
              </div>

              <button
                type="submit"
                disabled={submittingPayout || (affiliate.availableBalance || 0) < 50000}
                className="btn btn-primary"
                style={{ padding: '14px', fontWeight: 800, marginTop: '8px' }}
              >
                {submittingPayout ? '⏳ Mengajukan...' : '🚀 AJUKAN PENARIKAN SEKARANG'}
              </button>
            </form>
          </div>

          {/* FORM UPDATE REKENING */}
          <div style={styles.sectionCard} className="glass-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              💳 Rekening Bank / E-Wallet Anda
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
              Pastikan nama dan nomor rekening sesuai agar pencairan dana tidak terkendala.
            </p>

            {bankMsg && (
              <div style={{ background: bankMsg.includes('✅') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: bankMsg.includes('✅') ? '#34d399' : '#f87171', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px' }}>
                {bankMsg}
              </div>
            )}

            <form onSubmit={handleSaveBank} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Pilih Bank / E-Wallet</label>
                <select
                  value={bankData.bankName}
                  onChange={(e) => setBankData(prev => ({ ...prev, bankName: e.target.value }))}
                  style={styles.select}
                >
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

              <div style={styles.formGroup}>
                <label style={styles.label}>Nomor Rekening / No HP E-Wallet</label>
                <input
                  type="text"
                  value={bankData.bankAccountNumber}
                  onChange={(e) => setBankData(prev => ({ ...prev, bankAccountNumber: e.target.value }))}
                  placeholder="Contoh: 081234567890"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Nama Pemilik Rekening</label>
                <input
                  type="text"
                  value={bankData.bankAccountName}
                  onChange={(e) => setBankData(prev => ({ ...prev, bankAccountName: e.target.value }))}
                  placeholder="Contoh: Agus Setiawan"
                  style={styles.input}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingBank}
                className="btn btn-secondary"
                style={{ padding: '14px', fontWeight: 700, marginTop: '8px' }}
              >
                {savingBank ? '⏳ Menyimpan...' : '💾 SIMPAN REKENING'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB: RIWAYAT TRANSAKSI & PENARIKAN */}
      {(activeTab === 'history' || activeTab === 'overview') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
          {/* TABEL PENJUALAN TERAKHIR */}
          <div style={styles.sectionCard} className="glass-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px' }}>
              🛒 Riwayat Penjualan Masuk Terbaru
            </h2>

            {commissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                Belum ada penjualan via link Anda. Mulai bagikan link referral Anda untuk mendapatkan komisi pertama! 🚀
              </div>
            ) : (
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Tanggal</th>
                      <th style={styles.th}>Paket</th>
                      <th style={styles.th}>No. Pembeli</th>
                      <th style={styles.th}>Total Bayar</th>
                      <th style={{ ...styles.th, color: '#34d399' }}>Komisi Anda</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} style={styles.tr}>
                        <td style={styles.td}>{new Date(c.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td style={styles.td}><strong>{c.paket}</strong></td>
                        <td style={styles.td}>{c.buyerWa}</td>
                        <td style={styles.td}>Rp {c.grossAmount.toLocaleString('id-ID')}</td>
                        <td style={{ ...styles.td, color: '#34d399', fontWeight: 800 }}>+Rp {c.netCommission.toLocaleString('id-ID')}</td>
                        <td style={styles.td}>
                          <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', color: '#34d399', fontSize: '0.75rem', fontWeight: 700 }}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TABEL RIWAYAT PENARIKAN DANA */}
          <div style={styles.sectionCard} className="glass-card">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '14px' }}>
              📜 Riwayat Penarikan Dana (Payouts)
            </h2>

            {payouts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                Belum ada permohonan penarikan dana.
              </div>
            ) : (
              <div style={styles.tableResponsive}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Tanggal</th>
                      <th style={styles.th}>Nominal</th>
                      <th style={styles.th}>Tujuan Transfer</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.id} style={styles.tr}>
                        <td style={styles.td}>{new Date(p.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</td>
                        <td style={{ ...styles.td, fontWeight: 800, color: '#ffffff' }}>Rp {p.amount.toLocaleString('id-ID')}</td>
                        <td style={styles.td}>{p.bankName} - {p.bankAccountNumber} ({p.bankAccountName})</td>
                        <td style={styles.td}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: p.status === 'COMPLETED' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            color: p.status === 'COMPLETED' ? '#34d399' : '#fbbf24',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '30px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    fontSize: '0.75rem',
    fontWeight: 800,
    marginBottom: '6px',
  },
  welcomeTitle: {
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#ffffff',
    margin: 0,
  },
  codeText: {
    fontSize: '0.9rem',
    color: '#94a3b8',
    marginTop: '4px',
  },
  logoutBtn: {
    padding: '10px 18px',
    borderRadius: '10px',
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px',
  },
  statCard: {
    padding: '20px',
    borderRadius: '14px',
    background: 'rgba(15, 23, 42, 0.8)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  statLabel: {
    fontSize: '0.82rem',
    color: '#94a3b8',
    fontWeight: 700,
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: 800,
    margin: '4px 0',
  },
  statSub: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  shareBox: {
    padding: '20px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  shareInputGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  shareInput: {
    flex: 1,
    minWidth: '260px',
    padding: '12px 16px',
    borderRadius: '10px',
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    color: '#38bdf8',
    fontWeight: 700,
    fontSize: '0.95rem',
    outline: 'none',
  },
  tabNav: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto' as const,
    paddingBottom: '6px',
  },
  tabBtn: {
    padding: '12px 18px',
    borderRadius: '10px',
    background: 'rgba(30, 41, 59, 0.6)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    color: '#94a3b8',
    fontWeight: 700,
    fontSize: '0.88rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.2s ease',
  },
  tabBtnActive: {
    background: '#38bdf8',
    color: '#0f172a',
    borderColor: '#38bdf8',
    fontWeight: 800,
  },
  sectionCard: {
    padding: '28px',
    borderRadius: '16px',
    background: 'rgba(15, 23, 42, 0.85)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
  },
  sliderBox: {
    background: 'rgba(30, 41, 59, 0.6)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid rgba(56, 189, 248, 0.2)',
  },
  tableResponsive: {
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    textAlign: 'left' as const,
    fontSize: '0.88rem',
  },
  th: {
    padding: '12px 14px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
    color: '#94a3b8',
    fontWeight: 700,
  },
  tr: {
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
  },
  td: {
    padding: '14px',
    color: '#e2e8f0',
  },
  promoCard: {
    background: 'rgba(30, 41, 59, 0.5)',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.2)',
  },
  copyPromoBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  promoText: {
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
    fontFamily: 'inherit',
    fontSize: '0.85rem',
    color: '#cbd5e1',
    lineHeight: '1.5',
    background: 'rgba(15, 23, 42, 0.6)',
    padding: '14px',
    borderRadius: '8px',
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
  }
};
