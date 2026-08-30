import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateVoucherCode } from '@/lib/voucher';

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

    // Ambil data semua order dari database Neon
    const orders = await sql`
      SELECT id, paket, base_amount, amount, whatsapp, status, voucher_code, created_at, expires_at 
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
    const voucherCode = generateVoucherCode();

    // Update status order menjadi PAID dan masukkan kode voucher (untuk PENDING atau EXPIRED)
    const updateResult = await sql`
      UPDATE orders 
      SET status = 'PAID', 
          paid_at = CURRENT_TIMESTAMP,
          voucher_code = ${voucherCode} 
      WHERE id = ${orderId} AND (status = 'PENDING' OR status = 'EXPIRED' OR status = 'REVOKED')
      RETURNING id, paket, whatsapp, amount;
    `;

    if (updateResult.length === 0) {
      return NextResponse.json({ error: 'Order tidak ditemukan atau tidak dapat diperbarui.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, voucherCode });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem internal.' }, { status: 500 });
  }
}
