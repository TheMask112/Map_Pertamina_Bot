'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface PangkalanProfile {
  id: number;
  whatsapp: string;
  nama_pangkalan: string | null;
  nama_pemilik: string | null;
  kota: string | null;
  provinsi: string | null;
  alokasi_bulanan: number;
  jumlah_pelanggan: number;
  platform: string;
  app_version: string | null;
  last_active_at: string;
  total_sesi: number;
  total_nik_sukses: number;
  total_nik_gagal: number;
  created_at: string;
}

interface BotSession {
  id: string;
  whatsapp: string;
  hwid: string | null;
  platform: string;
  started_at: string | null;
  ended_at: string;
  duration_seconds: number;
  total_nik: number;
  nik_sukses: number;
  nik_gagal: number;
  nik_tidak_terdaftar: number;
  nik_kuota_habis: number;
  nik_meninggal: number;
  nik_dibawah_umur: number;
  nik_tidak_aktif: number;
  captcha_total: number;
  captcha_sukses: number;
  jumlah_tabung: number;
  avg_seconds_per_nik: number;
  batch_number: number;
  app_version: string | null;
  nama_pangkalan: string | null;
  created_at: string;
}

interface Order {
  id: string;
  paket: string;
  base_amount: number;
  amount: number;
  whatsapp: string;
  status: string;
  voucher_code: string | null;
  created_at: string;
  paid_at?: string | null;
  redeemed_at?: string | null;
  expires_at: string;
  kuota_terpakai?: number;
  hwid?: string | null;
  license_key?: string | null;
}

interface TelegramLink {
  chat_id: number;
  whatsapp: string;
  created_at: string;
}

interface PaketDetail {
  id: string;
  nama: string;
  kuota: number;
  harga: number;
  hari: number;
  icon: string;
  desc: string;
  fitur: string[];
}

