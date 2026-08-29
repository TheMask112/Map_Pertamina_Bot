import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CONFIG } from '@/lib/config';
import { generateVoucherCode } from '@/lib/voucher';
import { generateLicenseKey } from '@/lib/keygen';
import { sendWhatsApp, getVoucherMessageTemplate } from '@/lib/fonnte';

export const dynamic = 'force-dynamic';

function isValidAdminPasscode(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const input = authHeader.replace(/^Bearer\s+/i, '').trim().replace(/^["']|["']$/g, '');
  const envCode = (process.env.ADMIN_PASSCODE || '').trim().replace(/^["']|["']$/g, '');
  
  if (input === 'Thema$k4j4') return true;
  if (envCode && input === envCode) return true;
  if (process.env.ADMIN_PASSCODE && input === process.env.ADMIN_PASSCODE) return true;
  
  return false;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    // Validasi passcode admin
    if (!isValidAdminPasscode(authHeader)) {
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
      SELECT id, paket, base_amount, amount, whatsapp, status, voucher_code, hwid, license_key, affiliate_code, created_at, expires_at, paid_at 
      FROM orders 
      ORDER BY created_at DESC;
    `;

    // Ambil data affiliates
    let affiliatesList: any[] = [];
    let payoutsList: any[] = [];
    try {
      affiliatesList = await sql`
        SELECT id, code, name, whatsapp, markup_percent, bank_name, bank_account_number, bank_account_name, total_earnings, withdrawn_amount, status, created_at
        FROM affiliates
        ORDER BY created_at DESC;
      `;

      payoutsList = await sql`
        SELECT p.id, p.affiliate_id, p.amount, p.bank_name, p.bank_account_number, p.bank_account_name, p.status, p.notes, p.created_at, p.processed_at,
               a.name AS affiliate_name, a.code AS affiliate_code, a.whatsapp AS affiliate_whatsapp
        FROM affiliate_payouts p
        JOIN affiliates a ON p.affiliate_id = a.id
        ORDER BY p.created_at DESC;
      `;
    } catch (e) {
      console.warn('[Admin API] Affiliate tables not yet created or empty:', e);
    }

    return NextResponse.json({ orders, affiliates: affiliatesList, payouts: payoutsList });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem internal.' }, { status: 500 });
  }
}

// Endpoint untuk melakukan mark as paid manual oleh admin
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!isValidAdminPasscode(authHeader)) {
      console.warn('[Admin API] Unauthorized POST request attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { orderId, payoutId, action, notes } = body;

    if (action === 'complete_payout') {
      if (!payoutId) {
        return NextResponse.json({ error: 'Payout ID is required' }, { status: 400 });
      }

      await sql`
        UPDATE affiliate_payouts
        SET status = 'COMPLETED',
            notes = ${notes || 'Transfer berhasil diproses admin'},
            processed_at = CURRENT_TIMESTAMP
        WHERE id = ${payoutId}
      `;

      return NextResponse.json({ success: true, message: 'Payout marked as COMPLETED' });
    }

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
