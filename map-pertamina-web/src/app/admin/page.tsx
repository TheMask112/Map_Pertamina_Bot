'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const MapPangkalan = dynamic(() => import('@/components/MapPangkalan'), {
  ssr: false,
  loading: () => <p>Memuat Peta Spasial...</p>
});

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

interface PangkalanTelemetry {
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
  jadwal_pasokan: string | null;
  total_konsumen_unik: number;
  persen_dtks: number;
  skor_kepatuhan: number;
  anomali_overlimit_count: number;
  metode_bayar_tunai_persen: number;
  metode_bayar_qris_persen: number;
  avg_speed_seconds: number;
  peak_hours: string | null;
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
  latitude?: number;
  longitude?: number;
  inbox_alerts?: string;
  ram_usage_mb?: number;
  ping_ms?: number;
  logistic_history?: any;
  nik_demographics?: any;
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
  const [pangkalanTelemetry, setPangkalanTelemetry] = useState<PangkalanTelemetry[]>([]);
  const [botSessions, setBotSessions] = useState<BotSession[]>([]);
  const [selectedPangkalan, setSelectedPangkalan] = useState<PangkalanProfile | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'INTEL' | 'FINANCE' | 'RADAR' | 'MAP' | 'COMPLIANCE' | 'LOGISTIC' | 'HARDWARE' | 'ORDERS' | 'LICENSES' | 'PACKAGES' | 'MONITORING'>('COMMAND');

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
        setPangkalanTelemetry(data.pangkalanTelemetry || []);
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

