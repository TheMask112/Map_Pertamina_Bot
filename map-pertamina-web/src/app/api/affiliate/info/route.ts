import { NextResponse } from 'next/server';
import { sql, ensureAffiliateTables } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await ensureAffiliateTables();

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: 'Kode affiliate diperlukan.' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const rows = await sql`
      SELECT code, name, whatsapp, markup_percent, status
      FROM affiliates
      WHERE UPPER(code) = ${cleanCode} AND status = 'ACTIVE'
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Mitra affiliate tidak ditemukan atau tidak aktif.' }, { status: 404 });
    }

    const affiliate = rows[0];

    return NextResponse.json({
      success: true,
      affiliate: {
        code: affiliate.code,
        name: affiliate.name,
        whatsapp: affiliate.whatsapp,
        markupPercent: Math.min(Math.max(affiliate.markup_percent || 0, 0), 50),
      }
    });

  } catch (error) {
    console.error('[API Affiliate Info Error]', error);
    return NextResponse.json({ error: 'Gagal mengambil data affiliate.' }, { status: 500 });
  }
}
