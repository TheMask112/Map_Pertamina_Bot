import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: Request) {
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
      console.warn('[Telegram Notify Report] Invalid or inactive license key:', licenseKey);
      return NextResponse.json({ error: 'Lisensi tidak valid atau tidak aktif.' }, { status: 403 });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is not defined!');
    }

    // 2. Parse form data
    const formData = await request.formData();
    const chatId = formData.get('chat_id') || process.env.ADMIN_TELEGRAM_ID || '1203246492';
    const caption = formData.get('caption') || '';
    const document = formData.get('document');

    if (!document) {
      return NextResponse.json({ error: 'Document file is required.' }, { status: 400 });
    }

    // 3. Forward to Telegram sendDocument API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
    
    const tgFormData = new FormData();
    tgFormData.append('chat_id', String(chatId));
    tgFormData.append('caption', String(caption));
    tgFormData.append('document', document as Blob, 'Laporan_NIK_Pertamina.xlsx');

    const tgResponse = await fetch(telegramUrl, {
      method: 'POST',
      body: tgFormData
    });

    if (!tgResponse.ok) {
      const errorText = await tgResponse.text();
      console.error('[Telegram API sendDocument Error]', errorText);
      return NextResponse.json({ error: 'Gagal mengirim laporan ke Telegram.' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API telegram-notify-report Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal pada server.' }, { status: 500 });
  }
}
