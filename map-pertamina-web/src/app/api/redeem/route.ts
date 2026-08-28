// route.ts (api/redeem)
// API Endpoint for Voucher Redemption via Telegram Bot

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CONFIG } from '@/lib/config';

export async function POST(request: Request) {
  try {
    // 1. Validasi API Key Keamanan dari Telegram Bot
    const apiKey = request.headers.get('X-API-Key');
    const systemApiKey = process.env.REDEEM_API_KEY;

    if (!systemApiKey || apiKey !== systemApiKey) {
      console.warn('[Redeem API] Unauthorized access attempt.');
      return NextResponse.json(
        { error: 'Akses ditolak. API Key tidak valid.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { voucher_code, hwid } = body;

    if (!voucher_code || !hwid) {
      return NextResponse.json(
        { error: 'Parameter "voucher_code" dan "hwid" wajib dikirim.' },
        { status: 400 }
      );
    }

    const cleanVoucher = voucher_code.trim().toUpperCase();
    const cleanHwid = hwid.trim().toUpperCase();

    // 2. Cari order dengan kode voucher tersebut
    const result = await sql`
      SELECT id, paket, status, redeemed_at 
      FROM orders 
      WHERE voucher_code = ${cleanVoucher} 
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Kode voucher tidak valid.' },
        { status: 404 }
      );
    }

    const order = result[0];

    // 3. Cek status voucher (harus PAID agar bisa diredeem)
    if (order.status === 'REDEEMED') {
      return NextResponse.json(
        { error: 'Kode voucher ini sudah pernah digunakan (diredeem).' },
        { status: 400 }
      );
    }

    if (order.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Voucher belum aktif karena pembayaran belum terverifikasi.' },
        { status: 400 }
      );
    }

    // 4. Update status order menjadi REDEEMED secara atomik
    const updateResult = await sql`
      UPDATE orders 
      SET status = 'REDEEMED', 
          redeemed_at = CURRENT_TIMESTAMP
      WHERE id = ${order.id} AND status = 'PAID'
      RETURNING paket
    `;

    if (updateResult.length === 0) {
      return NextResponse.json(
        { error: 'Gagal merubah status voucher. Voucher mungkin sudah diredeem.' },
        { status: 409 }
      );
    }

    const redeemedOrder = updateResult[0];
    const paketDetail = CONFIG.pakets[redeemedOrder.paket];

    if (!paketDetail) {
      return NextResponse.json(
        { error: 'Detil paket tidak terkonfigurasi pada sistem.' },
        { status: 500 }
      );
    }

    // 5. Kembalikan detail lisensi untuk di-generate oleh Bot Telegram
    return NextResponse.json({
      status: 'success',
      paket: redeemedOrder.paket,
      kuota: paketDetail.kuota,
      hari: paketDetail.hari
    });

  } catch (error: any) {
    console.error('[API Redeem] Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem di server redeem.' },
      { status: 500 }
    );
  }
}
