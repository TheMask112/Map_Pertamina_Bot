'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface Order {
  id: string;
  paket: string;
  base_amount: number;
  amount: number;
  whatsapp: string;
  status: string;
  voucher_code: string | null;
  hwid: string | null;
  license_key: string | null;
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

export default function AdminPortal() {
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [affiliates, setAffiliates] = useState<AffiliateItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [adminTab, setAdminTab] = useState<'orders' | 'affiliates'>('orders');
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
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>WhatsApp</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Paket</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Nominal</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Mitra Ref</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600 }}>Voucher Code</th>
                  <th style={{ padding: '16px 24px', color: 'hsl(var(--text-secondary))', fontWeight: 600, textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
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
                      <td style={{ padding: '18px 24px', fontWeight: 600 }}>
                        <a 
                          href={`https://wa.me/${o.whatsapp.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'hsl(var(--secondary))', textDecoration: 'underline' }}
                        >
                          {o.whatsapp}
                        </a>
                      </td>
                      <td style={{ padding: '18px 24px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: o.paket === 'PRO' ? 'hsla(var(--accent), 0.15)' : 'hsla(var(--primary), 0.15)',
                          color: o.paket === 'PRO' ? 'hsl(var(--accent))' : 'hsl(var(--primary))'
                        }}>
                          {o.paket}
                        </span>
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
                              🔑 Salin Lisensi
                            </button>
                          </div>
                        )}
                        {!o.voucher_code && !o.license_key && '-'}
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
                          <span style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{p.affiliate_whatsapp}</span>
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
                          <a href={`https://wa.me/${a.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#34d399', textDecoration: 'underline' }}>
                            {a.whatsapp}
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
    </div>
  );
}
