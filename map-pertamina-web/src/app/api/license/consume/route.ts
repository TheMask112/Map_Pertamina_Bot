import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyLicenseKey } from '@/lib/keygen';

export async function POST(request: Request) {
  try {
    const licenseKey = request.headers.get('x-license-key');
    if (!licenseKey) {
      return NextResponse.json({ error: 'License key wajib disertakan.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const amount = parseInt(body.amount, 10) || 1;

    const result = await sql`
      SELECT id, kuota_terpakai, status 
      FROM orders 
      WHERE license_key = ${licenseKey} AND status = 'REDEEMED' 
      LIMIT 1
    `;

    let order;
    if (result.length === 0) {
      // Fallback: Verifikasi keaslian lisensi secara manual (untuk lisensi manual/lama yang belum terdaftar di DB)
      const { isValid, payload } = verifyLicenseKey(licenseKey);
      if (!isValid || !payload) {
        return NextResponse.json({ error: 'Lisensi tidak aktif atau tidak ditemukan.' }, { status: 404 });
      }

      // Daftarkan lisensi valid ini ke database orders
      const expiryDate = new Date(payload.expiry);
      const insertResult = await sql`
        INSERT INTO orders (
          paket, base_amount, amount, whatsapp, status, 
          expires_at, kuota_terpakai, hwid, license_key, paid_at, redeemed_at
        ) VALUES (
          ${payload.paket || 'CUSTOM'}, 0, 0, 'legacy_sync', 'REDEEMED',
          ${expiryDate}, 0, ${payload.hwid}, ${licenseKey}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id, kuota_terpakai, status
      `;
      order = insertResult[0];
      console.log(`[API License Consume] Auto-registered legacy/manual license key for HWID: ${payload.hwid}`);
    } else {
      order = result[0];
    }

    const newUsed = (order.kuota_terpakai || 0) + amount;

    await sql`
      UPDATE orders 
      SET kuota_terpakai = ${newUsed} 
      WHERE id = ${order.id}
    `;

    return NextResponse.json({
      success: true,
      kuota_terpakai: newUsed
    });
  } catch (error) {
    console.error('[API License Consume Error]', error);
    return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
  }
}
