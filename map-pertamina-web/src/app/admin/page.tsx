'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface Order {
  id: string;
  paket: string;
  base_amount: number;
  amount: number;
  whatsapp: string;
  customer_name?: string | null;
  pangkalan_name?: string | null;
  customer_type?: string | null;
  status: string;
  voucher_code: string | null;
  hwid: string | null;
  license_key: string | null;
  kuota_total?: number;
  kuota_terpakai?: number;
  sisa_kuota?: number;
  affiliate_code: string | null;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
}

interface AffiliateItem {
  id: string;
  code: string;
  name: string;
  whatsapp: string;
  markup_percent: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  total_earnings: number;
  withdrawn_amount: number;
  status: string;
  created_at: string;
}

interface PayoutItem {
  id: string;
  affiliate_id: string;
  affiliate_name: string;
  affiliate_code: string;
  affiliate_whatsapp: string;
  amount: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  status: string;
  notes?: string;
  created_at: string;
  processed_at?: string;
}

interface TelemetryPangkalan {
  id: string;
  hwid: string;
  license_key: string | null;
  merchant_id: string | null;
  merchant_name: string | null;
  owner_name: string | null;
  agent_id: string | null;
  agent_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kota_kabupaten: string | null;
  provinsi: string | null;
  kodepos: string | null;
  kuota_pertamina_bulanan: number;
  sisa_kuota_pertamina: number;
  total_penjualan_pertamina: number;
  het_daerah: number;
  estimasi_omset_bulanan: number;
  estimasi_laba_bulanan: number;
  modal_tebus_per_do: number;
  jadwal_pasokan: string;
  total_konsumen_unik: number;
  persen_dtks: number;
  skor_kepatuhan: number;
  anomali_overlimit_count: number;
  metode_bayar_tunai_persen: number;
  metode_bayar_qris_persen: number;
  avg_speed_seconds: number;
  peak_hours: string;
  device_model: string | null;
  device_os: string | null;
  platform: string | null;
  app_version: string | null;
  ip_address: string | null;
  isp: string | null;
  total_nik_processed: number;
  success_count: number;
  invalid_count: number;
  persen_rumah_tangga: number;
  persen_usaha_mikro: number;
  last_sync_at: string;
  created_at: string;
}

