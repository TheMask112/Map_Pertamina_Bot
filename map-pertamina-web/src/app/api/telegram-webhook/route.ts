import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) return;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch((err) => console.error('[Telegram API Error]', err));
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text,
    }),
  }).catch((err) => console.error('[Telegram API Error]', err));
}

export async function POST(request: Request) {
  try {
    const update = await request.json().catch(() => ({}));
    
    // 1. Handle Callback Query (tombol inline diklik)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const callbackData = callbackQuery.data || '';
      const chatId = callbackQuery.message.chat.id;
      
      if (callbackData.startsWith('resume:')) {
        const whatsapp = callbackData.split(':')[1];
        
        // Simpan perintah resume ke database
        await sql`
          INSERT INTO telegram_commands (whatsapp, command, updated_at)
          VALUES (${whatsapp}, 'resume', CURRENT_TIMESTAMP)
          ON CONFLICT (whatsapp) DO UPDATE
          SET command = 'resume', updated_at = CURRENT_TIMESTAMP
        `;
        
        await answerCallbackQuery(callbackQuery.id, 'Perintah lanjutkan berhasil dikirim!');
        await sendTelegramMessage(chatId, `▶ Perintah *LANJUTKAN* telah dikirim ke bot desktop (${whatsapp}). Bot akan segera memproses kembali.`);
      }
      return NextResponse.json({ status: 'ok' });
    }

    // 2. Handle standard message
    if (update.message && update.message.text) {
      const chatId = update.message.chat.id;
      const text = update.message.text.trim();

      if (text === '/start' || text === '/help') {
        const welcomeText = `Selamat datang di *Bot Monitor MAP Pertamina*! ⛽\n\n` +
          `Silakan ketik nomor HP/WhatsApp yang terdaftar pada aplikasi pangkalan Anda (format: *08xxxxxxxx* atau *628xxxxxxx*) untuk mulai menghubungkan notifikasi pangkalan Anda secara privat.`;
        await sendTelegramMessage(chatId, welcomeText);
        return NextResponse.json({ status: 'ok' });
      }

      // Regex deteksi nomor HP Indonesia
      const hpRegex = /^(08|628)\d{8,12}$/;
      if (hpRegex.test(text)) {
        let whatsapp = text;
        if (whatsapp.startsWith('08')) {
          whatsapp = '628' + whatsapp.substring(2);
        }

        // Simpan hubungan chat_id dan whatsapp
        await sql`
          INSERT INTO telegram_links (chat_id, whatsapp)
          VALUES (${chatId}, ${whatsapp})
          ON CONFLICT (chat_id, whatsapp) DO NOTHING
        `;

        const successText = `✅ *Pendaftaran Berhasil!*\n\n` +
          `Akun Telegram Anda sekarang terhubung dengan WhatsApp pangkalan: *${whatsapp}*.\n` +
          `Anda akan menerima laporan otomatis, alarm saat bot terhenti, serta tombol kendali jarak jauh.`;
        await sendTelegramMessage(chatId, successText);
      } else {
        await sendTelegramMessage(chatId, `⚠ Format nomor HP tidak valid. Masukkan nomor dengan format *08xxxxxxxx* atau *628xxxxxxx* (hanya angka).`);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('[Telegram Webhook Error]', error);
    return NextResponse.json({ status: 'error', message: error.message, stack: error.stack }, { status: 500 });
  }
}