export default function AdminPortal() {
  const [passcode, setPasscode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [telegramLinks, setTelegramLinks] = useState<TelegramLink[]>([]);
  const [paketsConfig, setPaketsConfig] = useState<Record<string, PaketDetail>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New States
  const [pangkalanProfiles, setPangkalanProfiles] = useState<PangkalanProfile[]>([]);
  const [botSessions, setBotSessions] = useState<BotSession[]>([]);
  const [selectedPangkalan, setSelectedPangkalan] = useState<PangkalanProfile | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'INTEL' | 'FINANCE' | 'RADAR' | 'ORDERS' | 'LICENSES' | 'PACKAGES' | 'MONITORING'>('COMMAND');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // ALL, TODAY, 7DAYS, MONTH
  const [licenseFilter, setLicenseFilter] = useState('ALL'); // ALL, REDEEMED, PAID, REVOKED

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modals & Action States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalType, setModalType] = useState<'RESET_HWID' | 'TOPUP_KUOTA' | 'CUSTOM_CREATE' | 'DETAIL' | 'DELETE' | null>(null);

  // Form Top Up Kuota
  const [topupDays, setTopupDays] = useState(30);
  const [resetUsage, setResetUsage] = useState(false);

  // Form Custom / Enterprise License
  const [customForm, setCustomForm] = useState({
    whatsapp: '',
    paket: 'ENTERPRISE',
    customPaketName: 'Enterprise Custom VIP',
    harga: 500000,
    kuota: 10000,
    isUnlimitedQuota: false,
    hari: 36500,
    isLifetime: true,
    hwid: '',
    canSubmitSales: true,
    canUpdateCustomer: true,
    canAutoCaptcha: true,
    canMultiBatch: true,
    maxDevices: 1,
  });

  // Modal Hasil Generator Lisensi
  const [generatedResult, setGeneratedResult] = useState<{
    voucherCode?: string;
    licenseKey?: string | null;
    whatsapp?: string;
    paket?: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

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
        headers: { 'Authorization': codeToTest }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setTelegramLinks(data.telegramLinks || []);
        setPangkalanProfiles(data.pangkalanProfiles || []);
        setBotSessions(data.botSessions || []);
        if (data.paketsConfig) setPaketsConfig(data.paketsConfig);
        setIsAuthorized(true);
        localStorage.setItem('gorillaz_admin_passcode', codeToTest);
      } else {
        setError('Passcode salah atau tidak sah.');
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

  // --- API Action Handlers ---
  const handleMarkAsPaid = async (orderId: string) => {
    if (!confirm('Apakah Anda yakin ingin menandai transaksi ini LUNAS secara manual? Voucher akan diterbitkan otomatis.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': passcode },
        body: JSON.stringify({ orderId, action: 'paid' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ Transaksi ditandai Lunas. Voucher: ' + (data.voucherCode || ''));
        checkAuth(passcode);
      } else {
        alert(data.error || 'Gagal memperbarui status order.');
      }
    } catch (err) {
      alert('Error memperbarui status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async (orderId: string) => {
    if (!confirm('AWAS: Apakah Anda yakin ingin MENCABUT lisensi ini? Voucher & lisensi akan dibatalkan permanen.')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': passcode },
        body: JSON.stringify({ orderId, action: 'revoke' })
      });
      if (res.ok) {
        showToast('✓ Lisensi berhasil dicabut.');
        checkAuth(passcode);
      } else {
        alert('Gagal mencabut lisensi.');
      }
    } catch (err) {
      alert('Error mencabut lisensi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetHwid = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': passcode },
        body: JSON.stringify({ orderId: selectedOrder.id, action: 'reset_hwid' })
      });
      if (res.ok) {
        showToast('✓ HWID berhasil di-reset! Pelanggan dapat login di PC/Android baru.');
        setModalType(null);
        setSelectedOrder(null);
        checkAuth(passcode);
      } else {
        alert('Gagal me-reset HWID.');
      }
    } catch (err) {
      alert('Error reset HWID.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTopupQuota = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': passcode },
        body: JSON.stringify({ 
          orderId: selectedOrder.id, 
          action: 'topup_quota',
          resetUsage,
          additionalDays: topupDays
        })
      });
      if (res.ok) {
        showToast('✓ Kuota / Masa aktif berhasil diperbarui!');
        setModalType(null);
        setSelectedOrder(null);
        checkAuth(passcode);
      } else {
        alert('Gagal memperbarui kuota.');
      }
    } catch (err) {
      alert('Error topup kuota.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': passcode },
        body: JSON.stringify({ orderId: selectedOrder.id, action: 'delete' })
      });
      if (res.ok) {
        showToast('✓ Order berhasil dihapus dari database.');
        setModalType(null);
        setSelectedOrder(null);
        checkAuth(passcode);
      } else {
        alert('Gagal menghapus order.');
      }
    } catch (err) {
      alert('Error menghapus order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCustomLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.whatsapp.trim()) {
      alert('Nomor WhatsApp wajib diisi.');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        action: 'create_custom_license',
        whatsapp: customForm.whatsapp.trim(),
        paket: customForm.paket || 'ENTERPRISE',
        namaPaket: customForm.customPaketName,
        harga: customForm.harga,
        kuota: customForm.isUnlimitedQuota ? 999999 : customForm.kuota,
        hari: customForm.isLifetime ? 36500 : customForm.hari,
        hwid: customForm.hwid.trim() || undefined,
        features: {
          can_submit_sales: customForm.canSubmitSales,
          can_update_customer: customForm.canUpdateCustomer,
          can_auto_captcha: customForm.canAutoCaptcha,
          can_multi_batch: customForm.canMultiBatch,
          max_devices: customForm.maxDevices,
          unlimited_quota: customForm.isUnlimitedQuota,
          is_lifetime: customForm.isLifetime
        }
      };

      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': passcode },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedResult({
          voucherCode: data.voucherCode,
          licenseKey: data.licenseKey,
          whatsapp: customForm.whatsapp,
          paket: customForm.customPaketName,
        });
        showToast('✓ Lisensi Enterprise Kustom berhasil dibuat!');
        checkAuth(passcode);
      } else {
        alert(data.error || 'Gagal membuat lisensi custom.');
      }
    } catch (err) {
      alert('Error server.');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper Format Rupiah
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Helper Format Tanggal
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Export to CSV Function
  const exportToCSV = (data: Order[], filename = 'laporan-orders-pertamina.csv') => {
    const headers = ['ID Order', 'Tanggal Dibuat', 'WhatsApp', 'Paket', 'Nominal', 'Status', 'Kode Voucher', 'HWID', 'Kuota Terpakai', 'Waktu Bayar', 'Waktu Redeem'];
    const rows = data.map(o => [
      o.id,
      new Date(o.created_at).toISOString(),
      o.whatsapp,
      o.paket,
      o.amount,
      o.status,
      o.voucher_code || '',
      o.hwid || '',
      o.kuota_terpakai || 0,
      o.paid_at || '',
      o.redeemed_at || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('✓ Laporan CSV berhasil diunduh.');
  };

  // --- Filtering & Metrics Calculation ---
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Search text
      const matchesSearch = 
        o.whatsapp.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.voucher_code && o.voucher_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.hwid && o.hwid.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Status Filter
      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;

      // Date Filter
      let matchesDate = true;
      if (dateFilter !== 'ALL') {
        const orderDate = new Date(o.created_at);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          matchesDate = orderDate.toDateString() === now.toDateString();
        } else if (dateFilter === '7DAYS') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = orderDate >= sevenDaysAgo;
        } else if (dateFilter === 'MONTH') {
          matchesDate = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchQuery, statusFilter, dateFilter]);

  // Filtered Licenses (for License Tab)
  const licenseOrders = useMemo(() => {
    return orders.filter(o => {
      const hasLicenseOrVoucher = Boolean(o.voucher_code || o.license_key || o.status === 'PAID' || o.status === 'REDEEMED' || o.status === 'REVOKED');
      if (!hasLicenseOrVoucher) return false;

      const matchesSearch = 
        o.whatsapp.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.voucher_code && o.voucher_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.hwid && o.hwid.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesLicenseStatus = true;
      if (licenseFilter === 'REDEEMED') matchesLicenseStatus = o.status === 'REDEEMED' || Boolean(o.hwid);
      else if (licenseFilter === 'PAID') matchesLicenseStatus = o.status === 'PAID' && !o.hwid;
      else if (licenseFilter === 'REVOKED') matchesLicenseStatus = o.status === 'REVOKED';

      return matchesSearch && matchesLicenseStatus;
    });
  }, [orders, searchQuery, licenseFilter]);

  // Paginated data for Orders Tab
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;

  // Key Metrics
  const metrics = useMemo(() => {
    const paidOrders = orders.filter(o => o.status === 'PAID' || o.status === 'REDEEMED');
    const totalRev = paidOrders.reduce((acc, curr) => acc + curr.amount, 0);

    const now = new Date();
    const todayOrders = paidOrders.filter(o => new Date(o.created_at).toDateString() === now.toDateString());
    const todayRev = todayOrders.reduce((acc, curr) => acc + curr.amount, 0);

    const activeLicenses = orders.filter(o => o.status === 'REDEEMED' || (o.status === 'PAID' && o.hwid)).length;
    const unusedVouchers = orders.filter(o => o.status === 'PAID' && !o.hwid).length;
    const pendingCount = orders.filter(o => o.status === 'PENDING').length;
    const successRate = orders.length > 0 ? Math.round((paidOrders.length / orders.length) * 100) : 0;
    
    return {
      revenue: totalRev,
      todayRevenue: todayRev,
      totalCount: orders.length,
      paidCount: paidOrders.length,
      activeLicenses,
      unusedVouchers,
      pendingCount,
      successRate
    };
  }, [orders]);

  // Generate Pesan WhatsApp untuk Customer
  const generateWhatsAppMessage = (voucher: string, key?: string | null, customPaket?: string) => {
    const text = `*PEMBELIAN LISENSI BOT MAP PERTAMINA BERHASIL* 🎉%0A%0A` +
      `Halo Bapak/Ibu Pangkalan,%0A` +
      `Terima kasih telah berlangganan *Bot MAP Pertamina (${customPaket || 'Lisensi'} )*.%0A%0A` +
      `🔑 *Kode Voucher Anda:* \`${voucher}\`%0A` +
      (key ? `🔐 *License Key RSA:* \`${key}\`%0A%0A` : `%0A`) +
      `*Cara Aktivasi:*%0A` +
      `1. Buka aplikasi Bot MAP Pertamina di PC / Android Anda.%0A` +
      `2. Masukkan kode voucher di atas pada menu Aktivasi.%0A` +
      `3. Bot siap digunakan untuk mempercepat input transaksi gas! 🚀%0A%0A` +
      `Jika butuh bantuan teknis, hubungi Admin via chat ini. Salam sukses!`;
    return text;
  };

  // --- LOGIN SCREEN ---
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
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔐</div>
            <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '8px' }}>Admin Portal</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem' }}>
              Masukkan Passcode Kunci Akses Administrator
            </p>
          </div>

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>PASSCODE ADMIN</label>
              <input
                type="password"
                className="form-input"
                placeholder="Masukkan Passcode..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: '1.1rem', padding: '12px' }}
                autoFocus
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontWeight: 700 }} disabled={loading}>
              {loading ? 'Memvalidasi...' : 'Masuk ke Portal Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN ADMIN DASHBOARD ---
  return (
    <div style={{ padding: '30px 20px', maxWidth: '1360px', margin: '0 auto' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0f172a',
          border: '1px solid #38bdf8',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <span>📢</span> {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="animate-fade-in" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
        paddingBottom: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem'
          }}>
            🛡️
          </div>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800 }}>Admin Command Center</h1>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
              Pusat Kontrol Lisensi, Transaksi & Paket Bot MAP Pertamina
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => checkAuth(passcode)} 
            disabled={loading}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            {loading ? '🔄 Menyinkron...' : '🔄 Refresh Data'}
          </button>
          <button 
            className="btn" 
            onClick={handleLogout}
            style={{ padding: '8px 14px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            Keluar
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '28px',
        overflowX: 'auto',
        paddingBottom: '6px'
      }}>
        {[
          { id: 'COMMAND', label: '📊 Pusat Komando', badge: null },
          { id: 'INTEL', label: '🔍 Intelijen Pangkalan', badge: null },
          { id: 'FINANCE', label: '💰 Analisa Keuangan', badge: null },
          { id: 'RADAR', label: '🎯 Radar Peluang', badge: null },
          { id: 'ORDERS', label: '💳 Transaksi', badge: metrics.pendingCount > 0 ? `${metrics.pendingCount} Pending` : null, badgeColor: 'hsl(var(--warning))' },
          { id: 'LICENSES', label: '🔑 Lisensi & HWID', badge: `${metrics.activeLicenses} Aktif`, badgeColor: 'hsl(var(--success))' },
          { id: 'PACKAGES', label: '📦 Katalog & Enterprise', badge: 'VIP' },
          { id: 'MONITORING', label: '🤖 Monitoring', badge: telegramLinks.length > 0 ? `${telegramLinks.length}` : null },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setCurrentPage(1); }}
            style={{
              padding: '12px 18px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              border: activeTab === tab.id ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)',
              background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(2, 132, 199, 0.25) 0%, rgba(56, 189, 248, 0.15) 100%)' : 'rgba(255, 255, 255, 0.02)',
              color: activeTab === tab.id ? '#ffffff' : 'hsl(var(--text-secondary))',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.label}</span>
            {tab.badge && (
              <span style={{
                fontSize: '0.75rem',
                padding: '2px 7px',
                borderRadius: '10px',
                background: tab.badgeColor ? `${tab.badgeColor}22` : 'rgba(255, 255, 255, 0.1)',
                color: tab.badgeColor || 'hsl(var(--text-primary))',
                border: `1px solid ${tab.badgeColor || 'rgba(255, 255, 255, 0.2)'}`
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PUSAT KOMANDO (COMMAND) */}
      {/* ========================================================================= */}
      {activeTab === 'COMMAND' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '8px' }}>Total Omset Lunas</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'hsl(var(--success))' }}>{formatRupiah(orders.filter(o => o.status === 'PAID' || o.status === 'REDEEMED').reduce((a, b) => a + b.amount, 0))}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '8px' }}>Omset Bulan Ini</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8' }}>{formatRupiah(orders.filter(o => (o.status === 'PAID' || o.status === 'REDEEMED') && o.paid_at && new Date(o.paid_at).getMonth() === new Date().getMonth()).reduce((a, b) => a + b.amount, 0))}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '8px' }}>Pangkalan Aktif</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{pangkalanProfiles.filter(p => p.last_active_at && new Date(p.last_active_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '8px' }}>Total Tabung Diproses</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{botSessions.reduce((a, b) => a + (b.nik_sukses * b.jumlah_tabung), 0).toLocaleString()}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '8px' }}>Tingkat Keberhasilan</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: 'hsl(var(--warning))' }}>{botSessions.length > 0 ? Math.round(botSessions.reduce((a, b) => a + (b.nik_sukses / (b.total_nik || 1)), 0) / botSessions.length * 100) : 0}%</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '8px' }}>Sesi Hari Ini</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{botSessions.filter(s => new Date(s.ended_at).toDateString() === new Date().toDateString()).length}</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Trend Omset (6 Bulan Terakhir)</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(() => {
                    const months: any = {};
                    for(let i=5; i>=0; i--) {
                      const d = new Date();
                      d.setMonth(d.getMonth() - i);
                      months[`${d.getFullYear()}-${d.getMonth()}`] = { name: d.toLocaleString('id-ID', {month: 'short'}), total: 0 };
                    }
                    orders.filter(o => o.status === 'PAID' || o.status === 'REDEEMED').forEach(o => {
                      if(!o.paid_at) return;
                      const d = new Date(o.paid_at);
                      const key = `${d.getFullYear()}-${d.getMonth()}`;
                      if(months[key]) months[key].total += o.amount;
                    });
                    return Object.values(months);
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="#cbd5e1" />
                    <YAxis stroke="#cbd5e1" tickFormatter={(val) => `Rp${val/1000}k`} />
                    <Tooltip formatter={(val: any) => formatRupiah(Number(val))} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                    <Bar dataKey="total" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>5 Pangkalan Paling Aktif</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pangkalanProfiles.sort((a,b) => b.total_sesi - a.total_sesi).slice(0, 5).map(p => (
                  <div key={p.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontWeight: 'bold' }}>{p.nama_pangkalan || p.whatsapp}</div>
                    <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>{p.total_sesi} Sesi | {p.total_nik_sukses} NIK Sukses</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>5 Transaksi Terakhir</h3>
              <button onClick={() => setActiveTab('ORDERS')} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>Lihat Semua Transaksi →</button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left', color: 'hsl(var(--text-secondary))' }}>
                    <th style={{ padding: '10px 12px' }}>Tanggal</th>
                    <th style={{ padding: '10px 12px' }}>WhatsApp</th>
                    <th style={{ padding: '10px 12px' }}>Paket</th>
                    <th style={{ padding: '10px 12px' }}>Nominal</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>Voucher</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 5).map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px' }}>{formatDate(o.created_at)}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{o.whatsapp}</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.8rem', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>{o.paket}</span></td>
                      <td style={{ padding: '12px', fontWeight: 700 }}>{formatRupiah(o.amount)}</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: o.status === 'PAID' || o.status === 'REDEEMED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)', color: o.status === 'PAID' || o.status === 'REDEEMED' ? '#4ade80' : '#facc15' }}>{o.status}</span></td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>{o.voucher_code || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'INTEL' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Total Pangkalan Terdaftar</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{pangkalanProfiles.length}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Pangkalan Aktif (7 hari)</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#4ade80' }}>{pangkalanProfiles.filter(p => p.last_active_at && new Date(p.last_active_at) > new Date(Date.now() - 7*86400000)).length}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Rata-rata NIK/Sesi</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{botSessions.length > 0 ? Math.round(botSessions.reduce((a,b)=>a+b.total_nik,0)/botSessions.length) : 0}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Pangkalan Baru Minggu Ini</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#facc15' }}>{pangkalanProfiles.filter(p => p.created_at && new Date(p.created_at) > new Date(Date.now() - 7*86400000)).length}</p>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.015)' }}>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Nama Pangkalan</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>WhatsApp</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Kota</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Paket</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Total NIK Diproses</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pangkalanProfiles.map(p => {
                  const pOrder = orders.find(o => o.whatsapp === p.whatsapp);
                  const isAktif = p.last_active_at && new Date(p.last_active_at) > new Date(Date.now() - 3*86400000);
                  const isTidur = p.last_active_at && !isAktif && new Date(p.last_active_at) > new Date(Date.now() - 14*86400000);
                  const statusLabel = isAktif ? '🟢 Aktif' : isTidur ? '🟡 Tidur' : '🔴 Hilang';
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 600 }}>{p.nama_pangkalan || 'Belum Diketahui'} {p.platform === 'android' ? '📱' : '💻'}</td>
                      <td style={{ padding: '14px 18px' }}><a href={`https://wa.me/${p.whatsapp.replace(/\D/g,'')}`} target="_blank" style={{ color: '#38bdf8' }}>{p.whatsapp}</a></td>
                      <td style={{ padding: '14px 18px' }}>{p.kota || '-'}</td>
                      <td style={{ padding: '14px 18px' }}>{pOrder?.paket || '-'}</td>
                      <td style={{ padding: '14px 18px' }}>{p.total_nik_sukses}</td>
                      <td style={{ padding: '14px 18px' }}>{statusLabel}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'FINANCE' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '20px' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Total Omset Sepanjang Masa</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{formatRupiah(orders.filter(o => o.status === 'PAID' || o.status === 'REDEEMED').reduce((a, b) => a + b.amount, 0))}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Omset Bulan Ini</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{formatRupiah(orders.filter(o => (o.status === 'PAID' || o.status === 'REDEEMED') && o.paid_at && new Date(o.paid_at).getMonth() === new Date().getMonth()).reduce((a, b) => a + b.amount, 0))}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Omset Minggu Ini</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{formatRupiah(orders.filter(o => (o.status === 'PAID' || o.status === 'REDEEMED') && o.paid_at && new Date(o.paid_at) > new Date(Date.now() - 7*86400000)).reduce((a, b) => a + b.amount, 0))}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Omset Hari Ini</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{formatRupiah(orders.filter(o => (o.status === 'PAID' || o.status === 'REDEEMED') && o.paid_at && new Date(o.paid_at).toDateString() === new Date().toDateString()).reduce((a, b) => a + b.amount, 0))}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Omset per Paket</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={(() => {
                      const pkgs: any = {};
                      orders.filter(o => o.status === 'PAID' || o.status === 'REDEEMED').forEach(o => {
                        pkgs[o.paket] = (pkgs[o.paket] || 0) + o.amount;
                      });
                      return Object.entries(pkgs).map(([name, value]) => ({name, value}));
                    })()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      <Cell fill="#38bdf8" />
                      <Cell fill="#4ade80" />
                      <Cell fill="#facc15" />
                      <Cell fill="#f87171" />
                    </Pie>
                    <Tooltip formatter={(val: any) => formatRupiah(Number(val))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass-card">
               <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Rekomendasi Cerdas</h3>
               <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', marginBottom: '10px' }}>💡 Berdasarkan data 3 bulan terakhir, kami sarankan follow up pangkalan yang kuotanya sudah lebih dari 80% terpakai.</p>
               <p style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))' }}>🚀 Paket paling populer: {Object.entries(orders.filter(o => o.status === 'PAID' || o.status === 'REDEEMED').reduce((acc:any, curr) => { acc[curr.paket] = (acc[curr.paket] || 0) + 1; return acc; }, {})).sort((a:any, b:any) => b[1] - a[1])[0]?.[0] || 'Belum ada'}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'RADAR' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#facc15' }}>⏳ Belum Bayar ({orders.filter(o => o.status === 'PENDING' || o.status === 'EXPIRED').length})</h3>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '16px' }}>Potensi: {formatRupiah(orders.filter(o => o.status === 'PENDING' || o.status === 'EXPIRED').reduce((a,b)=>a+b.amount,0))}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {orders.filter(o => o.status === 'PENDING' || o.status === 'EXPIRED').map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div><div style={{ fontWeight: 600 }}>{o.whatsapp}</div><div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>{o.paket} - {formatRupiah(o.amount)}</div></div>
                    <button className="btn btn-secondary" onClick={() => window.open(`https://wa.me/${o.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(`Halo kak! Pesanan Paket ${o.paket} Anda (${formatRupiah(o.amount)}) masih menunggu pembayaran. Ada yang bisa kami bantu? 😊`)}`)} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>💬 Follow-up</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171' }}>😴 Pangkalan Tidur</h3>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '16px' }}>Tidak aktif 7-30 hari terakhir</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pangkalanProfiles.filter(p => p.last_active_at && new Date(p.last_active_at) < new Date(Date.now() - 7*86400000) && new Date(p.last_active_at) > new Date(Date.now() - 30*86400000)).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div><div style={{ fontWeight: 600 }}>{p.nama_pangkalan || p.whatsapp}</div></div>
                    <button className="btn btn-secondary" onClick={() => window.open(`https://wa.me/${p.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(`Halo kak! Sudah lama tidak memakai bot Pertamina. Ada kendala yang bisa kami bantu? 🤝`)}`)} style={{ fontSize: '0.75rem', padding: '4px 8px' }}>💬 Tanya Kendala</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MANAJEMEN TRANSAKSI & BILLING (ORDERS) */}
      {/* ========================================================================= */}
      {activeTab === 'ORDERS' && (
        <div className="animate-fade-in">
          {/* Controls: Search, Filters & Export */}
          <div className="glass-card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Search Bar */}
              <div style={{ flex: '1 1 280px', maxWidth: '400px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Cari WhatsApp, ID order, atau voucher..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['ALL', 'PENDING', 'PAID', 'REDEEMED', 'EXPIRED', 'REVOKED'].map(st => (
                  <button
                    key={st}
                    onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: statusFilter === st ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.03)',
                      color: statusFilter === st ? '#ffffff' : 'hsl(var(--text-secondary))'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Date Filter */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select
                  className="form-input"
                  value={dateFilter}
                  onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                  style={{ padding: '6px 10px', fontSize: '0.85rem', width: 'auto' }}
                >
                  <option value="ALL">Semua Waktu</option>
                  <option value="TODAY">Hari Ini</option>
                  <option value="7DAYS">7 Hari Terakhir</option>
                  <option value="MONTH">Bulan Ini</option>
                </select>

                <button 
                  className="btn btn-secondary" 
                  onClick={() => exportToCSV(filteredOrders, 'transaksi-filtered.csv')}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  📥 Export CSV
                </button>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="glass-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '16px', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.015)' }}>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Waktu</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>WhatsApp Pangkalan</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Paket</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Nominal</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Status</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Voucher</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))', textAlign: 'center' }}>Aksi Admin</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                      Tidak ada data transaksi yang cocok dengan filter.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div>{formatDate(o.created_at)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>ID: {o.id.slice(0, 8)}...</div>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 600 }}>
                        <a 
                          href={`https://wa.me/${o.whatsapp.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ color: '#38bdf8', textDecoration: 'underline' }}
                        >
                          {o.whatsapp}
                        </a>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: o.paket === 'PRO' ? 'hsla(var(--accent), 0.15)' : 'hsla(var(--primary), 0.15)',
                          color: o.paket === 'PRO' ? 'hsl(var(--accent))' : 'hsl(var(--primary))'
                        }}>
                          {o.paket}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                        {formatRupiah(o.amount)}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
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
                      <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8' }}>
                        {o.voucher_code || '-'}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {o.status === 'PENDING' || o.status === 'EXPIRED' ? (
                            <button 
                              className="btn btn-success"
                              onClick={() => handleMarkAsPaid(o.id)}
                              disabled={actionLoading}
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                              title="Konfirmasi Pembayaran Manual"
                            >
                              ✓ Lunas
                            </button>
                          ) : null}

                          {o.voucher_code && (
                            <button 
                              className="btn btn-secondary"
                              onClick={() => {
                                const msg = generateWhatsAppMessage(o.voucher_code || '', o.license_key, o.paket);
                                window.open(`https://wa.me/${o.whatsapp.replace(/\D/g, '')}?text=${msg}`, '_blank');
                              }}
                              style={{ padding: '5px 10px', fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}
                              title="Kirim Pesan WhatsApp ke Pelanggan"
                            >
                              💬 Kirim WA
                            </button>
                          )}

                          {o.status === 'PAID' || o.status === 'REDEEMED' ? (
                            <button 
                              className="btn"
                              onClick={() => handleRevoke(o.id)}
                              disabled={actionLoading}
                              style={{ padding: '5px 10px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                              title="Cabut Lisensi"
                            >
                              Cabut
                            </button>
                          ) : null}

                          <button 
                            className="btn btn-secondary"
                            onClick={() => { setSelectedOrder(o); setModalType('DELETE'); }}
                            style={{ padding: '5px 8px', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}
                            title="Hapus Order"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>
              Menampilkan {paginatedOrders.length} dari total {filteredOrders.length} transaksi
            </p>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                ← Sebelumnya
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 8px' }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button 
                className="btn btn-secondary" 
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Berikutnya →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MANAJEMEN LISENSI & PERANGKAT (LICENSES & HWID) */}
      {/* ========================================================================= */}
      {activeTab === 'LICENSES' && (
        <div className="animate-fade-in">
          {/* Controls */}
          <div className="glass-card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: '1 1 280px', maxWidth: '400px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="🔍 Cari WhatsApp, HWID, atau Kode Voucher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: 'Semua Lisensi' },
                  { id: 'REDEEMED', label: 'Terikat Mesin (Aktif)' },
                  { id: 'PAID', label: 'Belum Terikat HWID' },
                  { id: 'REVOKED', label: 'Dicabut' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setLicenseFilter(f.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      background: licenseFilter === f.id ? 'hsl(var(--primary))' : 'rgba(255, 255, 255, 0.03)',
                      color: licenseFilter === f.id ? '#ffffff' : 'hsl(var(--text-secondary))'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* License Table */}
          <div className="glass-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.015)' }}>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>WhatsApp / Pemilik</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Kode Voucher & Lisensi</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Hardware ID (HWID)</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Kuota Terpakai</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Status</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))', textAlign: 'center' }}>Operasional HWID</th>
                </tr>
              </thead>
              <tbody>
                {licenseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                      Tidak ada lisensi ditemukan.
                    </td>
                  </tr>
                ) : (
                  licenseOrders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600 }}>{o.whatsapp}</div>
                        <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Paket: {o.paket}</div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#38bdf8', fontSize: '1rem' }}>
                            {o.voucher_code || '-'}
                          </span>
                          {o.voucher_code && (
                            <button 
                              onClick={() => { navigator.clipboard.writeText(o.voucher_code || ''); showToast('Voucher disalin!'); }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}
                              title="Salin Voucher"
                            >
                              📋
                            </button>
                          )}
                        </div>
                        {o.license_key && (
                          <div style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Key: {o.license_key.slice(0, 20)}...
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        {o.hwid ? (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 8px', borderRadius: '6px', color: '#e2e8f0' }}>
                            {o.hwid}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'hsl(var(--warning))', fontStyle: 'italic' }}>
                            Belum terikat perangkat
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600 }}>
                          {o.kuota_terpakai || 0} Tabung NIK
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                          Kadaluarsa: {formatDate(o.expires_at)}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: o.hwid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: o.hwid ? '#4ade80' : '#facc15'
                        }}>
                          {o.hwid ? 'Terikat PC/HP' : 'Ready to Bind'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {/* Tombol Reset HWID */}
                          <button 
                            className="btn btn-secondary"
                            onClick={() => { setSelectedOrder(o); setModalType('RESET_HWID'); }}
                            style={{ padding: '5px 10px', fontSize: '0.75rem', color: '#38bdf8' }}
                            title="Reset HWID agar pelanggan bisa ganti PC/HP"
                          >
                            🔄 Reset HWID
                          </button>

                          {/* Tombol Topup Kuota */}
                          <button 
                            className="btn btn-secondary"
                            onClick={() => { setSelectedOrder(o); setModalType('TOPUP_KUOTA'); }}
                            style={{ padding: '5px 10px', fontSize: '0.75rem', color: '#4ade80' }}
                            title="Reset kuota terpakai atau tambah masa aktif"
                          >
                            ➕ Top-up
                          </button>

                          {/* Tombol Cabut */}
                          {o.status !== 'REVOKED' && (
                            <button 
                              className="btn"
                              onClick={() => handleRevoke(o.id)}
                              style={{ padding: '5px 8px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                              title="Cabut Lisensi"
                            >
                              Cabut
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: KATALOG PAKET & GENERATOR ENTERPRISE KUSTOM */}
      {/* ========================================================================= */}
      {activeTab === 'PACKAGES' && (
        <div className="animate-fade-in">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px',
            alignItems: 'start'
          }}>
            {/* Form Generator Lisensi Enterprise Kustom */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <span style={{ fontSize: '1.8rem' }}>👑</span>
                <div>
                  <h3 className="gradient-text" style={{ fontSize: '1.3rem' }}>Generator Lisensi Enterprise</h3>
                  <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
                    Buat lisensi kustom untuk agen/pangkalan dengan kuota & fitur khusus
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateCustomLicense}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">NO. WHATSAPP KLIEN / AGEN</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: 081234567890"
                    value={customForm.whatsapp}
                    onChange={(e) => setCustomForm({ ...customForm, whatsapp: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">NAMA PAKET / KODE</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="ENTERPRISE_VIP"
                      value={customForm.customPaketName}
                      onChange={(e) => setCustomForm({ ...customForm, customPaketName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">HARGA KESEPAKATAN (RP)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={customForm.harga}
                      onChange={(e) => setCustomForm({ ...customForm, harga: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Kuota & Durasi */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">KUOTA (TABUNG NIK)</label>
                    <input
                      type="number"
                      className="form-input"
                      disabled={customForm.isUnlimitedQuota}
                      value={customForm.kuota}
                      onChange={(e) => setCustomForm({ ...customForm, kuota: Number(e.target.value) })}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#38bdf8', marginTop: '6px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={customForm.isUnlimitedQuota} 
                        onChange={(e) => setCustomForm({ ...customForm, isUnlimitedQuota: e.target.checked })}
                      />
                      Kuota Unlimited
                    </label>
                  </div>

                  <div className="form-group">
                    <label className="form-label">MASA AKTIF (HARI)</label>
                    <input
                      type="number"
                      className="form-input"
                      disabled={customForm.isLifetime}
                      value={customForm.hari}
                      onChange={(e) => setCustomForm({ ...customForm, hari: Number(e.target.value) })}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#38bdf8', marginTop: '6px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={customForm.isLifetime} 
                        onChange={(e) => setCustomForm({ ...customForm, isLifetime: e.target.checked })}
                      />
                      Permanen / Lifetime (100 Thn)
                    </label>
                  </div>
                </div>

                {/* Target HWID (Opsional) */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">TARGET HARDWARE ID / HWID (OPSIONAL)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Kosongkan jika ingin customer redeem sendiri via voucher"
                    value={customForm.hwid}
                    onChange={(e) => setCustomForm({ ...customForm, hwid: e.target.value })}
                  />
                </div>

                {/* Feature Toggles */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--text-secondary))', marginBottom: '10px', textTransform: 'uppercase' }}>
                    ⚙️ Penyesuaian Fitur Enterprise:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={customForm.canSubmitSales} 
                        onChange={(e) => setCustomForm({ ...customForm, canSubmitSales: e.target.checked })}
                      />
                      Catat Penjualan
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={customForm.canUpdateCustomer} 
                        onChange={(e) => setCustomForm({ ...customForm, canUpdateCustomer: e.target.checked })}
                      />
                      Update Pelanggan Saja
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={customForm.canAutoCaptcha} 
                        onChange={(e) => setCustomForm({ ...customForm, canAutoCaptcha: e.target.checked })}
                      />
                      Bypass AI Captcha
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={customForm.canMultiBatch} 
                        onChange={(e) => setCustomForm({ ...customForm, canMultiBatch: e.target.checked })}
                      />
                      Multi-Batch Excel
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: 700 }} disabled={actionLoading}>
                  {actionLoading ? 'Membuat Lisensi...' : '⚡ Generate Lisensi Enterprise'}
                </button>
              </form>
            </div>

            {/* Katalog Paket Standar Publik */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="glass-card" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>Katalog Paket Publik Website</h3>
                <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '16px' }}>
                  Paket-paket berikut aktif ditampilkan di halaman landing page & checkout:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.values(paketsConfig).map((pkg) => (
                    <div key={pkg.id} style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.2rem' }}>{pkg.icon}</span>
                          <strong style={{ fontSize: '1rem' }}>Paket {pkg.nama}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginTop: '4px' }}>
                          Kuota: {pkg.kuota.toLocaleString()} Tabung | Durasi: {pkg.hari >= 36500 ? 'Lifetime' : `${pkg.hari} Hari`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#4ade80' }}>
                          {formatRupiah(pkg.harga)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PANGKALAN & MONITORING TELEGRAM */}
      {/* ========================================================================= */}
      {activeTab === 'MONITORING' && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Integrasi WhatsApp & Telegram Pangkalan</h3>
                <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
                  Daftar pangkalan yang terhubung dengan bot keygen & command center Telegram
                </p>
              </div>
            </div>

            {telegramLinks.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                Belum ada pangkalan yang melakukan pairing ke bot Telegram.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'left', color: 'hsl(var(--text-secondary))' }}>
                    <th style={{ padding: '12px' }}>Telegram Chat ID</th>
                    <th style={{ padding: '12px' }}>WhatsApp Terhubung</th>
                    <th style={{ padding: '12px' }}>Waktu Pairing</th>
                  </tr>
                </thead>
                <tbody>
                  {telegramLinks.map((link, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', color: '#38bdf8' }}>{link.chat_id}</td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>{link.whatsapp}</td>
                      <td style={{ padding: '12px', color: 'hsl(var(--text-muted))' }}>{formatDate(link.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET HWID */}
      {/* ========================================================================= */}
      {modalType === 'RESET_HWID' && selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 10000
        }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '30px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '10px' }}>🔄 Konfirmasi Reset HWID</h3>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Tindakan ini akan <strong>melepaskan kaitan Hardware ID</strong> dari lisensi pangkalan (<strong>{selectedOrder.whatsapp}</strong>).
              Setelah di-reset, pangkalan dapat mengaktifkan kembali voucher di PC atau HP Android yang baru.
            </p>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
              <div><strong>Voucher:</strong> <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{selectedOrder.voucher_code}</span></div>
              <div><strong>HWID Sebelumnya:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedOrder.hwid || '-'}</span></div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModalType(null)} disabled={actionLoading}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleResetHwid} disabled={actionLoading}>
                {actionLoading ? 'Memproses...' : 'Ya, Reset HWID'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TOP UP KUOTA */}
      {/* ========================================================================= */}
      {modalType === 'TOPUP_KUOTA' && selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 10000
        }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '30px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '10px' }}>➕ Top-up Kuota & Masa Aktif</h3>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginBottom: '16px' }}>
              Pelanggan: <strong>{selectedOrder.whatsapp}</strong> ({selectedOrder.paket})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={resetUsage} 
                  onChange={(e) => setResetUsage(e.target.checked)} 
                />
                <strong>Reset Pemakaian Kuota</strong> (Jadikan 0 tabung terpakai kembali)
              </label>

              <div className="form-group">
                <label className="form-label">TAMBAH MASA AKTIF (HARI)</label>
                <input
                  type="number"
                  className="form-input"
                  value={topupDays}
                  onChange={(e) => setTopupDays(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModalType(null)} disabled={actionLoading}>
                Batal
              </button>
              <button className="btn btn-success" onClick={handleTopupQuota} disabled={actionLoading}>
                {actionLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: HASIL GENERATE LISENSI ENTERPRISE */}
      {/* ========================================================================= */}
      {generatedResult && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 10000
        }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '520px', width: '100%', padding: '30px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
              <h3 className="gradient-text" style={{ fontSize: '1.4rem' }}>Lisensi Berhasil Dibuat!</h3>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem' }}>
                Kirimkan kode voucher atau pesan WhatsApp di bawah ke pelanggan:
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>KODE VOUCHER:</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'monospace' }}>
                  {generatedResult.voucherCode}
                </div>
              </div>

              {generatedResult.licenseKey && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>LICENSE KEY RSA (INSTAN):</span>
                  <div style={{ fontSize: '0.75rem', wordBreak: 'break-all', fontFamily: 'monospace', color: 'hsl(var(--text-muted))', maxHeight: '70px', overflowY: 'auto' }}>
                    {generatedResult.licenseKey}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  navigator.clipboard.writeText(generatedResult.voucherCode || '');
                  showToast('Voucher disalin!');
                }}
                style={{ flex: 1 }}
              >
                📋 Salin Voucher
              </button>
              <button 
                className="btn btn-success" 
                onClick={() => {
                  const msg = generateWhatsAppMessage(generatedResult.voucherCode || '', generatedResult.licenseKey, generatedResult.paket);
                  window.open(`https://wa.me/${(generatedResult.whatsapp || '').replace(/\D/g, '')}?text=${msg}`, '_blank');
                }}
                style={{ flex: 1.5 }}
              >
                💬 Kirim via WhatsApp
              </button>
              <button 
                className="btn" 
                onClick={() => setGeneratedResult(null)}
                style={{ background: 'rgba(255, 255, 255, 0.1)' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI DELETE */}
      {/* ========================================================================= */}
      {modalType === 'DELETE' && selectedOrder && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 10000
        }}>
          <div className="glass-card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '30px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171', marginBottom: '10px' }}>🗑️ Hapus Order?</h3>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', lineHeight: '1.5', marginBottom: '20px' }}>
              Apakah Anda yakin ingin menghapus order <strong>{selectedOrder.whatsapp}</strong> ({selectedOrder.paket})? Tindakan ini permanen.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModalType(null)} disabled={actionLoading}>
                Batal
              </button>
              <button className="btn btn-danger" onClick={handleDeleteOrder} disabled={actionLoading} style={{ background: '#ef4444' }}>
                {actionLoading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