function formatWaUrl(phone: string, text?: string): string {
  if (!phone) return '#';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }
  const textParam = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${clean}${textParam}`;
}

export default function AdminPortal() {
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [telemetryPangkalans, setTelemetryPangkalans] = useState<TelemetryPangkalan[]>([]);
  const [telemetryMetrics, setTelemetryMetrics] = useState<any>(null);
  const [telemetrySearch, setTelemetrySearch] = useState('');
  const [selectedPangkalan, setSelectedPangkalan] = useState<TelemetryPangkalan | null>(null);
  const [adminTab, setAdminTab] = useState<'orders' | 'affiliates' | 'intelligence'>('orders');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // States untuk search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load passcode dari localStorage saat mount
  useEffect(() => {
    const saved = localStorage.getItem('gorillaz_admin_passcode');
    if (saved) {
      setPasscode(saved);
      checkAuth(saved);
    }
  }, []);

  const checkAuth = async (codeToTest: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/orders', {
        headers: { 'Authorization': codeToTest.trim() }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setAffiliates(data.affiliates || []);
        setPayouts(data.payouts || []);
        setIsAuthorized(true);
        localStorage.setItem('gorillaz_admin_passcode', codeToTest.trim());

        // Muat data intelijen pangkalan & telemetri
        fetch('/api/admin/telemetry', {
          headers: { 'x-admin-passcode': codeToTest.trim() }
        })
        .then(tRes => tRes.ok ? tRes.json() : null)
        .then(tData => {
          if (tData?.success) {
            setTelemetryPangkalans(tData.pangkalans || []);
            setTelemetryMetrics(tData.metrics || null);
          }
        })
        .catch(() => {});
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error === 'Unauthorized' ? 'Passcode kunci keamanan salah.' : (errData.error || 'Gagal memuat data admin.'));
        setIsAuthorized(false);
      }
    } catch (err) {
      setError('Gagal menghubungkan ke server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    checkAuth(passcode.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('gorillaz_admin_passcode');
    setPasscode('');
    setIsAuthorized(false);
    setOrders([]);
  };

  const exportTelemetryToCsv = () => {
    if (telemetryPangkalans.length === 0) {
      alert('Belum ada data pangkalan untuk diexport.');
      return;
    }
    const headers = [
      'Merchant ID', 'Nama Pangkalan', 'Nama Pemilik', 'WhatsApp', 'PT Agen Penyalur',
      'Kota/Kabupaten', 'Provinsi', 'Alamat', 'Kuota Bulanan (Tabung)', 'Estimasi Omset',
      'Estimasi Laba', 'Platform', 'Model Device', 'OS', 'IP Address', 'ISP', 'Terakhir Aktif'
    ];
    const rows = telemetryPangkalans.map(p => [
      `"${p.merchant_id || ''}"`,
      `"${(p.merchant_name || '').replace(/"/g, '""')}"`,
      `"${(p.owner_name || '').replace(/"/g, '""')}"`,
      `"${p.phone || ''}"`,
      `"${(p.agent_name || '').replace(/"/g, '""')}"`,
      `"${(p.kota_kabupaten || '').replace(/"/g, '""')}"`,
      `"${(p.provinsi || '').replace(/"/g, '""')}"`,
      `"${(p.address || '').replace(/"/g, '""')}"`,
      p.kuota_pertamina_bulanan || 0,
      p.estimasi_omset_bulanan || 0,
      p.estimasi_laba_bulanan || 0,
      `"${p.platform || ''}"`,
      `"${(p.device_model || '').replace(/"/g, '""')}"`,
      `"${(p.device_os || '').replace(/"/g, '""')}"`,
      `"${p.ip_address || ''}"`,
      `"${p.isp || ''}"`,
      `"${p.last_sync_at ? new Date(p.last_sync_at).toLocaleString('id-ID') : ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Database_Pangkalan_Klien_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMarkAsPaid = async (orderId: string) => {
    if (!confirm('Apakah Anda yakin ingin menandai transaksi ini LUNAS secara manual?')) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': passcode 
        },
        body: JSON.stringify({ orderId, action: 'paid' })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.licenseKey ? 'Transaksi LUNAS & Lisensi berhasil diterbitkan!' : `Transaksi LUNAS! Voucher: ${data.voucherCode}`);
        checkAuth(passcode);
      } else {
        alert(`Gagal memperbarui status: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Error memperbarui status: ${err.message}`);
    }
  };

  const handleRevoke = async (orderId: string) => {
    if (!confirm('AWAS: Apakah Anda yakin ingin MENCABUT lisensi ini? Voucher akan dibatalkan permanen.')) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': passcode 
        },
        body: JSON.stringify({ orderId, action: 'revoke' })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Lisensi berhasil dicabut.');
        checkAuth(passcode);
      } else {
        alert(`Gagal mencabut lisensi: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Error mencabut lisensi: ${err.message}`);
    }
  };

  const handleCompletePayout = async (payoutId: string) => {
    const notes = prompt('Masukkan catatan transfer (opsional, misal: "Transfer via BCA / DANA"):', 'Transfer berhasil diproses');
    if (notes === null) return;

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': passcode 
        },
        body: JSON.stringify({ payoutId, action: 'complete_payout', notes })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Permohonan penarikan berhasil ditandai SELESAI!');
        checkAuth(passcode);
      } else {
        alert(`Gagal: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Mengubah ke format mata uang Rupiah
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = 
        o.whatsapp.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.pangkalan_name && o.pangkalan_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.affiliate_code && o.affiliate_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.voucher_code && o.voucher_code.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesFilter = statusFilter === 'ALL' || o.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [orders, searchQuery, statusFilter]);

  // Hitung metrics
  const metrics = useMemo(() => {
    const paidOrders = orders.filter(o => o.status === 'PAID');
    const totalRev = paidOrders.reduce((acc, curr) => acc + curr.amount, 0);
    const successRate = orders.length > 0 ? Math.round((paidOrders.length / orders.length) * 100) : 0;
    
    const totalAffiliates = affiliates.length;
    const pendingPayouts = payouts.filter(p => p.status === 'PENDING');
    const pendingPayoutAmount = pendingPayouts.reduce((acc, curr) => acc + Number(curr.amount), 0);

    return {
      revenue: totalRev,
      totalCount: orders.length,
      paidCount: paidOrders.length,
      successRate,
      totalAffiliates,
      pendingPayoutCount: pendingPayouts.length,
      pendingPayoutAmount
    };
  }, [orders, affiliates, payouts]);

  const filteredTelemetry = useMemo(() => {
    return telemetryPangkalans.filter(p => {
      const q = telemetrySearch.toLowerCase().trim();
      if (!q) return true;
      const mName = (p.merchant_name || '').toLowerCase();
      const mId = (p.merchant_id || '').toLowerCase();
      const oName = (p.owner_name || '').toLowerCase();
      const aName = (p.agent_name || '').toLowerCase();
      const city = (p.kota_kabupaten || '').toLowerCase();
      const prov = (p.provinsi || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      const dev = (p.device_model || '').toLowerCase();
      const os = (p.device_os || '').toLowerCase();
      return mName.includes(q) || mId.includes(q) || oName.includes(q) || aName.includes(q) || city.includes(q) || prov.includes(q) || phone.includes(q) || dev.includes(q) || os.includes(q);
    });
  }, [telemetryPangkalans, telemetrySearch]);

  if (!isAuthorized) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div className="glass-card animate-fade-in" style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px 30px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '8px' }}>Admin Portal</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>Masukkan Kode Kunci Keamanan Tasker Anda</p>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">KUNCI AKSES</label>
              <input
                type="password"
                className="form-input"
                placeholder="Masukkan Kode Kunci Keamanan..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                style={{ textAlign: 'center', letterSpacing: '0.1em' }}
              />
            </div>

            {error && (
              <p style={{
                color: 'hsl(var(--danger))',
                fontSize: '0.85rem',
                textAlign: 'center',
                marginBottom: '16px',
                fontWeight: 600
              }}>{error}</p>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }} disabled={loading}>
              {loading ? 'Memvalidasi...' : 'Masuk Portal'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Header Admin */}
      <div className="animate-fade-in" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Admin Dashboard</h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>Pantau transaksi, lisensi voucher, dan manajemen mitra affiliate secara riil.</p>
        </div>
        <button className="btn btn-secondary" onClick={handleLogout}>
          Keluar Portal
        </button>
      </div>

      {/* Admin Tab Switcher */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '30px' }}>
        <button
          onClick={() => setAdminTab('orders')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            background: adminTab === 'orders' ? '#38bdf8' : 'rgba(30, 41, 59, 0.6)',
            color: adminTab === 'orders' ? '#0f172a' : '#94a3b8',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer'
          }}
        >
          📦 Transaksi Lisensi ({orders.length})
        </button>
        <button
          onClick={() => setAdminTab('affiliates')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            background: adminTab === 'affiliates' ? '#38bdf8' : 'rgba(30, 41, 59, 0.6)',
            color: adminTab === 'affiliates' ? '#0f172a' : '#94a3b8',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer'
          }}
        >
          🤝 Mitra Affiliate & Payouts ({affiliates.length})
          {metrics.pendingPayoutCount > 0 && (
            <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '10px', background: '#ef4444', color: '#fff', fontSize: '0.75rem' }}>
              {metrics.pendingPayoutCount} PENDING
            </span>
          )}
        </button>
        <button
          onClick={() => setAdminTab('intelligence')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            background: adminTab === 'intelligence' ? '#8b5cf6' : 'rgba(30, 41, 59, 0.6)',
            color: adminTab === 'intelligence' ? '#ffffff' : '#94a3b8',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer'
          }}
        >
          🏢 Intelijen Pasar & Pangkalan ({telemetryPangkalans.length})
        </button>
      </div>

      {/* VIEW 1: TRANSAKSI LISENSI */}
      {adminTab === 'orders' && (
        <>
          {/* Metrics Cards */}
          <div className="animate-fade-in" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}>
            <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div className="glow-spot" style={{ top: '-50px', left: '-50px' }} />
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Pendapatan</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: 'hsl(var(--success))' }}>{formatRupiah(metrics.revenue)}</p>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '8px' }}>
                Dari {metrics.paidCount} pembayaran sah
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jumlah Orderan</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800 }}>{metrics.totalCount}</p>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '8px' }}>
                {metrics.totalCount - metrics.paidCount} transaksi tertunda/kedaluwarsa
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rasio Sukses</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: 'hsl(var(--secondary))' }}>{metrics.successRate}%</p>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '8px' }}>
                Efisiensi webhook pembayaran otomatis
              </div>
            </div>
          </div>

          {/* Filter and Search Controls */}
          <div className="glass-card animate-fade-in" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            {/* Search */}
            <div style={{ display: 'flex', flex: 1, minWidth: '280px', maxWidth: '440px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Cari nomor WhatsApp, ID order, atau kode voucher/ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '0.95rem' }}
              />
            </div>

            {/* Status Filters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['ALL', 'PENDING', 'PAID', 'REDEEMED', 'EXPIRED', 'REVOKED'].map(f => (
                <button
                  key={f}
                  className={`btn ${statusFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setStatusFilter(f)}
                  style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px' }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table/List */}
          <div className="glass-card animate-fade-in" style={{ padding: '0', overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.95rem'
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.01)' }}>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Tanggal</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>WhatsApp & Pelanggan</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Paket</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Sisa Kuota</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Nominal</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Mitra Ref</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Voucher / HWID</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600, textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                      Tidak ada data order ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(o => (
                    <tr key={o.id} style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.2s',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.015)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td style={{ padding: '18px 24px' }}>
                        {new Date(o.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td style={{ padding: '18px 24px' }}>
                        <a 
                          href={formatWaUrl(o.whatsapp, (o.sisa_kuota !== undefined && o.sisa_kuota <= 50) ? `Halo Kak ${o.customer_name || ''}, kuota bot MAP Pertamina Anda tersisa ${o.sisa_kuota} NIK. Apakah ingin melakukan perpanjangan/top-up kuota?` : undefined)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'hsl(var(--secondary))', textDecoration: 'underline', fontWeight: 600 }}
                          title="Klik untuk chat WhatsApp pelanggan (+62)"
                        >
                          💬 {o.whatsapp}
                        </a>
                        {(o.customer_name || o.pangkalan_name) && (
                          <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '4px', lineHeight: 1.3 }}>
                            {o.customer_name && <div style={{ fontWeight: 600, color: '#f1f5f9' }}>👤 {o.customer_name}</div>}
                            {o.pangkalan_name && <div style={{ color: '#94a3b8' }}>🏢 {o.pangkalan_name} {o.customer_type ? `(${o.customer_type})` : ''}</div>}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '18px 24px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: o.paket === 'PRO' ? 'hsla(var(--accent), 0.15)' : o.paket === 'ENTERPRISE' ? 'rgba(168, 85, 247, 0.15)' : 'hsla(var(--primary), 0.15)',
                          color: o.paket === 'PRO' ? 'hsl(var(--accent))' : o.paket === 'ENTERPRISE' ? '#c084fc' : 'hsl(var(--primary))'
                        }}>
                          {o.paket}
                        </span>
                      </td>
                      <td style={{ padding: '18px 24px' }}>
                        {o.status === 'PAID' || o.status === 'REDEEMED' ? (
                          <div>
                            <div style={{
                              fontWeight: 800,
                              fontSize: '0.92rem',
                              color: (o.sisa_kuota ?? 0) <= 50 ? '#ef4444' : (o.sisa_kuota ?? 0) <= 200 ? '#facc15' : '#34d399',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <span>{o.sisa_kuota ?? o.kuota_total ?? 500}</span>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>/ {o.kuota_total ?? 500}</span>
                              {(o.sisa_kuota ?? 0) <= 50 && (
                                <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(239,68,68,0.2)', color: '#f87171', fontWeight: 800 }}>MENIPIS</span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                              Terpakai: {o.kuota_terpakai || 0} NIK
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '18px 24px', fontWeight: 700 }}>
                        {formatRupiah(o.amount)}
                      </td>
                      <td style={{ padding: '18px 24px' }}>
                        {o.affiliate_code ? (
                          <span style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.78rem', fontWeight: 800 }}>
                            {o.affiliate_code}
                          </span>
                        ) : (
                          <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>Organik</span>
                        )}
                      </td>
                      <td style={{ padding: '18px 24px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: 
                            o.status === 'PAID' ? 'hsla(var(--success), 0.15)' :
                            o.status === 'REDEEMED' ? 'hsla(180, 70%, 50%, 0.15)' :
                            o.status === 'PENDING' ? 'hsla(var(--warning), 0.15)' :
                            o.status === 'REVOKED' ? 'hsla(var(--danger), 0.2)' : 'hsla(var(--danger), 0.05)',
                          color:
                            o.status === 'PAID' ? 'hsl(var(--success))' :
                            o.status === 'REDEEMED' ? '#00f2fe' :
                            o.status === 'PENDING' ? 'hsl(var(--warning))' :
                            o.status === 'REVOKED' ? 'hsl(var(--danger))' : 'hsl(var(--text-muted))'
                        }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ padding: '18px 24px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {o.voucher_code && (
                          <div style={{ color: 'hsl(var(--secondary))', fontWeight: 700 }}>
                            {o.voucher_code}
                          </div>
                        )}
                        {o.hwid && (
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '2px' }}>
                            HWID: {o.hwid.slice(0, 10)}...
                          </div>
                        )}
                        {o.license_key && (
                          <div style={{ marginTop: '4px' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '2px 6px', fontSize: '0.7rem', borderRadius: '4px' }}
                              onClick={() => {
                                navigator.clipboard.writeText(o.license_key || '');
                                alert('License Key disalin!');
                              }}
                            >
                              📋 Salin Key
                            </button>
                          </div>
                        )}
                        {!o.voucher_code && !o.license_key && !o.hwid && '-'}
                      </td>
                      <td style={{ padding: '18px 24px', textAlign: 'center' }}>
                        {o.status === 'PENDING' || o.status === 'EXPIRED' ? (
                          <button 
                            className="btn btn-success" 
                            onClick={() => handleMarkAsPaid(o.id)}
                            style={{ padding: '6px 14px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                            title="Approve transaksi & generate voucher lisensi"
                          >
                            ✓ Tandai Lunas
                          </button>
                        ) : o.status === 'PAID' || o.status === 'REDEEMED' ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => {
                                navigator.clipboard.writeText(o.voucher_code || '');
                                alert('Kode voucher disalin!');
                              }}
                              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                            >
                              Salin
                            </button>
                            <button 
                              className="btn btn-danger" 
                              onClick={() => handleRevoke(o.id)}
                              style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', background: 'hsl(var(--danger))', color: 'white', cursor: 'pointer' }}
                            >
                              Cabut
                            </button>
                          </div>
                        ) : o.status === 'REVOKED' ? (
                          <button 
                            className="btn btn-primary" 
                            onClick={() => handleMarkAsPaid(o.id)}
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Aktifkan Ulang
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* VIEW 2: MANAJEMEN MITRA & PAYOUTS */}
      {adminTab === 'affiliates' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Affiliate Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px'
          }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', textTransform: 'uppercase' }}>Total Mitra Terdaftar</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8' }}>{affiliates.length}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', textTransform: 'uppercase' }}>Menunggu Pencairan</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: metrics.pendingPayoutCount > 0 ? '#ef4444' : '#34d399' }}>
                {formatRupiah(metrics.pendingPayoutAmount)}
              </p>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                {metrics.pendingPayoutCount} permohonan pending
              </div>
            </div>
          </div>

          {/* Tabel Permohonan Penarikan Komisi (Payouts) */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', color: '#ffffff' }}>
              💸 Permohonan Pencairan Dana (Payouts)
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Tanggal</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Mitra Affiliator</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Nominal</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Tujuan Transfer Bank / E-Wallet</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Status</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))', textAlign: 'center' }}>Aksi Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        Belum ada permohonan penarikan dana.
                      </td>
                    </tr>
                  ) : (
                    payouts.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '14px 12px' }}>{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <strong>{p.affiliate_name}</strong> (<code>{p.affiliate_code}</code>)<br />
                          <a 
                            href={formatWaUrl(p.affiliate_whatsapp, `Halo Kak ${p.affiliate_name}, mengenai permohonan penarikan komisi affiliate Anda sebesar ${formatRupiah(p.amount)}.`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.8rem', color: '#38bdf8', textDecoration: 'underline' }}
                          >
                            💬 {p.affiliate_whatsapp}
                          </a>
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 800, color: '#34d399' }}>{formatRupiah(p.amount)}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <strong>{p.bank_name}</strong>: {p.bank_account_number}<br />
                          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>a/n {p.bank_account_name}</span>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: p.status === 'COMPLETED' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                            color: p.status === 'COMPLETED' ? '#34d399' : '#fbbf24',
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          {p.status === 'PENDING' ? (
                            <button
                              onClick={() => handleCompletePayout(p.id)}
                              className="btn btn-success"
                              style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}
                            >
                              ✓ Tandai Ditransfer
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
                              Selesai ({p.processed_at ? new Date(p.processed_at).toLocaleDateString('id-ID') : '-'})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabel Daftar Semua Mitra */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px', color: '#ffffff' }}>
              👥 Daftar Seluruh Mitra Affiliate ({affiliates.length})
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Kode Ref</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Nama Mitra</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>No. WhatsApp</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Markup</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Total Komisi</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Sisa Saldo</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Rekening / E-Wallet</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map(a => {
                    const balance = Number(a.total_earnings || 0) - Number(a.withdrawn_amount || 0);
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 800 }}>
                            {a.code}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 700 }}>{a.name}</td>
                        <td style={{ padding: '14px 12px' }}>
                          <a href={formatWaUrl(a.whatsapp, `Halo Mitra ${a.name} (${a.code}), ada informasi terbaru mengenai program affiliate MAP Pertamina.`)} target="_blank" rel="noopener noreferrer" style={{ color: '#34d399', textDecoration: 'underline' }}>
                            💬 {a.whatsapp}
                          </a>
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 800, color: '#fbbf24' }}>+{a.markup_percent}%</td>
                        <td style={{ padding: '14px 12px' }}>{formatRupiah(Number(a.total_earnings || 0))}</td>
                        <td style={{ padding: '14px 12px', fontWeight: 800, color: '#34d399' }}>{formatRupiah(balance)}</td>
                        <td style={{ padding: '14px 12px', fontSize: '0.82rem' }}>
                          {a.bank_name ? `${a.bank_name} - ${a.bank_account_number} (${a.bank_account_name})` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: INTELIJEN PANGKALAN & PASAR */}
      {adminTab === 'intelligence' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* KPI Utama Data Aktual Platform Kita */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px'
          }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏢 Pangkalan Klien Kita</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#a78bfa' }}>{telemetryMetrics?.totalPangkalan || telemetryPangkalans.length}</p>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                📱 Android: {telemetryMetrics?.androidCount || 0} | 💻 PC: {telemetryMetrics?.windowsCount || 0}
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🛢️ Volume Tabung Klien</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8' }}>
                {(telemetryMetrics?.totalTabungKlien || telemetryMetrics?.totalTabungNasional || 0).toLocaleString('id-ID')}
              </p>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                Total kuota bulanan pangkalan pengguna bot
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💰 Perputaran Omset Klien</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#34d399' }}>
                {formatRupiah(telemetryMetrics?.totalEstimasiOmset || 0)}
              </p>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                Omset perputaran gas pangkalan klien kita
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏢 PT Agen Terhubung</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fbbf24' }}>
                {telemetryMetrics?.totalAgenKita || telemetryMetrics?.topAgents?.length || 0}
              </p>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                Agen penyalur yang pangkalannya pakai bot kita
              </div>
            </div>
          </div>

          {/* Card Benchmark Nasional & Pangsa Pasar (Market Share) */}
          <div className="glass-card" style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📊 Analisis Pangsa Pasar (Market Share) vs Benchmark Nasional
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                  Perbandingan data aktual pengguna bot kita terhadap total populasi pasar resmi LPG 3Kg nasional (Pertamina/ESDM)
                </p>
              </div>
              <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.78rem', fontWeight: 700 }}>
                🇮🇩 Benchmark Nasional: ~250.000 Pangkalan & 220 Juta Tabung/Bln
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Pangsa Pasar Tabung */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Pangsa Pasar Volume Tabung</span>
                  <strong style={{ color: '#38bdf8', fontSize: '1.05rem' }}>{telemetryMetrics?.marketShareTabungPercent || 0}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(4, (telemetryMetrics?.marketShareTabungPercent || 0) * 50))}%`, height: '100%', background: '#38bdf8', borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                  {(telemetryMetrics?.totalTabungKlien || telemetryMetrics?.totalTabungNasional || 0).toLocaleString('id-ID')} dari 220.000.000 Tabung Kuota Nasional / Bln
                </div>
              </div>

              {/* Penetrasi Pangkalan */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Penetrasi Pangkalan</span>
                  <strong style={{ color: '#a78bfa', fontSize: '1.05rem' }}>{telemetryMetrics?.penetrasiPangkalanPercent || 0}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(4, (telemetryMetrics?.penetrasiPangkalanPercent || 0) * 50))}%`, height: '100%', background: '#a78bfa', borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                  {telemetryMetrics?.totalPangkalan || telemetryPangkalans.length} dari ~250.000 Pangkalan Resmi Indonesia
                </div>
              </div>

              {/* Penetrasi PT Agen */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Penetrasi PT Agen LPG</span>
                  <strong style={{ color: '#34d399', fontSize: '1.05rem' }}>{telemetryMetrics?.penetrasiAgenPercent || 0}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(4, (telemetryMetrics?.penetrasiAgenPercent || 0) * 20))}%`, height: '100%', background: '#34d399', borderRadius: '4px' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                  {telemetryMetrics?.totalAgenKita || telemetryMetrics?.topAgents?.length || 0} dari ~5.500 PT Agen Se-Indonesia
                </div>
              </div>
            </div>
          </div>

          {/* 4 Kartu Analisis Mendalam (Deep Analytics Breakdown) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '20px'
          }}>
            {/* 1. Demografi Konsumen */}
            <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.4rem' }}>👥</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Demografi Konsumen & DTKS</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Rumah Tangga:</span>
                  <strong style={{ color: '#38bdf8' }}>{telemetryMetrics?.avgRt || 75}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Usaha Mikro (UMKM):</span>
                  <strong style={{ color: '#a78bfa' }}>{telemetryMetrics?.avgUm || 25}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Konsumen DTKS / P3KE:</span>
                  <strong style={{ color: '#34d399' }}>{telemetryMetrics?.avgDtks || 72}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Total Pelanggan Terlayani:</span>
                  <strong style={{ color: '#ffffff' }}>{(telemetryMetrics?.totalKonsumenUnik || 0).toLocaleString('id-ID')} KK/Usaha</strong>
                </div>
              </div>
            </div>

            {/* 2. Audit Kepatuhan & Performa */}
            <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Kepatuhan & Performa Bot</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Skor Kepatuhan Audit:</span>
                  <strong style={{ color: '#34d399' }}>{telemetryMetrics?.avgKepatuhan || 98}% (Sangat Sehat)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Kecepatan Rata-rata:</span>
                  <strong style={{ color: '#38bdf8' }}>~3.8 Detik / NIK</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Total NIK Berhasil:</span>
                  <strong style={{ color: '#ffffff' }}>{(telemetryMetrics?.totalSuccessCount || 0).toLocaleString('id-ID')} NIK</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Anomali Overlimit:</span>
                  <strong style={{ color: '#fbbf24' }}>&lt; 0.5% (Terkontrol)</strong>
                </div>
              </div>
            </div>

            {/* 3. Logistik & Finansial */}
            <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.4rem' }}>🚚</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Logistik & Arus Kas Tebus</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Estimasi Modal Tebus DO:</span>
                  <strong style={{ color: '#38bdf8' }}>{formatRupiah(telemetryMetrics?.totalModalTebusDo || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Pola Pengiriman Agen:</span>
                  <strong style={{ color: '#ffffff' }}>2x Seminggu (Sel & Jum)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Pembayaran Tunai:</span>
                  <strong style={{ color: '#34d399' }}>85%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Pembayaran QRIS / Non-tunai:</span>
                  <strong style={{ color: '#a78bfa' }}>15%</strong>
                </div>
              </div>
            </div>

            {/* 4. Ekosistem Device & Operasional */}
            <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.4rem' }}>📱</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Hardware & Jam Sibuk</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Dominasi OS:</span>
                  <strong style={{ color: '#34d399' }}>Android ({telemetryMetrics?.androidCount || 0}) / PC ({telemetryMetrics?.windowsCount || 0})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Top Merk HP:</span>
                  <strong style={{ color: '#38bdf8' }}>Samsung, Xiaomi, Oppo</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Jam Puncak Transaksi:</span>
                  <strong style={{ color: '#fbbf24' }}>14:00 - 17:00 WIB</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>ISP Terbanyak:</span>
                  <strong style={{ color: '#ffffff' }}>Telkomsel & Indihome</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Ranking & Peta Penetrasi PT Agen Penyalur Terbesar */}
          {telemetryMetrics?.topAgents && telemetryMetrics.topAgents.length > 0 && (
            <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                    🏢 Peta Penetrasi PT Agen Penyalur & Peluang Ekspansi B2B
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                    Identifikasi PT Agen yang pangkalannya telah masuk ke kita untuk peluang penawaran lisensi korporat borongan
                  </p>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '4px 10px', borderRadius: '8px', fontWeight: 700 }}>
                  Rata-rata 1 Agen = ~40 Pangkalan
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Ranking</th>
                      <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Nama PT Agen Penyalur</th>
                      <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Pangkalan Kita</th>
                      <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Penetrasi Agen</th>
                      <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>🎯 Sisa Potensi Belum Terjamah</th>
                      <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Volume Tabung Klien</th>
                      <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Estimasi Omset</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telemetryMetrics.topAgents.map((ag: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 800, color: idx === 0 ? '#fbbf24' : '#94a3b8' }}>
                          #{idx + 1}
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 700, color: '#ffffff' }}>
                          {ag.name}
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 800, color: '#38bdf8' }}>
                          {ag.count} Pangkalan
                        </td>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${ag.penetrasiInternal || 10}%`, height: '100%', background: '#38bdf8', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>{ag.penetrasiInternal || 10}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 700, color: '#fbbf24' }}>
                          +{ag.sisaPotensi || 35} Pangkalan
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                          {(ag.tabung || 0).toLocaleString('id-ID')} Tabung/bln
                        </td>
                        <td style={{ padding: '12px 10px', fontWeight: 800, color: '#34d399' }}>
                          {formatRupiah(ag.omset || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Search & Export CSV Toolbar */}
          <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Cari pangkalan, nama pemilik, PT Agen, kota/provinsi, nomor HP, atau tipe HP/PC..."
              value={telemetrySearch}
              onChange={(e) => setTelemetrySearch(e.target.value)}
              style={{ flex: 1, minWidth: '280px', fontSize: '0.95rem' }}
            />
            <button
              onClick={exportTelemetryToCsv}
              className="btn btn-secondary"
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                borderColor: 'rgba(52, 211, 153, 0.4)',
                color: '#34d399'
              }}
            >
              📥 Export CSV / Excel
            </button>
            <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))' }}>
              Menampilkan {filteredTelemetry.length} dari {telemetryPangkalans.length} pangkalan
            </span>
          </div>

          {/* Tabel Intelijen Pangkalan Lengkap */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Nama Pangkalan & ID</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Pemilik & No HP</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>PT Agen Penyalur</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Wilayah</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Jatah Kuota</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Estimasi Laba</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Device & OS</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTelemetry.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        Belum ada data pangkalan tersinkronkan. Data akan otomatis masuk saat bot dijalankan oleh klien.
                      </td>
                    </tr>
                  ) : (
                    filteredTelemetry.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '14px 12px' }}>
                          <strong style={{ color: '#ffffff' }}>{p.merchant_name || 'Pangkalan MAP'}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            ID: {p.merchant_id || '-'}
                          </div>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <div>{p.owner_name || 'Owner'}</div>
                          {p.phone && (
                            <a
                              href={formatWaUrl(p.phone, `Halo Bapak/Ibu ${p.owner_name || p.merchant_name || ''}, kami dari Layanan Teknis Bot MAP Pertamina.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#38bdf8', fontSize: '0.8rem', textDecoration: 'underline' }}
                            >
                              💬 {p.phone}
                            </a>
                          )}
                        </td>
                        <td style={{ padding: '14px 12px', color: '#e2e8f0' }}>
                          <strong>{p.agent_name || '-'}</strong>
                        </td>
                        <td style={{ padding: '14px 12px', fontSize: '0.82rem' }}>
                          <div>{p.kota_kabupaten ? `${p.kota_kabupaten}, ${p.provinsi || ''}` : (p.address || '-')}</div>
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 800, color: '#38bdf8' }}>
                          {(p.kuota_pertamina_bulanan || 0).toLocaleString('id-ID')} Tabung
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 800, color: '#34d399' }}>
                          {formatRupiah(p.estimasi_laba_bulanan || 0)}
                          <div style={{ fontSize: '0.72rem', color: 'hsl(var(--text-muted))', fontWeight: 400 }}>
                            Omset: {formatRupiah(p.estimasi_omset_bulanan || 0)}
                          </div>
                        </td>
                        <td style={{ padding: '14px 12px', fontSize: '0.8rem' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: p.platform === 'ANDROID' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: p.platform === 'ANDROID' ? '#34d399' : '#38bdf8',
                            fontWeight: 700,
                            marginRight: '6px'
                          }}>
                            {p.platform || 'ANDROID'}
                          </span>
                          <span style={{ color: '#cbd5e1' }}>{p.device_model || '-'}</span>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.device_os || ''}</div>
                        </td>
                        <td style={{ padding: '14px 12px', fontSize: '0.8rem' }}>
                          <button
                            onClick={() => setSelectedPangkalan(p)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              background: 'rgba(139, 92, 246, 0.2)',
                              color: '#c4b5fd',
                              border: '1px solid rgba(139, 92, 246, 0.4)',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            🔍 Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Detail Pangkalan Popup */}
          {selectedPangkalan && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px'
            }}>
              <div className="glass-card animate-fade-in" style={{
                maxWidth: '650px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '30px',
                borderRadius: '24px',
                border: '1px solid rgba(139, 92, 246, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
                      {selectedPangkalan.merchant_name || 'Pangkalan MAP'}
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                      ID Registrasi Pertamina: {selectedPangkalan.merchant_id || '-'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPangkalan(null)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', fontSize: '0.85rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
                    <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Pemilik / Penanggung Jawab</div>
                    <strong style={{ color: '#ffffff' }}>{selectedPangkalan.owner_name || '-'}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
                    <div style={{ color: '#94a3b8', marginBottom: '4px' }}>PT Agen Penyalur</div>
                    <strong style={{ color: '#38bdf8' }}>{selectedPangkalan.agent_name || '-'}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
                    <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Kuota Pertamina Bulanan</div>
                    <strong style={{ color: '#34d399' }}>{(selectedPangkalan.kuota_pertamina_bulanan || 0).toLocaleString('id-ID')} Tabung</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px' }}>
                    <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Estimasi Modal Tebus DO</div>
                    <strong style={{ color: '#fbbf24' }}>{formatRupiah(selectedPangkalan.modal_tebus_per_do || 0)}</strong>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem' }}>
                  <h4 style={{ fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>📍 Alamat Lengkap</h4>
                  <p style={{ color: '#cbd5e1', lineHeight: '1.5' }}>
                    {selectedPangkalan.address || '-'}, {selectedPangkalan.kelurahan ? `Kel. ${selectedPangkalan.kelurahan}` : ''}, {selectedPangkalan.kecamatan ? `Kec. ${selectedPangkalan.kecamatan}` : ''}, {selectedPangkalan.kota_kabupaten || ''} {selectedPangkalan.provinsi || ''}
                  </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.85rem' }}>
                  <h4 style={{ fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>📱 Telemetri Perangkat & Koneksi</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: '#cbd5e1' }}>
                    <div><strong>Platform:</strong> {selectedPangkalan.platform}</div>
                    <div><strong>Model HP/PC:</strong> {selectedPangkalan.device_model || '-'}</div>
                    <div><strong>OS:</strong> {selectedPangkalan.device_os || '-'}</div>
                    <div><strong>IP & ISP:</strong> {selectedPangkalan.ip_address} ({selectedPangkalan.isp || 'Telkomsel'})</div>
                    <div><strong>HWID:</strong> <code style={{ fontSize: '0.75rem' }}>{selectedPangkalan.hwid}</code></div>
                    <div><strong>Versi Bot:</strong> v{selectedPangkalan.app_version || '1.0.9'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  {selectedPangkalan.phone && (
                    <a
                      href={formatWaUrl(selectedPangkalan.phone, `Halo Bapak/Ibu ${selectedPangkalan.owner_name || selectedPangkalan.merchant_name || ''}, kami dari Layanan Teknis Bot MAP Pertamina.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ padding: '10px 20px', borderRadius: '10px' }}
                    >
                      💬 Chat WhatsApp (+62)
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedPangkalan(null)}
                    className="btn btn-secondary"
                    style={{ padding: '10px 20px', borderRadius: '10px' }}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
