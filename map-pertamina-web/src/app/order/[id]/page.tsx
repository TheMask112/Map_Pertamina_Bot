// page.tsx (src/app/order/[id]/page.tsx)
// Server-Side Rendered Order Status Check Page

import { sql } from '@/lib/db';
import { CONFIG } from '@/lib/config';
import { notFound } from 'next/navigation';
import React from 'react';

interface OrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderStatusPage({ params }: OrderPageProps) {
  const { id } = await params;

  if (!id || id.length !== 36) {
    return notFound();
  }

  // 1. Ambil data order langsung dari database PostgreSQL (Neon) di Server
  const result = await sql`
    SELECT id, paket, base_amount, amount, whatsapp, status, voucher_code, created_at, paid_at, expires_at 
    FROM orders 
    WHERE id = ${id} 
    LIMIT 1
  `;

  if (result.length === 0) {
    return notFound();
  }

  const order = result[0];
  const paketDetail = CONFIG.pakets[order.paket];
  const quota = paketDetail ? paketDetail.kuota : 0;
  
  // Hitung status kadaluwarsa secara real-time
  let currentStatus = order.status;
  if (order.status === 'PENDING' && new Date() > new Date(order.expires_at)) {
    currentStatus = 'EXPIRED';
    // Auto-update status di background
    sql`UPDATE orders SET status = 'EXPIRED' WHERE id = ${id}`.catch(console.error);
  }

  // Format tanggal lokalisasi Indonesia
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.box} className="glass-card">
        {/* Status Header Badge */}
        {currentStatus === 'PENDING' && (
          <div style={{ ...styles.statusBadge, ...styles.badgePending }}>⏳ MENUNGGU PEMBAYARAN</div>
        )}
        {currentStatus === 'PAID' && (
          <div style={{ ...styles.statusBadge, ...styles.badgePaid }}>🎉 TERVERIFIKASI / BELUM REDEEM</div>
        )}
        {currentStatus === 'REDEEMED' && (
          <div style={{ ...styles.statusBadge, ...styles.badgeRedeemed }}>✅ SELESAI / DIREDEEM</div>
        )}
        {currentStatus === 'EXPIRED' && (
          <div style={{ ...styles.statusBadge, ...styles.badgeExpired }}>❌ KEDALUWARSA</div>
        )}

        <div style={styles.header}>
          <h2 style={styles.title}>Detail Order Pelanggan</h2>
          <span style={styles.orderId}>ID: {order.id}</span>
        </div>

        {/* ORDER DETAILS TABLE */}
        <div style={styles.detailsGrid}>
          <div style={styles.detailRow}>
            <span>Paket Pembelian</span>
            <strong>{paketDetail ? `${paketDetail.nama} (${quota.toLocaleString('id-ID')} Tabung)` : order.paket}</strong>
          </div>
          <div style={styles.detailRow}>
            <span>Nomor WhatsApp</span>
            <strong>{order.whatsapp}</strong>
          </div>
          <div style={styles.detailRow}>
            <span>Nominal Pembayaran</span>
            <strong style={{ fontSize: '1.2rem', color: '#fff' }}>Rp {order.amount.toLocaleString('id-ID')}</strong>
          </div>
          <div style={styles.detailRow}>
            <span>Tanggal Pemesanan</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
          {order.paid_at && (
            <div style={styles.detailRow}>
              <span>Waktu Pembayaran</span>
              <span>{formatDate(order.paid_at)}</span>
            </div>
          )}
          {currentStatus === 'PENDING' && (
            <div style={styles.detailRow}>
              <span>Batas Waktu Transfer</span>
              <span style={{ color: 'hsl(346, 84%, 50%)', fontWeight: 600 }}>{formatDate(order.expires_at)}</span>
            </div>
          )}
        </div>

        {/* PAYMENT DYNAMIC AREA BASED ON STATUS */}
        {currentStatus === 'PENDING' && (
          <div style={styles.actionArea}>
            <p style={styles.actionText}>
              Anda belum menyelesaikan pembayaran. Silakan bayar menggunakan tombol di bawah ini:
            </p>
            <a href={`/checkout?paket=${order.paket}`} className="btn btn-primary" style={{ width: '100%' }}>
              💳 Lanjutkan ke Halaman Pembayaran
            </a>
          </div>
        )}

        {(currentStatus === 'PAID' || currentStatus === 'REDEEMED') && (
          <div style={styles.voucherBox}>
            <div style={styles.voucherLabel}>KODE VOUCHER LISENSI ANDA</div>
            <div style={styles.voucherCode}>{order.voucher_code}</div>
            <p style={styles.voucherDesc}>
              {currentStatus === 'PAID' 
                ? 'Salin kode voucher di atas dan masukkan ke Bot Telegram keygen resmi Anda untuk mendapatkan License Key.'
                : 'Voucher ini telah sukses diredeem di Telegram Bot.'}
            </p>
          </div>
        )}

        {currentStatus === 'EXPIRED' && (
          <div style={styles.actionArea}>
            <p style={styles.actionText}>
              Batas waktu 15 menit untuk pembayaran order ini telah habis. Silakan buat pesanan baru.
            </p>
            <a href="/#pricing" className="btn btn-secondary" style={{ width: '100%' }}>
              🔄 Buat Pesanan Baru
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px 0',
  },
  box: {
    maxWidth: '600px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    padding: '40px 30px',
  },
  statusBadge: {
    alignSelf: 'center',
    fontSize: '0.8rem',
    fontWeight: 800,
    borderRadius: '30px',
    padding: '6px 16px',
    letterSpacing: '0.05em',
  },
  badgePending: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    color: 'hsl(38, 92%, 50%)',
  },
  badgePaid: {
    background: 'rgba(14, 165, 233, 0.1)',
    border: '1px solid rgba(14, 165, 233, 0.2)',
    color: 'hsl(194, 96%, 52%)',
  },
  badgeRedeemed: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: 'hsl(142, 76%, 45%)',
  },
  badgeExpired: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: 'hsl(346, 84%, 50%)',
  },
  header: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    paddingBottom: '20px',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: 800,
  },
  orderId: {
    fontSize: '0.75rem',
    color: 'hsl(215, 12%, 40%)',
    fontFamily: 'monospace',
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    color: 'hsl(215, 20%, 65%)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
    paddingBottom: '10px',
  },
  actionArea: {
    marginTop: '16px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  actionText: {
    fontSize: '0.85rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.4',
  },
  voucherBox: {
    background: 'rgba(255,255,255,0.01)',
    border: '1px dashed rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  voucherLabel: {
    fontSize: '0.75rem',
    fontWeight: 800,
    color: 'hsl(194, 96%, 52%)',
    letterSpacing: '0.08em',
  },
  voucherCode: {
    fontSize: '2.2rem',
    fontWeight: 900,
    letterSpacing: '0.05em',
    color: '#ffffff',
  },
  voucherDesc: {
    fontSize: '0.8rem',
    color: 'hsl(215, 20%, 65%)',
    lineHeight: '1.4',
  },
};
