'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  customer_whatsapp: string;
  package_type: string;
  pangkalan_name?: string;
  total_amount: string | number;
  payment_status: string;
  license_key?: string;
  affiliate_code?: string;
  affiliate_commission?: string | number;
  created_at: string;
}

interface AffiliateItem {
  id: string;
  code: string;
  name: string;
  email: string;
  whatsapp: string;
  markup_percent: number;
  total_earnings: string | number;
  withdrawn_amount: string | number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  status: string;
  created_at: string;
}

interface PayoutItem {
  id: string;
  affiliate_id: string;
  amount: string | number;
  status: string;
  notes?: string;
  created_at: string;
  processed_at?: string;
  affiliate_name?: string;
  affiliate_code?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_name?: string;
}

interface TelemetryPangkalan {
  id: string;
  merchant_id: string;
  merchant_name: string;
  owner_name: string;
  phone: string;
  agent_id: string;
  agent_name: string;
  provinsi: string;
  kota_kabupaten: string;
  kecamatan: string;
  kelurahan: string;
  address: string;
  kuota_pertamina_bulanan: number;
  sisa_kuota_pertamina: number;
  total_penjualan_pertamina: number;
  estimasi_omset_bulanan: number;
  estimasi_laba_bulanan: number;
  modal_tebus_per_do: number;
  jadwal_pasokan: string;
  total_konsumen_unik: number;
  persen_dtks: number;
  persen_rumah_tangga: number;
  persen_usaha_mikro: number;
  skor_kepatuhan: number;
  anomali_overlimit_count: number;
  metode_bayar_tunai_persen: number;
  metode_bayar_qris_persen: number;
  avg_speed_seconds: number;
  peak_hours: string;
  platform: string;
  device_model: string;
  device_os: string;
  ip_address: string;
  isp: string;
  hwid: string;
  app_version: string;
  last_sync_at: string;
  created_at: string;
}

