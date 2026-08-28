// route.ts (api/orders/[id]/status)
// API Endpoint to Poll or Check Order Status and Retrieve Voucher with Active Midtrans Sync

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CONFIG } from '@/lib/config';
import { generateVoucherCode } from '@/lib/voucher';
import { generateLicenseKey } from '@/lib/keygen';
import { sendWhatsApp, getVoucherMessageTemplate } from '@/lib/fonnte';

const ipCache = new Map<string, { count: number, resetTime: number }>();

function isRateLimited(ip: string, limit: number = 60, windowMs: number = 60000): boolean {
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Rate Limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || '127.0.0.1';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' }, { status: 429 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID order tidak disediakan.' },
        { status: 400 }
      );
    }

    // 2. Ambil data order berdasarkan ID
    const result = await sql`
      SELECT id, paket, amount, whatsapp, hwid, status, voucher_code, expires_at, paid_at, license_key 
      FROM orders 
      WHERE id = ${id} 
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Order tidak ditemukan.' },
        { status: 404 }
      );
    }

    let order = result[0];
    const now = new Date();

    // 3. Active Midtrans Polling jika status masih PENDING
    if (order.status === 'PENDING') {
      const serverKey = process.env.MIDTRANS_SERVER_KEY;
      if (serverKey && !serverKey.includes('your_midtrans_server_key')) {
        try {
          const authHeader = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;
          const isProduction = CONFIG.midtrans.isProduction;
          const baseUrl = isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
          
          const midtransRes = await fetch(`${baseUrl}/v2/${id}/status`, {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json'
            },
            cache: 'no-store'
          });

          if (midtransRes.ok) {
            const midtransData = await midtransRes.json();
            const transactionStatus = midtransData.transaction_status;
            const fraudStatus = midtransData.fraud_status;

            const isPaymentSuccess = 
              transactionStatus === 'settlement' || 
              (transactionStatus === 'capture' && fraudStatus === 'accept');

            if (isPaymentSuccess) {
              const voucherCode = generateVoucherCode();
              const updateResult = await sql`
                UPDATE orders 
                SET status = 'PAID', 
                    paid_at = CURRENT_TIMESTAMP, 
                    voucher_code = ${voucherCode}
                WHERE id = ${order.id} 
                  AND (status = 'PENDING' OR status = 'EXPIRED')
                RETURNING id, paket, whatsapp, amount, hwid, status, voucher_code, paid_at
              `;

              if (updateResult.length > 0) {
                order = { ...order, ...updateResult[0] };
                const paketDetail = CONFIG.pakets[order.paket];
                const kuota = paketDetail ? paketDetail.kuota : 0;
                const hari = paketDetail ? paketDetail.hari : 36500;
                const paketNama = paketDetail ? paketDetail.nama : order.paket;

                // Auto-generate lisensi jika HWID tersedia
                let autoLicenseKey: string | null = null;
                if (order.hwid) {
                  try {
                    autoLicenseKey = generateLicenseKey(order.hwid, order.paket, hari, kuota);
                    await sql`
                      UPDATE orders
                      SET status = 'REDEEMED',
                          redeemed_at = CURRENT_TIMESTAMP,
                          license_key = ${autoLicenseKey}
                      WHERE id = ${order.id}
                    `;
                    order.status = 'REDEEMED';
                    order.license_key = autoLicenseKey;
                  } catch (keygenErr) {
                    console.error('[API Status] Auto license generation error:', keygenErr);
                  }
                }

                // Kirim notifikasi WA (Non-blocking)
                try {
                  const customerMsg = autoLicenseKey
                    ? `✅ *Pembayaran ${paketNama} berhasil!*\n\nLisensi Anda sudah AKTIF otomatis di perangkat Anda.\n\n🔑 Backup License Key:\n\`${autoLicenseKey}\`\n\nTerima kasih sudah menggunakan Bot MAP Pertamina! 🚀`
                    : getVoucherMessageTemplate(paketNama, kuota, order.amount, voucherCode);
                  sendWhatsApp(order.whatsapp, customerMsg).catch(e => console.warn('[Fonnte Background] Customer WA error:', e));

                  const adminPhone = process.env.ADMIN_PHONE;
                  if (adminPhone) {
                    const adminMsg = 
                      `*🔔 MIDTRANS: PENJUALAN MASUK (Active Check)* 🔔\n\n` +
                      `Paket: *${paketNama}* (${kuota.toLocaleString('id-ID')} Tabung)\n` +
                      `Nominal: *Rp ${order.amount.toLocaleString('id-ID')}*\n` +
                      `HP User: *${order.whatsapp}*\n` +
                      `Voucher: \`${voucherCode}\`\n\n` +
                      `Sistem berhasil memverifikasi pembayaran Midtrans secara otomatis. 🚀`;
                    sendWhatsApp(adminPhone, adminMsg).catch(e => console.warn('[Fonnte Background] Admin WA error:', e));
                  }
                } catch (waErr) {
                  console.warn('[API Status] WA Notification error:', waErr);
                }
              }
            } else if (['cancel', 'expire', 'deny'].includes(transactionStatus)) {
              await sql`
                UPDATE orders 
                SET status = 'EXPIRED' 
                WHERE id = ${id}
              `;
              order.status = 'EXPIRED';
            }
          }
        } catch (midtransErr) {
          console.warn('[API Status] Active Midtrans Check Error:', midtransErr);
        }
      }
    }

    // 4. Cek apakah order PENDING sudah melewati batas kadaluwarsa (15 menit)
    if (order.status === 'PENDING' && now > new Date(order.expires_at)) {
      await sql`
        UPDATE orders 
        SET status = 'EXPIRED' 
        WHERE id = ${id}
      `;
      
      return NextResponse.json({
        status: 'EXPIRED',
        voucherCode: null,
        paidAt: null
      });
    }

    // 5. Kembalikan status terkini
    const isPaid = order.status === 'PAID' || order.status === 'REDEEMED';

    return NextResponse.json({
      status: order.status,
      voucherCode: isPaid ? order.voucher_code : null,
      licenseKey: order.status === 'REDEEMED' ? order.license_key : null,
      paidAt: order.paid_at
    });

  } catch (error) {
    console.error('[API Get Status] Unexpected Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal saat memproses data.' },
      { status: 500 }
    );
  }
}
