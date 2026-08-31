// route.ts (api/redeem-direct)
// ============================
// Endpoint untuk Android/Desktop meredeem lisensi langsung (tanpa Telegram)
// Dipanggil SETELAH pembayaran Midtrans sukses jika license_key belum di-generate otomatis oleh webhook.
// Flow utama: webhook midtrans sudah auto-generate → Android polling /api/orders/[id]/status
// Flow fallback: Android/Desktop panggil endpoint ini dengan voucherCode + hwid

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CONFIG } from '@/lib/config';
import { generateLicenseKey } from '@/lib/keygen';
import { sendTelegramToAdmin } from '@/lib/notify';

const ipCache = new Map<string, { count: number, resetTime: number }>();

function isRateLimited(ip: string, limit: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const cached = ipCache.get(ip);
  if (!cached) {
    ipCache.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  if (now > cached.resetTime) {
    ipCache.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }
  cached.count++;
  if (cached.count > limit) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    // 1. Rate Limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const { voucherCode, hwid } = body;

    if (!voucherCode || !hwid) {
      return NextResponse.json({ error: 'Parameter voucherCode dan hwid wajib diisi.' }, { status: 400 });
    }

    const cleanHwid = String(hwid).replace(/-/g, '').toUpperCase();

    // 2. Cek Order berdasarkan voucher
    const result = await sql`
      SELECT id, paket, status, license_key, hwid
      FROM orders
      WHERE voucher_code = ${voucherCode.toUpperCase()}
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Kode voucher tidak valid atau tidak ditemukan.' }, { status: 404 });
    }

    const order = result[0];

    // 3. Jika sudah REDEEMED dan hwid cocok → kembalikan license key yang ada
    if (order.status === 'REDEEMED') {
      if (order.license_key && order.hwid === cleanHwid) {
        return NextResponse.json({
          success: true,
          licenseKey: order.license_key,
          message: 'Lisensi sudah aktif untuk perangkat ini.'
        });
      }
      return NextResponse.json({ error: 'Voucher sudah digunakan oleh perangkat lain.' }, { status: 400 });
    }

    if (order.status !== 'PAID') {
      return NextResponse.json({ error: 'Voucher belum aktif karena pembayaran belum terverifikasi.' }, { status: 400 });
    }

    // 4. Generate License Key menggunakan RSA-2048
    const paketDetail = CONFIG.pakets[order.paket];
    if (!paketDetail) {
      return NextResponse.json({ error: 'Paket tidak valid di konfigurasi server.' }, { status: 500 });
    }

    const licenseKey = generateLicenseKey(cleanHwid, order.paket, paketDetail.hari, paketDetail.kuota);

    // 5. Update Order — simpan hwid, license_key, tandai REDEEMED (atomic)
    const updateResult = await sql`
      UPDATE orders
      SET status = 'REDEEMED',
          redeemed_at = CURRENT_TIMESTAMP,
          hwid = ${cleanHwid},
          license_key = ${licenseKey}
      WHERE id = ${order.id} AND status = 'PAID'
      RETURNING id
    `;

    if (updateResult.length === 0) {
      return NextResponse.json({ error: 'Terjadi konflik saat meredeem voucher. Silakan coba lagi.' }, { status: 409 });
    }

    // 6. Notifikasi Telegram ke Admin (Non-blocking)
    try {
      const redeemMsg = 
        `🔑 *LISENSI BERHASIL DIAKTIFKAN (REDEEM)* 🔑\n\n` +
        `📦 Paket: *${order.paket}* (${paketDetail.kuota.toLocaleString('id-ID')} Tabung)\n` +
        `🎫 Voucher: \`${voucherCode.toUpperCase()}\`\n` +
        `💻 HWID: \`${cleanHwid}\`\n` +
        `🕒 Waktu: *${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB*`;
      sendTelegramToAdmin(redeemMsg).catch(err => console.warn('[Telegram Redeem Notify] Error:', err));
    } catch (e) {
      console.warn('[Telegram Redeem Notify] Failed:', e);
    }

    // 7. Sukses
    return NextResponse.json({
      success: true,
      licenseKey: licenseKey,
      message: 'Lisensi berhasil diaktifkan secara otomatis!'
    });

  } catch (error: any) {
    console.error('[API Direct Redeem Error]', error);
    return NextResponse.json({ error: 'Kesalahan server internal.' }, { status: 500 });
  }
}