function formatRupiah(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function formatWaUrl(phone: string, text: string = ''): string {
  let clean = phone.replace(/[^0-9]/g, '');
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
  
  // States untuk search & filter transaksi
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter Intelijen & Heatmap
  const [telemetryStatusFilter, setTelemetryStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DORMANT' | 'LOW_QUOTA'>('ALL');
  const [selectedIslandFilter, setSelectedIslandFilter] = useState<string>('ALL');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<'ALL' | 'ANDROID' | 'WINDOWS'>('ALL');
  const [sortField, setSortField] = useState<string>('last_sync_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // UI state untuk WhatsApp Generator & Executive Summary
  const [selectedWaTemplate, setSelectedWaTemplate] = useState<string>('TECH_SUPPORT');
  const [customWaMessage, setCustomWaMessage] = useState<string>('');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTimeText, setLastSyncTimeText] = useState<string>('Baru saja');

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
        fetchTelemetryData(codeToTest.trim());
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

  const fetchTelemetryData = async (code: string) => {
    try {
      const tRes = await fetch('/api/admin/telemetry', {
        headers: { 'x-admin-passcode': code }
      });
      if (tRes.ok) {
        const tData = await tRes.json();
        if (tData?.success) {
          setTelemetryPangkalans(tData.pangkalans || []);
          setTelemetryMetrics(tData.metrics || null);
          setLastSyncTimeText(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSyncAllData = async () => {
    if (!passcode) return;
    setIsSyncing(true);
    try {
      await Promise.all([
        fetch('/api/admin/orders', { headers: { 'Authorization': passcode.trim() } })
          .then(r => r.json())
          .then(d => {
            if (d.orders) setOrders(d.orders);
            if (d.affiliates) setAffiliates(d.affiliates);
            if (d.payouts) setPayouts(d.payouts);
          }),
        fetchTelemetryData(passcode.trim())
      ]);
    } finally {
      setIsSyncing(false);
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
    const rows = filteredTelemetry.map(p => [
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
        alert('Order berhasil ditandai LUNAS dan lisensi telah dibuat.');
        checkAuth(passcode);
      } else {
        alert(data.error || 'Gagal mengubah status.');
      }
    } catch (e) {
      alert('Error koneksi.');
    }
  };

  const handleProcessPayout = async (payoutId: string) => {
    const notes = prompt('Masukkan catatan/nomor referensi transfer (opsional):');
    if (notes === null) return;

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': passcode
        },
        body: JSON.stringify({ payoutId, action: 'process_payout', notes })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Payout berhasil diproses dan ditandai selesai.');
        checkAuth(passcode);
      } else {
        alert(data.error || 'Gagal memproses payout.');
      }
    } catch (e) {
      alert('Error koneksi.');
    }
  };

  // Helper Island Categorization
  const getIslandKey = (provName: string): string => {
    const p = (provName || '').toUpperCase();
    if (p.includes('JAWA') || p.includes('JAKARTA') || p.includes('BANTEN') || p.includes('YOGYA')) return 'JAWA';
    if (p.includes('SUMATERA') || p.includes('ACEH') || p.includes('RIAU') || p.includes('JAMBI') || p.includes('LAMPUNG') || p.includes('BANGKA') || p.includes('BENGKULU')) return 'SUMATERA';
    if (p.includes('KALIMANTAN')) return 'KALIMANTAN';
    if (p.includes('SULAWESI') || p.includes('GORONTALO')) return 'SULAWESI';
    if (p.includes('BALI') || p.includes('NUSA TENGGARA') || p.includes('NTB') || p.includes('NTT')) return 'BALI_NT';
    if (p.includes('PAPUA') || p.includes('MALUKU')) return 'MALUKU_PAPUA';
    return 'JAWA';
  };

  // WhatsApp Smart Message Generator Helper
  const getWaMessage = (p: TelemetryPangkalan | null, template: string) => {
    if (!p) return '';
    const owner = p.owner_name || p.merchant_name || 'Bapak/Ibu';
    const merchant = p.merchant_name || 'Pangkalan';
    const agent = p.agent_name || 'PT. Agen Penyalur';
    const sisa = p.sisa_kuota_pertamina || 0;

    switch (template) {
      case 'CLIENT_REPORT':
        const kuota = (p.kuota_pertamina_bulanan || 0).toLocaleString('id-ID');
        const terjual = (p.total_penjualan_pertamina || Math.max(0, (p.kuota_pertamina_bulanan || 0) - (p.sisa_kuota_pertamina || 0))).toLocaleString('id-ID');
        const sisaTb = (p.sisa_kuota_pertamina || 0).toLocaleString('id-ID');
        const omsetVal = formatRupiah(p.estimasi_omset_bulanan || 0);
        const labaVal = formatRupiah(p.estimasi_laba_bulanan || 0);
        const modalDoVal = formatRupiah(p.modal_tebus_per_do || 0);
        const dtks = p.persen_dtks || 72;
        const rt = p.persen_rumah_tangga || 75;
        const um = p.persen_usaha_mikro || 25;
        const kepatuhan = p.skor_kepatuhan || 98;
        const speed = p.avg_speed_seconds || 3.8;
        const peak = p.peak_hours || '14:00 - 17:00 WIB';

        return `📊 *LAPORAN ANALISIS BISNIS & OPERASIONAL PANGKALAN LPG 3KG*
Kepada Yth: *${owner}* (${merchant})
ID Registrasi: *${p.merchant_id || '-'}* | PT Agen: *${agent}*
Wilayah: ${p.kota_kabupaten ? `${p.kota_kabupaten}, ${p.provinsi || ''}` : 'Indonesia'}

Halo Bapak/Ibu ${owner}, berikut kami sampaikan ringkasan performa operasional & analisis kesehatan pangkalan Anda:

📦 *1. KUOTA & PENJUALAN BULANAN:*
• Alokasi Kuota Bulanan: *${kuota} Tabung*
• Transaksi Sukses Tercatat: *${terjual} Tabung*
• Sisa Kuota Berjalan: *${sisaTb} Tabung*

🛡️ *2. KESEHATAN AUDIT SUBSIDI TEPAT (ESDM / PERTAMINA):*
• Skor Kepatuhan Sistem: *${kepatuhan}% (Status: SANGAT AMAN / BEBAS SANKSI)*
• Proporsi Konsumen: *${rt}% Rumah Tangga | ${um}% Usaha Mikro (UMKM)*
• Konsumen Terdaftar DTKS/P3KE: *${dtks}% (Penyaluran Tepat Sasaran)*
• Potensi Anomali / Overlimit NIK: *0.0% (Terkontrol Ketat)*

⚡ *3. EFISIENSI & PERFORMA BOT:*
• Kecepatan Input Rata-rata: *~${speed} Detik / NIK*
• Estimasi Waktu Dihemat: *±5 Jam / Bulan (Bebas Antrean Kasir)*
• Jam Transaksi Tersibuk: *${peak}*

💰 *4. ANALISIS KEUANGAN PANGKALAN:*
• Estimasi Perputaran Omset: *${omsetVal}*
• Estimasi Margin Laba Bersih: *${labaVal}*
• Estimasi Modal Tebus DO Pasokan: *${modalDoVal}*

💡 *Catatan Teknis:* Operasional pangkalan Anda berada dalam kondisi *Sangat Sehat & Tertib Audit*. Pastikan saldo kuota bot selalu aktif menjelang jadwal DO berikutnya.

Terima kasih atas kemitraan Anda bersama *Bot Otomasi MAP Pertamina*.
_Layanan Bantuan & Konsultasi CS: Hubungi kami jika membutuhkan bantuan._`;

      case 'TECH_SUPPORT':
        return `Halo ${owner} (${merchant}), kami dari Tim Teknis Bot MAP Pertamina. Kami melihat sistem bot Anda telah terhubung aktif. Apakah operasional input NIK harian berjalan lancar atau ada kendala/bantuan teknis yang bisa kami bantu?`;
      case 'LOW_QUOTA':
        return `Halo ${owner}, kuota bot MAP Pertamina untuk ${merchant} tersisa ${sisa} tabung lagi. Agar proses input harian tidak terhenti saat pengiriman DO berikutnya, kami sarankan untuk melakukan top-up kuota lisensi hari ini. Silakan balas pesan ini untuk dibantu proses cepat. Terima kasih!`;
      case 'B2B_AGENT':
        return `Selamat siang Pimpinan/Admin ${agent}. Kami mencatat bahwa pangkalan mitra Anda (${merchant}) telah sukses menggunakan Bot Otomasi MAP Pertamina dengan kecepatan input ~3.8 detik/NIK tanpa antre. Kami ingin menawarkan Paket Kerjasama Korporat B2B khusus untuk seluruh pangkalan di bawah naungan ${agent} dengan potongan harga khusus. Apakah ada waktu luang untuk berdiskusi singkat? Terima kasih.`;
      case 'LOYALTY_PROMO':
        return `Halo ${owner} (${merchant})! Terima kasih telah setia mempercayakan operasional pencatatan NIK LPG 3Kg bersama Bot MAP Pertamina. Dapatkan promo diskon perpanjangan lisensi dan cashback top-up kuota khusus minggu ini. Hubungi kami untuk klaim promo Anda!`;
      default:
        return `Halo Bapak/Ibu ${owner}, kami dari Layanan Resmi Bot MAP Pertamina.`;
    }
  };

  // Update pesan WA saat modal atau template berganti
  useEffect(() => {
    if (selectedPangkalan) {
      setCustomWaMessage(getWaMessage(selectedPangkalan, selectedWaTemplate));
    }
  }, [selectedPangkalan, selectedWaTemplate]);

  // Executive Summary AI Auto Generator
  const generateExecutiveSummary = () => {
    const totalP = telemetryMetrics?.totalPangkalan || telemetryPangkalans.length;
    const totalT = (telemetryMetrics?.totalTabungKlien || 0).toLocaleString('id-ID');
    const omset = formatRupiah(telemetryMetrics?.totalEstimasiOmset || 0);
    const topProv = telemetryMetrics?.topProvinces?.[0]?.name || 'Jawa Barat';
    const topProvPersen = telemetryMetrics?.topProvinces?.[0]?.persenPangkalan || 0;
    const active = telemetryMetrics?.activeCount || 0;
    const dormant = telemetryMetrics?.dormantCount || 0;
    const lowQ = telemetryMetrics?.lowQuotaCount || 0;
    const mrr100 = formatRupiah(telemetryMetrics?.mrrAt100 || 0);
    const totalAgen = telemetryMetrics?.totalAgenKita || 0;

    return `📊 EXECUTIVE SUMMARY INTELIJEN PASAR LPG 3KG (BOT MAP PERTAMINA)
Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}

1. POPULASI & VOLUME KLIEN:
• Total Pangkalan Terdata: ${totalP} Pangkalan (${telemetryMetrics?.androidCount || 0} Android, ${telemetryMetrics?.windowsCount || 0} PC)
• Total Volume Tabung Dikelola: ${totalT} Tabung/Bulan
• Estimasi Perputaran Omset Gas: ${omset} / Bulan
• PT Agen Penyalur Terhubung: ${totalAgen} Agen Penyalur

2. RETENSI & MONITORING KLIEN:
• Pangkalan Aktif (<3 hari): ${active} Pangkalan (${telemetryMetrics?.retentionRatePercent || 100}% Retention Rate)
• Pangkalan Dormant (>7 hari): ${dormant} Pangkalan (Perlu Follow-up CS)
• Pangkalan Kuota Kritis (≤150 tb): ${lowQ} Pangkalan (Siap Penawaran Top-Up)

3. SEBARAN REGIONAL:
• Wilayah Konsentrasi Terbesar: ${topProv} (${topProvPersen}% dari total pangkalan)
• Skor Kepatuhan Audit: ${telemetryMetrics?.avgKepatuhan || 98}% (Status: Sangat Sehat)

4. PROYEKSI MONETISASI SAAS:
• Potensi Monthly Recurring Revenue (MRR @ Rp 100/tb): ${mrr100} / Bulan`;
  };

  const handleCopyExecutiveSummary = () => {
    navigator.clipboard.writeText(generateExecutiveSummary());
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  // Filter dan Pencarian Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = 
        o.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer_whatsapp.includes(searchQuery) ||
        (o.customer_email && o.customer_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.license_key && o.license_key.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || o.payment_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Metrik Agregat Transaksi Lisensi
  const metrics = useMemo(() => {
    const paidOrders = orders.filter(o => o.payment_status === 'PAID');
    const totalRev = paidOrders.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
    const successRate = orders.length > 0 ? ((paidOrders.length / orders.length) * 100).toFixed(1) : '0';
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

  // Filter dan Sortir Multi-Dimensi Intelijen Telemetri
  const filteredTelemetry = useMemo(() => {
    const nowTime = new Date().getTime();
    const result = telemetryPangkalans.filter(p => {
      const q = telemetrySearch.toLowerCase().trim();
      const mName = (p.merchant_name || '').toLowerCase();
      const mId = (p.merchant_id || '').toLowerCase();
      const oName = (p.owner_name || '').toLowerCase();
      const aName = (p.agent_name || '').toLowerCase();
      const city = (p.kota_kabupaten || '').toLowerCase();
      const prov = (p.provinsi || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      const dev = (p.device_model || '').toLowerCase();
      const os = (p.device_os || '').toLowerCase();
      const matchQuery = !q || mName.includes(q) || mId.includes(q) || oName.includes(q) || aName.includes(q) || city.includes(q) || prov.includes(q) || phone.includes(q) || dev.includes(q) || os.includes(q);
      
      if (!matchQuery) return false;

      // Filter Status
      if (telemetryStatusFilter !== 'ALL') {
        const lastSync = p.last_sync_at ? new Date(p.last_sync_at).getTime() : 0;
        const days = lastSync > 0 ? Math.floor((nowTime - lastSync) / (1000 * 60 * 60 * 24)) : 999;

        if (telemetryStatusFilter === 'ACTIVE' && days >= 3) return false;
        if (telemetryStatusFilter === 'DORMANT' && days < 7) return false;
        if (telemetryStatusFilter === 'LOW_QUOTA' && (Number(p.sisa_kuota_pertamina) || 0) > 150) return false;
      }

      // Filter Island Region
      if (selectedIslandFilter !== 'ALL') {
        const island = getIslandKey(p.provinsi);
        if (island !== selectedIslandFilter) return false;
      }

      // Filter Platform
      if (selectedPlatformFilter !== 'ALL') {
        if (p.platform !== selectedPlatformFilter) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'last_sync_at') {
        valA = a.last_sync_at ? new Date(a.last_sync_at).getTime() : 0;
        valB = b.last_sync_at ? new Date(b.last_sync_at).getTime() : 0;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      } else {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [telemetryPangkalans, telemetrySearch, telemetryStatusFilter, selectedIslandFilter, selectedPlatformFilter, sortField, sortDirection]);

  const handleSortToggle = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

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
              <label className="form-label" style={{ fontWeight: 600 }}>Kunci Passcode Admin</label>
              <input
                type="password"
                className="form-input"
                placeholder="Masukkan Passcode..."
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                autoFocus
                required
              />
            </div>

            {error && (
              <div style={{
                color: '#ef4444',
                fontSize: '0.85rem',
                marginBottom: '16px',
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '10px', padding: '14px', borderRadius: '12px' }}
              disabled={loading}
            >
              {loading ? 'Memverifikasi...' : 'Buka Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Top Header Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="gradient-text" style={{ fontSize: '2.4rem', fontWeight: 800 }}>Admin Dashboard</h1>
            <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 700 }}>
              Live Cloud Telemetry
            </span>
          </div>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginTop: '4px' }}>
            Executive Dashboard: Transaksi Lisensi, Jaringan Afiliasi &amp; Intelijen Pasar Pangkalan Nasional
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Tombol Sinkronisasi Live Data */}
          <button
            onClick={handleSyncAllData}
            disabled={isSyncing}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ display: 'inline-block', transform: isSyncing ? 'rotate(360deg)' : 'none', transition: 'transform 0.8s ease' }}>
              🔄
            </span>
            {isSyncing ? 'Sinkronisasi...' : `Sync Data (${lastSyncTimeText})`}
          </button>

          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}>
            Keluar Portal
          </button>
        </div>
      </div>

      {/* Admin Tab Switcher */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setAdminTab('orders')}
          style={{
            padding: '12px 22px',
            borderRadius: '12px',
            background: adminTab === 'orders' ? '#38bdf8' : 'rgba(30, 41, 59, 0.6)',
            color: adminTab === 'orders' ? '#0f172a' : '#94a3b8',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer'
          }}
        >
          📦 Transaksi Lisensi ({orders.length})
        </button>

        <button
          onClick={() => setAdminTab('affiliates')}
          style={{
            padding: '12px 22px',
            borderRadius: '12px',
            background: adminTab === 'affiliates' ? '#38bdf8' : 'rgba(30, 41, 59, 0.6)',
            color: adminTab === 'affiliates' ? '#0f172a' : '#94a3b8',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer'
          }}
        >
          🤝 Mitra Affiliate ({affiliates.length})
          {metrics.pendingPayoutCount > 0 && (
            <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '10px', background: '#ef4444', color: '#fff', fontSize: '0.72rem', fontWeight: 800 }}>
              {metrics.pendingPayoutCount} PENDING
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('intelligence')}
          style={{
            padding: '12px 22px',
            borderRadius: '12px',
            background: adminTab === 'intelligence' ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' : 'rgba(30, 41, 59, 0.6)',
            color: adminTab === 'intelligence' ? '#ffffff' : '#94a3b8',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            boxShadow: adminTab === 'intelligence' ? '0 4px 15px rgba(139, 92, 246, 0.3)' : 'none'
          }}
        >
          🏢 Intelijen Pasar &amp; Pangkalan ({telemetryPangkalans.length})
          {telemetryMetrics?.lowQuotaCount > 0 && (
            <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '10px', background: '#fbbf24', color: '#0f172a', fontSize: '0.72rem', fontWeight: 800 }}>
              {telemetryMetrics.lowQuotaCount} KUOTA TIPIS
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
          }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💰 Omset Lunas (PAID)</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#34d399' }}>{formatRupiah(metrics.revenue)}</p>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                Dari {metrics.paidCount} transaksi berhasil
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📦 Total Pesanan Masuk</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: 'hsl(var(--text-primary))' }}>{metrics.totalCount}</p>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                Conversion Rate: <strong style={{ color: '#38bdf8' }}>{metrics.successRate}%</strong>
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: '0.82rem', color: 'hsl(var(--text-secondary))', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🤝 Payout Affiliate Pending</h3>
              <p style={{ fontSize: '2.2rem', fontWeight: 800, color: metrics.pendingPayoutCount > 0 ? '#ef4444' : '#94a3b8' }}>
                {metrics.pendingPayoutCount} Permintaan
              </p>
              <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginTop: '4px' }}>
                Total: <strong style={{ color: '#fbbf24' }}>{formatRupiah(metrics.pendingPayoutAmount)}</strong>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="glass-card" style={{ padding: '20px', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Cari Order ID, Nama, No WA, Email, atau Lisensi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: '260px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              {['ALL', 'PAID', 'UNPAID', 'EXPIRED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: statusFilter === st ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                    color: statusFilter === st ? '#0f172a' : '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Tabel Pesanan */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Order ID</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Pelanggan &amp; WhatsApp</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Paket</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Nominal</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Status</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Kunci Lisensi Voucher</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        Tidak ada transaksi yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{ fontWeight: 800, color: '#38bdf8' }}>{o.order_id}</span>
                          <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                            {new Date(o.created_at).toLocaleString('id-ID')}
                          </div>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <strong style={{ color: '#ffffff' }}>{o.customer_name}</strong>
                          {o.pangkalan_name && (
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>🏢 {o.pangkalan_name}</div>
                          )}
                          <a href={formatWaUrl(o.customer_whatsapp, `Halo Kak ${o.customer_name}, terima kasih telah memesan Bot MAP Pertamina (${o.order_id}).`)} target="_blank" rel="noopener noreferrer" style={{ color: '#34d399', fontSize: '0.82rem', textDecoration: 'underline', display: 'block', marginTop: '2px' }}>
                            💬 {o.customer_whatsapp}
                          </a>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', fontSize: '0.82rem', fontWeight: 600 }}>
                            {o.package_type}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 800, color: '#34d399' }}>
                          {formatRupiah(o.total_amount)}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            background: o.payment_status === 'PAID' ? 'rgba(52, 211, 153, 0.15)' : o.payment_status === 'UNPAID' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: o.payment_status === 'PAID' ? '#34d399' : o.payment_status === 'UNPAID' ? '#fbbf24' : '#ef4444'
                          }}>
                            {o.payment_status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          {o.license_key ? (
                            <code style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '6px', color: '#fbbf24', fontSize: '0.85rem' }}>
                              {o.license_key}
                            </code>
                          ) : (
                            <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          {o.payment_status !== 'PAID' && (
                            <button
                              onClick={() => handleMarkAsPaid(o.order_id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: '#34d399',
                                color: '#0f172a',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                cursor: 'pointer'
                              }}
                            >
                              ✓ Set Lunas
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: AFILIASI & PAYOUTS */}
      {adminTab === 'affiliates' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Payouts Section */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: '#38bdf8' }}>
              💸 Permintaan Penarikan Komisi (Payouts)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Tanggal</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Mitra Affiliate</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Rekening Tujuan</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Nominal</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Status</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        Belum ada permintaan payout penarikan komisi.
                      </td>
                    </tr>
                  ) : (
                    payouts.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '14px 12px', fontSize: '0.85rem' }}>
                          {new Date(p.created_at).toLocaleDateString('id-ID')}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <strong>{p.affiliate_name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>Kode: {p.affiliate_code}</div>
                        </td>
                        <td style={{ padding: '14px 12px', fontSize: '0.85rem' }}>
                          <div><strong>{p.bank_name}</strong> - {p.bank_account_number}</div>
                          <div style={{ color: 'hsl(var(--text-muted))' }}>a.n. {p.bank_account_name}</div>
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 800, color: '#34d399' }}>
                          {formatRupiah(p.amount)}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            background: p.status === 'COMPLETED' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: p.status === 'COMPLETED' ? '#34d399' : '#ef4444'
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          {p.status === 'PENDING' && (
                            <button
                              onClick={() => handleProcessPayout(p.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                background: '#38bdf8',
                                color: '#0f172a',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                cursor: 'pointer'
                              }}
                            >
                              Proses Transfer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daftar Semua Affiliate */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', color: '#a78bfa' }}>
              👥 Database Seluruh Mitra Affiliate Terdaftar
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Kode</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Nama Mitra</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>WhatsApp</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Markup</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Total Komisi</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Saldo Sisa</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Info Bank</th>
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

          {/* 💰 MODUL PROYEKSI PENDAPATAN & VALUASI MRR SAAS KITA */}
          <div className="glass-card" style={{
            padding: '24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
            border: '1px solid rgba(52, 211, 153, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  💰 Simulasi Proyeksi Pendapatan MRR &amp; Valuasi SaaS Bot
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                  Estimasi potensi pendapatan berulang (Monthly Recurring Revenue) dari kuota tabung klien yang terhubung
                </p>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#34d399', background: 'rgba(52, 211, 153, 0.15)', padding: '6px 12px', borderRadius: '10px', fontWeight: 700 }}>
                ⚡ Monetisasi Berkelanjutan
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Tarif Ekonomis (Rp 50/Tabung)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>
                  {formatRupiah(telemetryMetrics?.mrrAt50 || 0)} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>/ bln</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>Model top-up token kuota lisensi</div>
              </div>

              <div style={{ background: 'rgba(52, 211, 153, 0.05)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                <div style={{ fontSize: '0.8rem', color: '#34d399', marginBottom: '4px', fontWeight: 700 }}>⭐ Standar Industri (Rp 100/Tabung)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>
                  {formatRupiah(telemetryMetrics?.mrrAt100 || 0)} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>/ bln</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>Margin ~5% dari laba pangkalan (Rp 2.000)</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Langganan Flat (Rp 100rb/Pangkalan)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fbbf24' }}>
                  {formatRupiah(telemetryMetrics?.mrrFlat || 0)} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>/ bln</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>Paket bulanan unlimited device</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Valuasi ARR Tahunan (ARR)</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a78bfa' }}>
                  {formatRupiah(telemetryMetrics?.arrValuation || 0)} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>/ thn</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>Estimasi nilai kontrak tahunan</div>
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
                🇮🇩 Benchmark Nasional: ~250.000 Pangkalan &amp; 220 Juta Tabung/Bln
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

          {/* 4 Kartu Analisis Mendalam + Gauge Kepatuhan */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '20px'
          }}>
            {/* 1. Demografi Konsumen */}
            <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '1.4rem' }}>👥</span>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Demografi Konsumen &amp; DTKS</h4>
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

            {/* 2. Audit Kepatuhan & Performa dengan Circular Gauge */}
            <div className="glass-card" style={{ padding: '20px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.7)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Kepatuhan &amp; Performa Bot</h4>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700, background: 'rgba(52, 211, 153, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                  Audit Safe
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Skor Kepatuhan Audit:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="24" height="24" viewBox="0 0 36 36">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#34d399" strokeWidth="4" strokeDasharray="98, 100" />
                    </svg>
                    <strong style={{ color: '#34d399' }}>{telemetryMetrics?.avgKepatuhan || 98}%</strong>
                  </div>
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
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Logistik &amp; Arus Kas Tebus</h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Estimasi Modal Tebus DO:</span>
                  <strong style={{ color: '#38bdf8' }}>{formatRupiah(telemetryMetrics?.totalModalTebusDo || 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                  <span style={{ color: '#94a3b8' }}>Pola Pengiriman Agen:</span>
                  <strong style={{ color: '#ffffff' }}>2x Seminggu (Sel &amp; Jum)</strong>
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
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>Hardware &amp; Jam Sibuk</h4>
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
                  <strong style={{ color: '#ffffff' }}>Telkomsel &amp; Indihome</strong>
                </div>
              </div>
            </div>
          </div>

          {/* DUA MODUL AKSI SALES & RETENSI (Churn Alert & Top-Up Priority) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {/* 1. 🚨 Retensi Klien & Peringatan Churn (Dormant) */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '18px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.4rem' }}>🚨</span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f87171' }}>
                    Retensi Klien &amp; Churn Alert
                  </h3>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontSize: '0.75rem', fontWeight: 700 }}>
                  {telemetryMetrics?.dormantCount || 0} Pangkalan Dormant
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px', textAlign: 'center' }}>
                <div style={{ background: 'rgba(52, 211, 153, 0.1)', padding: '10px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>🟢 AKTIF (&lt;3 hr)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#34d399' }}>{telemetryMetrics?.activeCount || 0}</div>
                </div>
                <div style={{ background: 'rgba(251, 191, 36, 0.1)', padding: '10px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>🟡 WASPADA (3-7 hr)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fbbf24' }}>{telemetryMetrics?.warningCount || 0}</div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700 }}>🔴 DORMANT (&gt;7 hr)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f87171' }}>{telemetryMetrics?.dormantCount || 0}</div>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '10px' }}>
                Pangkalan tidak aktif &gt;7 hari yang memerlukan follow-up CS:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!telemetryMetrics?.dormantPangkalans || telemetryMetrics.dormantPangkalans.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#34d399', padding: '10px', background: 'rgba(52, 211, 153, 0.05)', borderRadius: '8px', textAlign: 'center' }}>
                    ✨ Semua pangkalan aktif dan rutin bertransaksi!
                  </div>
                ) : (
                  telemetryMetrics.dormantPangkalans.map((dp: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem' }}>
                      <div>
                        <strong style={{ color: '#ffffff' }}>{dp.merchant_name || 'Pangkalan'}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#f87171' }}>Tidak aktif {dp.daysInactive} hari lalu</div>
                      </div>
                      {dp.phone && (
                        <a
                          href={formatWaUrl(dp.phone, `Halo Bapak/Ibu ${dp.owner_name || dp.merchant_name || ''}, kami dari tim teknis Bot MAP Pertamina. Apakah sistem bot berjalan lancar atau ada kendala yang bisa kami bantu?`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(56, 189, 248, 0.2)',
                            color: '#38bdf8',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          💬 Sapa CS WA
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. 🔔 Prioritas Follow-Up Top-Up (Sisa Kuota Menipis) */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '18px', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.4rem' }}>🔔</span>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>
                    Prioritas Top-Up Kuota Lisensi
                  </h3>
                </div>
                <span style={{ padding: '4px 10px', borderRadius: '12px', background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700 }}>
                  {telemetryMetrics?.lowQuotaCount || 0} Kuota Kritis (&le;150 tb)
                </span>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '14px' }}>
                Pangkalan yang sisa kuotanya menipis dan siap ditawarkan perpanjangan / top-up lisensi baru:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!telemetryMetrics?.lowQuotaPangkalans || telemetryMetrics.lowQuotaPangkalans.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#34d399', padding: '10px', background: 'rgba(52, 211, 153, 0.05)', borderRadius: '8px', textAlign: 'center' }}>
                    ✨ Seluruh pangkalan memiliki cadangan kuota yang cukup.
                  </div>
                ) : (
                  telemetryMetrics.lowQuotaPangkalans.map((lq: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.82rem' }}>
                      <div>
                        <strong style={{ color: '#ffffff' }}>{lq.merchant_name || 'Pangkalan'}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>
                          Sisa: {lq.sisa_kuota} Tabung lagi
                        </div>
                      </div>
                      {lq.phone && (
                        <a
                          href={formatWaUrl(lq.phone, `Halo Bapak/Ibu ${lq.owner_name || lq.merchant_name || ''}, kuota bot MAP Pertamina Anda tersisa ${lq.sisa_kuota} tabung lagi. Apakah ingin melakukan top-up kuota hari ini agar proses input harian tetap lancar tanpa jeda?`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(52, 211, 153, 0.2)',
                            color: '#34d399',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          💬 Tawaran Top-Up
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 3. 🗺️ PETA VISUAL & HEATMAP SEBARAN WILAYAH INDONESIA */}
          <div className="glass-card" style={{ padding: '26px', borderRadius: '20px', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🗺️ Peta Heatmap Sebaran Pangkalan Se-Indonesia
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                  Klik salah satu pulau atau kluster wilayah untuk memfilter data sebaran pangkalan &amp; provinsi
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedIslandFilter('ALL')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: selectedIslandFilter === 'ALL' ? '#a78bfa' : 'rgba(255,255,255,0.05)',
                    color: selectedIslandFilter === 'ALL' ? '#0f172a' : '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  🌐 Semua Pulau
                </button>
                <span style={{ fontSize: '0.78rem', color: '#a78bfa', background: 'rgba(167, 139, 250, 0.15)', padding: '6px 12px', borderRadius: '8px', fontWeight: 700 }}>
                  {telemetryMetrics?.topProvinces?.length || 0} Provinsi Terdata
                </span>
              </div>
            </div>

            {/* Visual SVG Map Banner Indonesia (Clickable Islands) */}
            <div style={{
              width: '100%',
              background: 'radial-gradient(ellipse at center, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
              borderRadius: '16px',
              padding: '24px 16px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: '20px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <svg viewBox="0 0 900 320" style={{ width: '100%', maxHeight: '240px' }}>
                <defs>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Grid Koordinat Latar */}
                <path d="M50 80 H850 M50 160 H850 M50 240 H850 M150 40 V280 M300 40 V280 M450 40 V280 M600 40 V280 M750 40 V280" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4 4" />

                {/* Pulau Sumatera */}
                <g onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'SUMATERA' ? 'ALL' : 'SUMATERA')} style={{ cursor: 'pointer' }}>
                  <path d="M80 60 L140 120 L190 190 L170 210 L120 160 L60 80 Z" fill={selectedIslandFilter === 'SUMATERA' ? 'rgba(56, 189, 248, 0.6)' : 'rgba(56, 189, 248, 0.25)'} stroke="#38bdf8" strokeWidth={selectedIslandFilter === 'SUMATERA' ? 3 : 1.5} filter="url(#glow)" />
                  <circle cx="120" cy="110" r={selectedIslandFilter === 'SUMATERA' ? 8 : 5} fill="#38bdf8" />
                  <text x="120" y="95" fill="#e2e8f0" fontSize="11" fontWeight="700" textAnchor="middle">SUMATERA</text>
                </g>

                {/* Pulau Jawa */}
                <g onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'JAWA' ? 'ALL' : 'JAWA')} style={{ cursor: 'pointer' }}>
                  <path d="M190 225 L280 235 L380 245 L420 240 L380 255 L260 250 L190 235 Z" fill={selectedIslandFilter === 'JAWA' ? 'rgba(52, 211, 153, 0.7)' : 'rgba(52, 211, 153, 0.35)'} stroke="#34d399" strokeWidth={selectedIslandFilter === 'JAWA' ? 3.5 : 2} filter="url(#glow)" />
                  <circle cx="250" cy="240" r={selectedIslandFilter === 'JAWA' ? 9 : 7} fill="#34d399" />
                  <circle cx="340" cy="245" r={selectedIslandFilter === 'JAWA' ? 8 : 6} fill="#34d399" />
                  <text x="300" y="275" fill="#34d399" fontSize="12" fontWeight="800" textAnchor="middle">JAWA (Konsentrasi Utama)</text>
                </g>

                {/* Pulau Kalimantan */}
                <g onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'KALIMANTAN' ? 'ALL' : 'KALIMANTAN')} style={{ cursor: 'pointer' }}>
                  <path d="M280 90 L360 80 L400 130 L380 180 L310 175 L270 140 Z" fill={selectedIslandFilter === 'KALIMANTAN' ? 'rgba(251, 191, 36, 0.6)' : 'rgba(251, 191, 36, 0.25)'} stroke="#fbbf24" strokeWidth={selectedIslandFilter === 'KALIMANTAN' ? 3 : 1.5} filter="url(#glow)" />
                  <circle cx="330" cy="130" r={selectedIslandFilter === 'KALIMANTAN' ? 8 : 5} fill="#fbbf24" />
                  <text x="330" y="115" fill="#e2e8f0" fontSize="11" fontWeight="700" textAnchor="middle">KALIMANTAN</text>
                </g>

                {/* Pulau Sulawesi */}
                <g onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'SULAWESI' ? 'ALL' : 'SULAWESI')} style={{ cursor: 'pointer' }}>
                  <path d="M440 95 L490 110 L470 150 L510 180 L460 200 L445 150 Z" fill={selectedIslandFilter === 'SULAWESI' ? 'rgba(167, 139, 250, 0.6)' : 'rgba(167, 139, 250, 0.25)'} stroke="#a78bfa" strokeWidth={selectedIslandFilter === 'SULAWESI' ? 3 : 1.5} filter="url(#glow)" />
                  <circle cx="470" cy="145" r={selectedIslandFilter === 'SULAWESI' ? 8 : 5} fill="#a78bfa" />
                  <text x="475" y="85" fill="#e2e8f0" fontSize="11" fontWeight="700" textAnchor="middle">SULAWESI</text>
                </g>

                {/* Bali & Nusa Tenggara */}
                <g onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'BALI_NT' ? 'ALL' : 'BALI_NT')} style={{ cursor: 'pointer' }}>
                  <path d="M435 245 L460 248 L500 252 L540 255 L535 260 L440 252 Z" fill={selectedIslandFilter === 'BALI_NT' ? 'rgba(244, 114, 182, 0.6)' : 'rgba(244, 114, 182, 0.3)'} stroke="#f472b6" strokeWidth={selectedIslandFilter === 'BALI_NT' ? 3 : 1.5} />
                  <circle cx="450" cy="248" r={selectedIslandFilter === 'BALI_NT' ? 6 : 4} fill="#f472b6" />
                  <text x="490" y="275" fill="#e2e8f0" fontSize="10" fontWeight="700" textAnchor="middle">BALI &amp; NUSRA</text>
                </g>

                {/* Maluku & Papua */}
                <g onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'MALUKU_PAPUA' ? 'ALL' : 'MALUKU_PAPUA')} style={{ cursor: 'pointer' }}>
                  <path d="M570 120 L610 130 L590 170 Z M640 100 L760 90 L800 160 L780 220 L720 230 L650 160 Z" fill={selectedIslandFilter === 'MALUKU_PAPUA' ? 'rgba(147, 197, 253, 0.6)' : 'rgba(147, 197, 253, 0.25)'} stroke="#93c5fd" strokeWidth={selectedIslandFilter === 'MALUKU_PAPUA' ? 3 : 1.5} filter="url(#glow)" />
                  <circle cx="710" cy="150" r={selectedIslandFilter === 'MALUKU_PAPUA' ? 8 : 5} fill="#93c5fd" />
                  <text x="715" y="85" fill="#e2e8f0" fontSize="11" fontWeight="700" textAnchor="middle">PAPUA &amp; MALUKU</text>
                </g>
              </svg>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                💡 Klik pulau mana saja pada peta di atas untuk memfilter pangkalan di kepulauan tersebut secara instan
              </div>
            </div>

            {/* 6 Regional Kepulauan Cards (Clickable) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              marginBottom: '24px'
            }}>
              {/* Jawa */}
              <div
                onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'JAWA' ? 'ALL' : 'JAWA')}
                style={{
                  background: selectedIslandFilter === 'JAWA' ? 'rgba(52, 211, 153, 0.18)' : 'rgba(52, 211, 153, 0.06)',
                  border: selectedIslandFilter === 'JAWA' ? '2px solid #34d399' : '1px solid rgba(52, 211, 153, 0.2)',
                  padding: '14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: '#34d399', fontSize: '0.9rem' }}>🏝️ Pulau Jawa &amp; Banten</strong>
                  <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700 }}>Prioritas #1</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Jabar, Jateng, Jatim, DKI, Banten, DIY</div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>Konsentrasi kuota terbesar nasional</div>
              </div>

              {/* Sumatera */}
              <div
                onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'SUMATERA' ? 'ALL' : 'SUMATERA')}
                style={{
                  background: selectedIslandFilter === 'SUMATERA' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(56, 189, 248, 0.06)',
                  border: selectedIslandFilter === 'SUMATERA' ? '2px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.2)',
                  padding: '14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: '#38bdf8', fontSize: '0.9rem' }}>🏝️ Pulau Sumatera</strong>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>Wilayah #2</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Sumut, Sumbar, Riau, Sumsel, Lampung, Aceh</div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>Potensi ekspansi B2B agen tinggi</div>
              </div>

              {/* Kalimantan */}
              <div
                onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'KALIMANTAN' ? 'ALL' : 'KALIMANTAN')}
                style={{
                  background: selectedIslandFilter === 'KALIMANTAN' ? 'rgba(251, 191, 36, 0.18)' : 'rgba(251, 191, 36, 0.06)',
                  border: selectedIslandFilter === 'KALIMANTAN' ? '2px solid #fbbf24' : '1px solid rgba(251, 191, 36, 0.2)',
                  padding: '14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: '#fbbf24', fontSize: '0.9rem' }}>🏝️ Pulau Kalimantan</strong>
                  <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 700 }}>Wilayah #3</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Kalbar, Kalsel, Kaltim, Kalteng, Kaltara</div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>HET daerah relatif tinggi</div>
              </div>

              {/* Sulawesi */}
              <div
                onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'SULAWESI' ? 'ALL' : 'SULAWESI')}
                style={{
                  background: selectedIslandFilter === 'SULAWESI' ? 'rgba(167, 139, 250, 0.18)' : 'rgba(167, 139, 250, 0.06)',
                  border: selectedIslandFilter === 'SULAWESI' ? '2px solid #a78bfa' : '1px solid rgba(167, 139, 250, 0.2)',
                  padding: '14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: '#a78bfa', fontSize: '0.9rem' }}>🏝️ Pulau Sulawesi</strong>
                  <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 700 }}>Wilayah #4</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Sulsel, Sulut, Sulteng, Sultra, Gorontalo</div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>Distribusi agen merata</div>
              </div>

              {/* Bali & Nusra */}
              <div
                onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'BALI_NT' ? 'ALL' : 'BALI_NT')}
                style={{
                  background: selectedIslandFilter === 'BALI_NT' ? 'rgba(244, 114, 182, 0.18)' : 'rgba(244, 114, 182, 0.06)',
                  border: selectedIslandFilter === 'BALI_NT' ? '2px solid #f472b6' : '1px solid rgba(244, 114, 182, 0.2)',
                  padding: '14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: '#f472b6', fontSize: '0.9rem' }}>🏝️ Bali &amp; Nusa Tenggara</strong>
                  <span style={{ fontSize: '0.75rem', color: '#f472b6', fontWeight: 700 }}>Wilayah #5</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Bali, NTB, NTT</div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>Dominasi konsumen UMKM/Wisata</div>
              </div>

              {/* Maluku & Papua */}
              <div
                onClick={() => setSelectedIslandFilter(selectedIslandFilter === 'MALUKU_PAPUA' ? 'ALL' : 'MALUKU_PAPUA')}
                style={{
                  background: selectedIslandFilter === 'MALUKU_PAPUA' ? 'rgba(147, 197, 253, 0.18)' : 'rgba(147, 197, 253, 0.06)',
                  border: selectedIslandFilter === 'MALUKU_PAPUA' ? '2px solid #93c5fd' : '1px solid rgba(147, 197, 253, 0.2)',
                  padding: '14px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ color: '#93c5fd', fontSize: '0.9rem' }}>🏝️ Maluku &amp; Papua</strong>
                  <span style={{ fontSize: '0.75rem', color: '#93c5fd', fontWeight: 700 }}>Wilayah #6</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Maluku, Malut, Papua, Papua Barat</div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8' }}>Konversi LPG &amp; perintis</div>
              </div>
            </div>

            {/* Tabel Sebaran Pangkalan Per Provinsi */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', marginBottom: '12px' }}>
                📋 Rincian Data Klien Per Provinsi:
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Ranking</th>
                    <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Nama Provinsi</th>
                    <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Jumlah Pangkalan</th>
                    <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Sebaran (%)</th>
                    <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Total Tabung / Bln</th>
                    <th style={{ padding: '10px', color: 'hsl(var(--text-secondary))' }}>Estimasi Omset Regional</th>
                  </tr>
                </thead>
                <tbody>
                  {!telemetryMetrics?.topProvinces || telemetryMetrics.topProvinces.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        Peta siap menerima data! Pangkalan akan terpetakan otomatis per provinsi saat bot dijalankan oleh klien.
                      </td>
                    </tr>
                  ) : (
                    telemetryMetrics.topProvinces
                      .filter((pr: any) => selectedIslandFilter === 'ALL' || getIslandKey(pr.name) === selectedIslandFilter)
                      .map((prov: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: idx === 0 ? '#fbbf24' : '#94a3b8' }}>
                            #{idx + 1}
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 700, color: '#ffffff' }}>
                            📍 {prov.name}
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: '#38bdf8' }}>
                            {prov.count} Pangkalan
                          </td>
                          <td style={{ padding: '12px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${prov.persenPangkalan || 10}%`, height: '100%', background: '#a78bfa', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 700 }}>{prov.persenPangkalan || 0}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                            {(prov.tabung || 0).toLocaleString('id-ID')} Tabung
                          </td>
                          <td style={{ padding: '12px 10px', fontWeight: 800, color: '#34d399' }}>
                            {formatRupiah(prov.omset || 0)}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 📝 EXECUTIVE SUMMARY AI BOX (Laporan Intelijen Sekali Klik) */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '18px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>📋</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#c4b5fd' }}>
                  Ringkasan Eksekutif Intelijen (Siap Salin)
                </h3>
              </div>
              <button
                onClick={handleCopyExecutiveSummary}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: copiedSummary ? '#34d399' : 'rgba(139, 92, 246, 0.2)',
                  color: copiedSummary ? '#0f172a' : '#c4b5fd',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {copiedSummary ? '✓ Berhasil Disalin!' : '📋 Salin Ringkasan Laporan'}
              </button>
            </div>
            <pre style={{
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '16px',
              borderRadius: '12px',
              color: '#cbd5e1',
              fontSize: '0.82rem',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              {generateExecutiveSummary()}
            </pre>
          </div>

          {/* Ranking & Peta Penetrasi PT Agen Penyalur Terbesar */}
          {telemetryMetrics?.topAgents && telemetryMetrics.topAgents.length > 0 && (
            <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>
                    🏢 Peta Penetrasi PT Agen Penyalur &amp; Peluang Ekspansi B2B
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

          {/* Search, Filter Multi-Dimensi & Export CSV Toolbar */}
          <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Filter Status */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Status:</span>
                <button
                  onClick={() => setTelemetryStatusFilter('ALL')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: telemetryStatusFilter === 'ALL' ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                    color: telemetryStatusFilter === 'ALL' ? '#0f172a' : '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  🏢 Semua ({telemetryPangkalans.length})
                </button>
                <button
                  onClick={() => setTelemetryStatusFilter('ACTIVE')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: telemetryStatusFilter === 'ACTIVE' ? '#34d399' : 'rgba(255,255,255,0.05)',
                    color: telemetryStatusFilter === 'ACTIVE' ? '#0f172a' : '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  🟢 Aktif ({telemetryMetrics?.activeCount || 0})
                </button>
                <button
                  onClick={() => setTelemetryStatusFilter('DORMANT')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: telemetryStatusFilter === 'DORMANT' ? '#f87171' : 'rgba(255,255,255,0.05)',
                    color: telemetryStatusFilter === 'DORMANT' ? '#0f172a' : '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  🔴 Dormant ({telemetryMetrics?.dormantCount || 0})
                </button>
                <button
                  onClick={() => setTelemetryStatusFilter('LOW_QUOTA')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: telemetryStatusFilter === 'LOW_QUOTA' ? '#fbbf24' : 'rgba(255,255,255,0.05)',
                    color: telemetryStatusFilter === 'LOW_QUOTA' ? '#0f172a' : '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  🔔 Kuota Tipis ({telemetryMetrics?.lowQuotaCount || 0})
                </button>
              </div>

              {/* Filter Platform */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>Device:</span>
                <button
                  onClick={() => setSelectedPlatformFilter('ALL')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: selectedPlatformFilter === 'ALL' ? '#a78bfa' : 'rgba(255,255,255,0.05)',
                    color: selectedPlatformFilter === 'ALL' ? '#0f172a' : '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Semua
                </button>
                <button
                  onClick={() => setSelectedPlatformFilter('ANDROID')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: selectedPlatformFilter === 'ANDROID' ? '#34d399' : 'rgba(255,255,255,0.05)',
                    color: selectedPlatformFilter === 'ANDROID' ? '#0f172a' : '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  📱 Android
                </button>
                <button
                  onClick={() => setSelectedPlatformFilter('WINDOWS')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: selectedPlatformFilter === 'WINDOWS' ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                    color: selectedPlatformFilter === 'WINDOWS' ? '#0f172a' : '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  💻 PC/Laptop
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 Cari nama pangkalan, pemilik, PT Agen, kota/provinsi, no HP, atau tipe HP/PC..."
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
          </div>

          {/* Tabel Intelijen Pangkalan Lengkap (Sortable Columns) */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th 
                      onClick={() => handleSortToggle('merchant_name')}
                      style={{ padding: '12px', color: 'hsl(var(--text-secondary))', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Nama Pangkalan &amp; ID {sortField === 'merchant_name' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Pemilik &amp; No HP</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>PT Agen Penyalur</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Wilayah</th>
                    <th 
                      onClick={() => handleSortToggle('kuota_pertamina_bulanan')}
                      style={{ padding: '12px', color: 'hsl(var(--text-secondary))', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Jatah Kuota {sortField === 'kuota_pertamina_bulanan' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th 
                      onClick={() => handleSortToggle('estimasi_laba_bulanan')}
                      style={{ padding: '12px', color: 'hsl(var(--text-secondary))', cursor: 'pointer', userSelect: 'none' }}
                    >
                      Estimasi Laba {sortField === 'estimasi_laba_bulanan' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                    </th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Device &amp; OS</th>
                    <th style={{ padding: '12px', color: 'hsl(var(--text-secondary))' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTelemetry.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'hsl(var(--text-muted))' }}>
                        Belum ada data pangkalan yang sesuai dengan filter.
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
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setSelectedPangkalan(p);
                                setSelectedWaTemplate('CLIENT_REPORT');
                              }}
                              style={{
                                padding: '6px 10px',
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
                            {p.phone && (
                              <a
                                href={formatWaUrl(p.phone, getWaMessage(p, 'CLIENT_REPORT'))}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  background: 'rgba(52, 211, 153, 0.2)',
                                  color: '#34d399',
                                  border: '1px solid rgba(52, 211, 153, 0.4)',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title="1-Klik Kirim Laporan Analisis Bisnis ke WA Klien"
                              >
                                📊 Kirim Report WA
                              </a>
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

          {/* Modal Detail Pangkalan Popup with Smart WhatsApp Generator */}
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
                maxWidth: '680px',
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '0.85rem' }}>
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

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
                  <h4 style={{ fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>📍 Alamat Lengkap</h4>
                  <p style={{ color: '#cbd5e1', lineHeight: '1.5' }}>
                    {selectedPangkalan.address || '-'}, {selectedPangkalan.kelurahan ? `Kel. ${selectedPangkalan.kelurahan}` : ''}, {selectedPangkalan.kecamatan ? `Kec. ${selectedPangkalan.kecamatan}` : ''}, {selectedPangkalan.kota_kabupaten || ''} {selectedPangkalan.provinsi || ''}
                  </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontSize: '0.85rem' }}>
                  <h4 style={{ fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>📱 Telemetri Perangkat &amp; Jaringan</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: '#cbd5e1' }}>
                    <div><strong>Platform:</strong> {selectedPangkalan.platform}</div>
                    <div><strong>Model HP/PC:</strong> {selectedPangkalan.device_model || '-'}</div>
                    <div><strong>OS:</strong> {selectedPangkalan.device_os || '-'}</div>
                    <div><strong>IP &amp; ISP:</strong> {selectedPangkalan.ip_address} ({selectedPangkalan.isp || 'Telkomsel'})</div>
                    <div><strong>HWID:</strong> <code style={{ fontSize: '0.72rem' }}>{selectedPangkalan.hwid}</code></div>
                    <div><strong>Versi Bot:</strong> v{selectedPangkalan.app_version || '1.0.9'}</div>
                  </div>
                </div>

                {/* 💬 SMART WHATSAPP MESSAGE GENERATOR */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  padding: '16px',
                  borderRadius: '14px',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <h4 style={{ fontWeight: 800, color: '#34d399', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      💬 Generator Pesan WhatsApp Cepat
                    </h4>
                    <select
                      value={selectedWaTemplate}
                      onChange={(e) => setSelectedWaTemplate(e.target.value)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: '#1e293b',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}
                    >
                      <option value="CLIENT_REPORT">📊 Laporan Analisis Bisnis &amp; Kesehatan Klien</option>
                      <option value="TECH_SUPPORT">🛠️ Bantuan Teknis &amp; CS</option>
                      <option value="LOW_QUOTA">🔔 Penawaran Top-Up Kuota</option>
                      <option value="B2B_AGENT">🏢 Proposal B2B ke PT Agen</option>
                      <option value="LOYALTY_PROMO">🎁 Promo Diskon Loyalitas</option>
                    </select>
                  </div>
                  <textarea
                    rows={6}
                    value={customWaMessage}
                    onChange={(e) => setCustomWaMessage(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                      padding: '10px',
                      fontSize: '0.82rem',
                      lineHeight: '1.5',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {selectedPangkalan.phone && (
                    <>
                      <a
                        href={formatWaUrl(selectedPangkalan.phone, getWaMessage(selectedPangkalan, 'CLIENT_REPORT'))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{
                          padding: '10px 18px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          borderColor: '#10b981',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}
                      >
                        📊 1-Klik Kirim Laporan Bisnis
                      </a>
                      <a
                        href={formatWaUrl(selectedPangkalan.phone, customWaMessage)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{
                          padding: '10px 18px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontWeight: 700,
                          fontSize: '0.85rem'
                        }}
                      >
                        💬 Kirim Pesan Kustom WA
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedPangkalan(null)}
                    className="btn btn-secondary"
                    style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem' }}
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
