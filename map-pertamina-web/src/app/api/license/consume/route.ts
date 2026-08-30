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

    // Verifikasi keaslian kriptografi RSA lisensi
    const { isValid, payload } = verifyLicenseKey(licenseKey);
    if (!isValid || !payload) {
      return NextResponse.json({ error: 'Lisensi tidak sah atau tanda tangan digital tidak valid.' }, { status: 403 });
    }

    const paketQuotaMap: Record<string, number> = {
      STARTER: 500,
      PRO: 2000,
      ENTERPRISE: 5000,
    };
    const maxQuota = Number(payload.kuota_total) || paketQuotaMap[(payload.paket || '').toUpperCase()] || 500;

    const result = await sql`
      SELECT id, kuota_terpakai, status 
      FROM orders 
      WHERE license_key = ${licenseKey} AND status IN ('REDEEMED', 'PAID')
      LIMIT 1
    `;

    let order;
    if (result.length === 0) {
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
    } else {
      order = result[0];
    }

    if (order.status === 'REVOKED') {
      return NextResponse.json({ error: 'Lisensi telah dinonaktifkan (REVOKED).' }, { status: 403 });
    }

    const currentUsed = order.kuota_terpakai || 0;
    if (currentUsed >= maxQuota) {
      return NextResponse.json({ 
        error: `Kuota lisensi telah habis (${currentUsed}/${maxQuota} tabung). Silakan top-up atau perpanjang lisensi.`,
        kuota_terpakai: currentUsed,
        kuota_total: maxQuota
      }, { status: 403 });
    }

    const newUsed = Math.min(maxQuota, currentUsed + amount);

    await sql`
      UPDATE orders 
      SET kuota_terpakai = ${newUsed} 
      WHERE id = ${order.id}
    `;

    return NextResponse.json({
      success: true,
      kuota_terpakai: newUsed,
      kuota_total: maxQuota
    });
  } catch (error) {
    console.error('[API License Consume Error]', error);
    return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
  }
}
