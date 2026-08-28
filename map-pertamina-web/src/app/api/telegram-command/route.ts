import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // 1. Validasi X-License-Key
    const licenseKey = request.headers.get('x-license-key');
    if (!licenseKey) {
      return NextResponse.json({ error: 'Akses ditolak. Lisensi wajib disertakan.' }, { status: 401 });
    }

    const licenseCheck = await sql`
      SELECT id FROM orders 
      WHERE license_key = ${licenseKey} AND status = 'REDEEMED' 
      LIMIT 1
    `;

    if (licenseCheck.length === 0) {
      console.warn('[Telegram Command] Invalid or inactive license key:', licenseKey);
      return NextResponse.json({ error: 'Lisensi tidak valid atau tidak aktif.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const whatsapp = searchParams.get('whatsapp');

    if (!whatsapp) {
      return NextResponse.json({ error: 'Parameter whatsapp wajib.' }, { status: 400 });
    }

    // 1. Cari perintah yang tersimpan untuk nomor whatsapp ini
    const result = await sql`
      SELECT command FROM telegram_commands WHERE whatsapp = ${whatsapp} LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json({ command: null });
    }

    const commandStr = result[0].command;

    // 2. Hapus perintah setelah dibaca (agar tidak tereksekusi dua kali)
    await sql`
      DELETE FROM telegram_commands WHERE whatsapp = ${whatsapp}
    `;

    return NextResponse.json({ command: commandStr });
  } catch (error) {
    console.error('[API telegram-command Error]', error);
    return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
  }
}
