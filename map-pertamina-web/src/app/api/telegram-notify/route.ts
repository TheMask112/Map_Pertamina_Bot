import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is not defined!');
}

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('[Telegram API Notify Error]', errText);
  }
}

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
      console.warn('[Telegram Notify] Invalid or inactive license key:', licenseKey);
      return NextResponse.json({ error: 'Lisensi tidak valid atau tidak aktif.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { whatsapp, status, message, sukses, sisa } = body;

    if (!whatsapp || !status) {
      return NextResponse.json({ error: 'Parameter whatsapp dan status wajib.' }, { status: 400 });
    }

    // Cari chat_id yang terdaftar untuk nomor whatsapp ini
    const links = await sql`
      SELECT chat_id FROM telegram_links WHERE whatsapp = ${whatsapp}
    `;

    if (links.length === 0) {
      // Tidak ada akun Telegram yang terhubung, abaikan
      return NextResponse.json({ status: 'ignored', reason: 'No linked telegram accounts' });
    }

    // Susun template pesan
    let title = '⛽ *Info Pangkalan*';
    if (status === 'SUKSES') {
      title = '✅ *Laporan Transaksi Sukses*';
    } else if (status === 'PAUSE' || status === 'DILEWATI') {
      title = '⏸ *Bot Paused / Butuh Tindakan*';
    } else if (status === 'ERROR SYSTEM' || status === 'GAGAL CAPTCHA') {
      title = '🚨 *Alarm! Bot Mengalami Kendala*';
    }

    const reportText = `${title}\n\n` +
      `*Pangkalan:* ${whatsapp}\n` +
      `*Status:* ${status}\n` +
      `*Keterangan:* ${message || '-'}\n` +
      `*Progres:* Sukses *${sukses || 0}* | Sisa *${sisa || 0}* data`;

    // Buat inline keyboard jika butuh action resume (PAUSE / ERROR)
    let replyMarkup = undefined;
    if (status !== 'SUKSES') {
      replyMarkup = {
        inline_keyboard: [
          [
            {
              text: '▶ Lanjutkan Transaksi (Resume)',
              callback_data: `resume:${whatsapp}`,
            },
          ],
        ],
      };
    }

    // Kirim pesan ke semua chat_id yang terdaftar
    const sendPromises = links.map((link: any) =>
      sendTelegramMessage(link.chat_id, reportText, replyMarkup)
    );
    await Promise.all(sendPromises);

    return NextResponse.json({ status: 'ok', sent_to: links.length });
  } catch (error) {
    console.error('[API telegram-notify Error]', error);
    return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
  }
}
