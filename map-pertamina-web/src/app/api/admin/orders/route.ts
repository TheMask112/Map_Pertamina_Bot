import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CONFIG } from '@/lib/config';
import { generateVoucherCode } from '@/lib/voucher';
import { generateLicenseKey } from '@/lib/keygen';
import { sendWhatsApp, getVoucherMessageTemplate } from '@/lib/fonnte';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    // Validasi passcode admin dari env variable (Strict passcode check)
    const adminPasscode = process.env.ADMIN_PASSCODE;
    if (!adminPasscode || authHeader !== adminPasscode) {
      console.warn('[Admin API] Unauthorized GET request attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-expire old pending orders
    await sql`
      UPDATE orders 
      SET status = 'EXPIRED' 
      WHERE status = 'PENDING' AND expires_at < NOW();
    `;

    // Ambil data semua order dari database Neon (termasuk hwid dan license_key)
    const orders = await sql`
      SELECT id, paket, base_amount, amount, whatsapp, status, voucher_code, hwid, license_key, created_at, expires_at, paid_at 
      FROM orders 
      ORDER BY created_at DESC;
    `;

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem internal.' }, { status: 500 });
  }
}

// Endpoint untuk melakukan mark as paid manual oleh admin
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    const adminPasscode = process.env.ADMIN_PASSCODE;
    if (!adminPasscode || authHeader !== adminPasscode) {
      console.warn('[Admin API] Unauthorized POST request attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, action } = await request.json();
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (action === 'revoke') {
      // Cabut lisensi (REVOKED)
      await sql`
        UPDATE orders 
        SET status = 'REVOKED', voucher_code = NULL, license_key = NULL 
        WHERE id = ${orderId};
      `;
      return NextResponse.json({ success: true, revoked: true });
    }

    // Generate kode voucher lisensi unik
    let voucherCode = generateVoucherCode();
    for (let i = 0; i < 5; i++) {
      const exist = await sql`SELECT id FROM orders WHERE voucher_code = ${voucherCode} LIMIT 1`;
      if (exist.length === 0) break;
      voucherCode = generateVoucherCode();
    }

    // Update status order menjadi PAID dan masukkan kode voucher
    const updateResult = await sql`
      UPDATE orders 
      SET status = 'PAID', 
          paid_at = CURRENT_TIMESTAMP,
          voucher_code = ${voucherCode} 
      WHERE id = ${orderId}
      RETURNING id, paket, whatsapp, amount, hwid;
    `;

    if (updateResult.length === 0) {
      return NextResponse.json({ error: 'Order tidak ditemukan atau tidak dapat diperbarui.' }, { status: 404 });
    }

    const updatedOrder = updateResult[0];
    const paketDetail = CONFIG.pakets[updatedOrder.paket];
    const kuota = paketDetail ? paketDetail.kuota : (updatedOrder.paket === 'PRO' ? 2000 : (updatedOrder.paket === 'ENTERPRISE' ? 5000 : 500));
    const hari = paketDetail ? paketDetail.hari : 36500;
    const paketNama = paketDetail ? paketDetail.nama : updatedOrder.paket;

    // Jika HWID sudah ada, langsung buatkan License Key & set REDEEMED
    let autoLicenseKey: string | null = null;
    if (updatedOrder.hwid) {
      try {
        autoLicenseKey = generateLicenseKey(updatedOrder.hwid, updatedOrder.paket, hari, kuota);
        await sql`
          UPDATE orders
          SET status = 'REDEEMED',
              redeemed_at = CURRENT_TIMESTAMP,
              license_key = ${autoLicenseKey}
          WHERE id = ${updatedOrder.id}
        `;
      } catch (e) {
        console.error('[Admin Override] Auto license key generation error:', e);
      }
    }

    // Kirim notifikasi WA (Non-blocking)
    try {
      const customerMsg = autoLicenseKey
        ? `✅ *Pembayaran ${paketNama} berhasil diverifikasi admin!*\n\nLisensi Anda sudah AKTIF otomatis di perangkat Anda.\n\n🔑 License Key:\n\`${autoLicenseKey}\`\n\nTerima kasih sudah menggunakan Bot MAP Pertamina! 🚀`
        : getVoucherMessageTemplate(paketNama, kuota, updatedOrder.amount, voucherCode);
      sendWhatsApp(updatedOrder.whatsapp, customerMsg).catch(e => console.warn('[Fonnte Background] Customer WA error:', e));
    } catch (waErr) {
      console.warn('[Admin Override] WA error:', waErr);
    }

    return NextResponse.json({ success: true, voucherCode, licenseKey: autoLicenseKey });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan sistem internal.' }, { status: 500 });
  }
}