  // Agregat Data Telemetry Scrape MyPertamina
  const telemetrySummary = useMemo(() => {
    const totalPangkalan = pangkalanTelemetry.length;
    const totalTabung = pangkalanTelemetry.reduce((acc, cur) => acc + (Number(cur.kuota_pertamina_bulanan) || 0), 0);
    const totalOmset = pangkalanTelemetry.reduce((acc, cur) => acc + (Number(cur.estimasi_omset_bulanan) || 0), 0);
    const totalLaba = pangkalanTelemetry.reduce((acc, cur) => acc + (Number(cur.estimasi_laba_bulanan) || 0), 0);
    const totalModalDo = pangkalanTelemetry.reduce((acc, cur) => acc + (Number(cur.modal_tebus_per_do) || 0), 0);
    const totalNik = pangkalanTelemetry.reduce((acc, cur) => acc + (Number(cur.total_nik_processed) || 0), 0);
    const totalSukses = pangkalanTelemetry.reduce((acc, cur) => acc + (Number(cur.success_count) || 0), 0);
    
    // Group by Agent
    const agentMap: Record<string, { count: number; tabung: number; omset: number }> = {};
    pangkalanTelemetry.forEach(p => {
      const ag = p.agent_name || 'PT. Agen Penyalur LPG';
      if (!agentMap[ag]) agentMap[ag] = { count: 0, tabung: 0, omset: 0 };
      agentMap[ag].count += 1;
      agentMap[ag].tabung += Number(p.kuota_pertamina_bulanan) || 0;
      agentMap[ag].omset += Number(p.estimasi_omset_bulanan) || 0;
    });
    const agentList = Object.entries(agentMap).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count);

    // Group by HWID (Joki / Multi-Pangkalan)
    const hwidMap: Record<string, PangkalanTelemetry[]> = {};
    pangkalanTelemetry.forEach(p => {
      const h = p.hwid || 'UNKNOWN';
      if (!hwidMap[h]) hwidMap[h] = [];
      hwidMap[h].push(p);
    });
    const multiPangkalanOperators = Object.entries(hwidMap).filter(([_, list]) => list.length > 1).map(([hwid, list]) => ({
      hwid,
      count: list.length,
      pangkalans: list,
      totalTabung: list.reduce((acc, c) => acc + (Number(c.kuota_pertamina_bulanan) || 0), 0),
      totalOmset: list.reduce((acc, c) => acc + (Number(c.estimasi_omset_bulanan) || 0), 0),
      owner: list[0]?.owner_name || list[0]?.merchant_name || 'Operator',
      phone: list[0]?.phone || ''
    })).sort((a, b) => b.count - a.count);

    // Low Quota (< 150 tabung sisa)
    const lowQuotaList = pangkalanTelemetry.filter(p => Number(p.sisa_kuota_pertamina) > 0 && Number(p.sisa_kuota_pertamina) <= 150);

    return {
      totalPangkalan,
      totalTabung,
      totalOmset,
      totalLaba,
      totalModalDo,
      totalNik,
      totalSukses,
      agentList,
      totalAgents: agentList.length,
      multiPangkalanOperators,
      lowQuotaList
    };
  }, [pangkalanTelemetry]);

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
          { id: 'MAP', label: '🗺️ Peta Monopoli', badge: 'V2', badgeColor: '#10b981' },
          { id: 'COMPLIANCE', label: '🛡️ Kepatuhan', badge: null },
          { id: 'LOGISTIC', label: '🚚 Logistik', badge: null },
          { id: 'HARDWARE', label: '⚙️ Hardware', badge: null },
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '6px' }}>💰 Total Omset Bot Lunas</h3>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'hsl(var(--success))' }}>{formatRupiah(metrics.revenue)}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '6px' }}>🏪 Pangkalan Terpantau</h3>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>{telemetrySummary.totalPangkalan} Pangkalan</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '6px' }}>⛽ Kuota Tabung Klien / Bln</h3>
              <p style={{ fontSize: '1.8rem', fontWeight: 800 }}>{telemetrySummary.totalTabung.toLocaleString('id-ID')} Tabung</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '6px' }}>📈 Est. Nilai Omset Pangkalan</h3>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a855f7' }}>{formatRupiah(telemetrySummary.totalOmset)}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '6px' }}>🏢 PT Agen Terhubung</h3>
              <p style={{ fontSize: '1.8rem', fontWeight: 800 }}>{telemetrySummary.totalAgents} Agen</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '6px' }}>🔑 Lisensi Bot Aktif</h3>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'hsl(var(--warning))' }}>{metrics.activeLicenses} Mesin</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>📊 Tren Penjualan Lisensi Bot (6 Bulan Terakhir)</h3>
              <div style={{ height: '280px' }}>
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>🏢 Pangkalan Terpantau Terbaru</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pangkalanTelemetry.slice(0, 5).map(p => (
                  <div key={p.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 'bold' }}>{p.merchant_name || p.owner_name || 'Pangkalan'}</div>
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8', padding: '2px 6px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '4px' }}>
                        {p.kuota_pertamina_bulanan?.toLocaleString('id-ID')} Tbg
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', marginTop: '4px' }}>
                      {p.agent_name || 'Agen'} • {p.kota_kabupaten || 'Jawa Barat'}
                    </div>
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

      {/* ========================================================================= */}
      {/* TAB 2: INTELIJEN PANGKALAN & AGEN (INTEL) */}
      {/* ========================================================================= */}
      {activeTab === 'INTEL' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>🏪 Total Pangkalan Terpantau</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8' }}>{pangkalanTelemetry.length}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>⛽ Total Kuota Pertamina / Bln</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#4ade80' }}>{telemetrySummary.totalTabung.toLocaleString('id-ID')} Tabung</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>🏢 Total PT Agen Penyalur</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800 }}>{telemetrySummary.totalAgents} Agen</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>💰 Est. Omset Pangkalan Klien</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800, color: '#facc15' }}>{formatRupiah(telemetrySummary.totalOmset)}</p>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '0', overflowX: 'auto', borderRadius: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Nama Pangkalan & Pemilik</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>PT Agen Penyalur</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Alokasi Pertamina</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Sisa Kuota</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Est. Omset / Laba</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Modal Tebus DO</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Wilayah & HP</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Terakhir Sync</th>
                  <th style={{ padding: '14px 18px', color: 'hsl(var(--text-secondary))' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pangkalanTelemetry.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'hsl(var(--text-secondary))' }}>
                      Belum ada data pangkalan yang disinkronkan.
                    </td>
                  </tr>
                ) : (
                  pangkalanTelemetry.map(p => {
                    const phoneClean = (p.phone || '').replace(/\D/g, '');
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: '#ffffff' }}>{p.merchant_name || 'Pangkalan'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>Pemilik: {p.owner_name || '-'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>📱 {p.device_model || p.platform || 'Android'}</div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontWeight: 600, color: '#38bdf8' }}>{p.agent_name || 'PT. Agen Penyalur'}</span>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>Jadwal: {p.jadwal_pasokan || 'Selasa & Jumat'}</div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontWeight: 700, color: '#4ade80' }}>
                            {Number(p.kuota_pertamina_bulanan || 0).toLocaleString('id-ID')} Tabung
                          </span>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>HET: {formatRupiah(Number(p.het_daerah || 20000))}</div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            background: Number(p.sisa_kuota_pertamina || 0) <= 150 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: Number(p.sisa_kuota_pertamina || 0) <= 150 ? '#f87171' : '#4ade80'
                          }}>
                            {Number(p.sisa_kuota_pertamina || 0).toLocaleString('id-ID')} Tabung
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 700, color: '#facc15' }}>{formatRupiah(Number(p.estimasi_omset_bulanan || 0))}</div>
                          <div style={{ fontSize: '0.75rem', color: '#4ade80' }}>Laba: {formatRupiah(Number(p.estimasi_laba_bulanan || 0))}</div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: '#cbd5e1' }}>{formatRupiah(Number(p.modal_tebus_per_do || 0))}</div>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>{p.total_konsumen_unik || 0} Konsumen Unik</div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div>{p.kota_kabupaten || 'Kabupaten'}</div>
                          <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>{p.provinsi || 'Jawa Barat'}</div>
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                          {formatDate(p.last_sync_at)}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {phoneClean && (
                            <button
                              className="btn btn-secondary"
                              onClick={() => window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(`Halo Bapak/Ibu ${p.merchant_name || 'Pangkalan'}, perihal kuota dan lisensi Bot MAP Pertamina...`)}`, '_blank')}
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              💬 Chat WA
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ANALISA KEUANGAN & PASAR (FINANCE) */}
      {/* ========================================================================= */}
      {activeTab === 'FINANCE' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>💰 Omset Lisensi Bot Lunas</h3>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'hsl(var(--success))' }}>{formatRupiah(metrics.revenue)}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>🏪 Est. Nilai Omset Pangkalan Klien</h3>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>{formatRupiah(telemetrySummary.totalOmset)}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>📦 Est. Total Modal Tebus DO</h3>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#facc15' }}>{formatRupiah(telemetrySummary.totalModalDo)}</p>
            </div>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>🎯 Est. Laba Bersih Pangkalan</h3>
              <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#a855f7' }}>{formatRupiah(telemetrySummary.totalLaba)}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>📊 Proporsi Penjualan Paket Lisensi</h3>
              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={(() => {
                      const pkgs: any = {};
                      orders.filter(o => o.status === 'PAID' || o.status === 'REDEEMED').forEach(o => {
                        pkgs[o.paket] = (pkgs[o.paket] || 0) + o.amount;
                      });
                      return Object.entries(pkgs).map(([name, value]) => ({name, value}));
                    })()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
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

            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>💡 Proyeksi Potensi Monetisasi Bot SaaS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <div style={{ fontWeight: 700, color: '#38bdf8' }}>Model Fee Rp 50 / Tabung Diproses</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                    {formatRupiah(telemetrySummary.totalTabung * 50)} <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>/ Bulan</span>
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <div style={{ fontWeight: 700, color: '#4ade80' }}>Model Fee Rp 100 / Tabung Diproses</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                    {formatRupiah(telemetrySummary.totalTabung * 100)} <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>/ Bulan</span>
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'rgba(234, 179, 8, 0.08)', borderRadius: '10px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <div style={{ fontWeight: 700, color: '#facc15' }}>Model Langganan Flat Agen Rp 150.000 / Pangkalan</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                    {formatRupiah(telemetrySummary.totalPangkalan * 150000)} <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>/ Bulan</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RADAR PELUANG CUAN & FOLLOW-UP (RADAR) */}
      {/* ========================================================================= */}
      {activeTab === 'RADAR' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Peluang Multi-Pangkalan / Joki */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#a855f7', marginBottom: '4px' }}>
                👑 Peluang VIP: Multi-Pangkalan ({telemetrySummary.multiPangkalanOperators.length})
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '16px' }}>
                1 Komputer/HP mengelola lebih dari 1 pangkalan (Potensi Paket Enterprise VIP)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {telemetrySummary.multiPangkalanOperators.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Semua pangkalan beroperasi tunggal.</p>
                ) : (
                  telemetrySummary.multiPangkalanOperators.map((op, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{op.owner}</div>
                        <div style={{ fontSize: '0.8rem', color: '#a855f7' }}>Mengelola {op.count} Pangkalan • {op.totalTabung.toLocaleString('id-ID')} Tabung</div>
                      </div>
                      {op.phone && (
                        <button
                          className="btn btn-primary"
                          onClick={() => window.open(`https://wa.me/${op.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo Bapak/Ibu ${op.owner}, kami melihat Anda mengelola ${op.count} pangkalan gas. Apakah tertarik dengan Paket Lisensi Enterprise Unlimited Multi-Pangkalan? 🚀`)}`, '_blank')}
                          style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                        >
                          🚀 Tawari VIP
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Peluang Kuota Menipis */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
                ⚡ Peluang Top-Up: Kuota Sedikit ({telemetrySummary.lowQuotaList.length})
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '16px' }}>
                Sisa kuota pangkalan kurang dari 150 tabung (Waktunya tawari isi ulang)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {telemetrySummary.lowQuotaList.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))' }}>Semua pangkalan memiliki kuota aman.</p>
                ) : (
                  telemetrySummary.lowQuotaList.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.merchant_name || p.owner_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#f87171' }}>Sisa: {p.sisa_kuota_pertamina} Tabung</div>
                      </div>
                      {p.phone && (
                        <button
                          className="btn btn-secondary"
                          onClick={() => window.open(`https://wa.me/${(p.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Halo Bapak/Ibu ${p.merchant_name || 'Pangkalan'}, sisa kuota bot Anda tinggal ${p.sisa_kuota_pertamina} tabung. Mau top-up kuota sekarang agar input harian lancar? 🔋`)}`, '_blank')}
                          style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                        >
                          ⚡ Tawari Top-Up
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Peluang Order Belum Bayar */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#facc15', marginBottom: '4px' }}>
                ⏳ Belum Bayar ({orders.filter(o => o.status === 'PENDING' || o.status === 'EXPIRED').length})
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', marginBottom: '16px' }}>
                Potensi Omset: {formatRupiah(orders.filter(o => o.status === 'PENDING' || o.status === 'EXPIRED').reduce((a, b) => a + b.amount, 0))}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {orders.filter(o => o.status === 'PENDING' || o.status === 'EXPIRED').slice(0, 6).map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{o.whatsapp}</div>
                      <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>{o.paket} • {formatRupiah(o.amount)}</div>
                    </div>
                    <button
                      className="btn btn-secondary"
                      onClick={() => window.open(`https://wa.me/${o.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Halo kak! Pesanan Paket ${o.paket} Anda (${formatRupiah(o.amount)}) masih menunggu pembayaran. Ada kendala transfer yang bisa kami bantu? 😊`)}`, '_blank')}
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      💬 Follow-up
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: PETA MONOPOLI WILAYAH (MAP) */}
      {/* ========================================================================= */}
      {activeTab === 'MAP' && (
        <div className="animate-fade-in glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>🗺️ Peta Monopoli Distribusi</h2>
          <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '20px' }}>Sebaran pangkalan klien MAP Pertamina Bot berdasarkan koordinat GPS perangkat.</p>
          <MapPangkalan telemetryData={pangkalanTelemetry} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: RADAR KEPATUHAN (COMPLIANCE) */}
      {/* ========================================================================= */}
      {activeTab === 'COMPLIANCE' && (
        <div className="animate-fade-in glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>🛡️ Radar Kepatuhan & Risiko (V3)</h2>
          <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '20px' }}>Pangkalan yang terindikasi melanggar aturan atau mendapat peringatan dari Pertamina.</p>
          {pangkalanTelemetry.filter(p => p.inbox_alerts).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              <p style={{ fontSize: '1.1rem', color: '#10b981' }}>✅ Semua pangkalan dalam status aman dan patuh.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="glass-table">
                <thead><tr><th>Pangkalan</th><th>Pesan Peringatan</th><th>Aksi Jasa Resolusi</th></tr></thead>
                <tbody>
                  {pangkalanTelemetry.filter(p => p.inbox_alerts).map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.merchant_name}</strong><br/><small>{p.agent_name}</small></td>
                      <td style={{ color: '#facc15' }}>{p.inbox_alerts}</td>
                      <td><button className="btn btn-primary" onClick={() => window.open(`https://wa.me/${p.phone?.replace(/\D/g, '')}?text=Halo%20Bapak/Ibu,%20kami%20lihat%20ada%20kendala%20di%20akun%20Anda.`, '_blank')}>Tawarkan Solusi</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: LOGISTIK (LOGISTIC) */}
      {/* ========================================================================= */}
      {activeTab === 'LOGISTIC' && (
        <div className="animate-fade-in glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>🚚 Analisa Logistik & Ketepatan Agen</h2>
          <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '20px' }}>Menampilkan jadwal dan riwayat penerimaan DO dari PT Agen Penyalur.</p>
          <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            <p>Data riwayat pengiriman DO sedang dikumpulkan oleh bot klien...</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: HARDWARE TELEMETRY */}
      {/* ========================================================================= */}
      {activeTab === 'HARDWARE' && (
        <div className="animate-fade-in glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>⚙️ Kualitas Hardware & Jaringan Klien</h2>
          <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '20px' }}>Pantau spesifikasi perangkat dan tawarkan upgrade jika performa buruk.</p>
          <div className="table-container">
            <table className="glass-table">
              <thead><tr><th>Pangkalan</th><th>Platform / OS</th><th>Sisa RAM</th><th>Ping (Latensi)</th><th>Status Hardware</th></tr></thead>
              <tbody>
                {pangkalanTelemetry.filter(p => p.ram_usage_mb).map(p => (
                  <tr key={p.id}>
                    <td><strong>{p.merchant_name}</strong></td>
                    <td>{p.platform} / {p.device_os}</td>
                    <td>{p.ram_usage_mb} MB</td>
                    <td>{p.ping_ms} ms</td>
                    <td>
                      {(p.ping_ms || 0) > 60 ? (
                        <span style={{ color: '#f87171' }}>Koneksi Lambat</span>
                      ) : (
                        <span style={{ color: '#10b981' }}>Optimal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

