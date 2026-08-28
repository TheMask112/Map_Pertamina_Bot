import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CONFIG } from '@/lib/config';
import crypto from 'crypto';

const PRIVATE_KEY_PEM = process.env.RSA_PRIVATE_KEY as string;

const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID || 1203246492);
const DEFAULT_LIFETIME_DAYS = 36500;

function generateLicenseKey(hwid: string, paket: string, hari: number, kuota: number): string {
  if (!PRIVATE_KEY_PEM) {
    throw new Error('RSA_PRIVATE_KEY environment variable is not defined!');
  }
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + hari);
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  // Format as YYYY-MM-DDTHH:mm:ss.SSSSSS to match Python's isoformat()
  const expiry = `${expiryDate.getFullYear()}-${pad(expiryDate.getMonth() + 1)}-${pad(expiryDate.getDate())}T${pad(expiryDate.getHours())}:${pad(expiryDate.getMinutes())}:${pad(expiryDate.getSeconds())}.${pad(expiryDate.getMilliseconds(), 3)}000`;

  const payload = {
    hwid: hwid,
    paket: paket.toUpperCase(),
    expiry: expiry,
    kuota_total: kuota
  };

  const jsonStr = JSON.stringify(payload);
  const jsonBytes = Buffer.from(jsonStr);
  const jsonB64 = jsonBytes.toString('base64url');

  const sign = crypto.createSign('SHA256');
  sign.update(jsonBytes);
  sign.end();

  const signature = sign.sign({
    key: PRIVATE_KEY_PEM,
    padding: crypto.constants.RSA_PKCS1_PADDING
  });

  const sigB64 = signature.toString('base64url');
  return `${jsonB64}.${sigB64}`;
}

async function sendMessage(chatId: number, text: string, replyToMessageId?: number) {
  const token = process.env.TELEGRAM_KEYGEN_BOT_TOKEN || '';
  if (!token) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        reply_to_message_id: replyToMessageId
      })
    });
    if (!res.ok) {
      console.error('[Keygen Bot] Failed to send message:', await res.text());
    }
  } catch (err) {
    console.error('[Keygen Bot] Send message network error:', err);
  }
}

export async function POST(request: Request) {
  try {
    // Verifikasi header X-Telegram-Bot-Api-Secret-Token untuk keamanan
    const secretToken = request.headers.get('x-telegram-bot-api-secret-token');
    const systemSecretToken = process.env.TELEGRAM_BOT_SECRET_TOKEN;
    if (systemSecretToken && secretToken !== systemSecretToken) {
      console.warn('[Keygen Webhook] Unauthorized access attempt: Secret token mismatch.');
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (!body.message) {
      return NextResponse.json({ status: 'ignored' });
    }

    const { message } = body;
    const chatId = message.chat.id;
    const userId = message.from?.id;
    const text = (message.text || '').trim();
    const messageId = message.message_id;

    const isAdmin = userId === ADMIN_TELEGRAM_ID;

    // 1. Handle commands /start /help
    if (text.startsWith('/start') || text.startsWith('/help')) {
      if (isAdmin) {
        const menuText = 
          "🤖 *Generator Lisensi Bot MAP Pertamina v4 (ADMIN)* 🤖\n\n" +
          "Gunakan perintah berikut untuk membuat lisensi secara instan:\n\n" +
          "👉 `/keygen [HWID] [KUOTA]`\n" +
          "_(Membuat lisensi kuota kustom dengan durasi Lifetime)_\n\n" +
          "👉 `/keygen_custom [HWID] [HARI] [KUOTA]`\n" +
          "_(Membuat lisensi kustom penuh dengan batasan hari & kuota)_\n\n" +
          "📌 *Contoh Penggunaan*:\n" +
          "`/keygen 3602123456789012 3000`\n" +
          "_(Membuat lisensi 3000 kuota tabung untuk HWID tersebut)_";
        await sendMessage(chatId, menuText, messageId);
      } else {
        const menuText = 
          "🤖 *Portal Aktivasi Lisensi Bot MAP Pertamina* 🤖\n\n" +
          "Selamat datang! Bot ini melayani aktivasi lisensi otomatis.\n" +
          "Gunakan perintah di bawah ini untuk me-redeem voucher Anda:\n\n" +
          "👉 `/redeem [KODE_VOUCHER]`\n" +
          "_(Aktivasi lisensi dari pembelian website penjualan)_\n\n" +
          "📌 *Contoh Penggunaan*:\n" +
          "`/redeem MAP7A3BX`\n" +
          "_(Sistem akan menanyakan Hardware ID PC Anda setelahnya)_";
        await sendMessage(chatId, menuText, messageId);
      }
      return NextResponse.json({ status: 'ok' });
    }

    // 2. Handle /keygen [HWID] [KUOTA] (ADMIN)
    if (text.startsWith('/keygen ')) {
      if (!isAdmin) {
        await sendMessage(chatId, "❌ Perintah ini khusus untuk Administrator.", messageId);
        return NextResponse.json({ status: 'ok' });
      }

      const args = text.split(/\s+/);
      if (args.length < 3) {
        await sendMessage(chatId, "⚠️ Format salah! Gunakan: `/keygen [HWID] [KUOTA]`", messageId);
        return NextResponse.json({ status: 'ok' });
      }

      const hwid = args[1].trim().replace(/-/g, '').toUpperCase();
      const kuota = parseInt(args[2].trim(), 10);

      if (isNaN(kuota)) {
        await sendMessage(chatId, "⚠️ Kuota harus berupa angka.", messageId);
        return NextResponse.json({ status: 'ok' });
      }

      try {
        const key = generateLicenseKey(hwid, 'CUSTOM', DEFAULT_LIFETIME_DAYS, kuota);

        // Simpan ke database orders
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + DEFAULT_LIFETIME_DAYS);
        await sql`
          INSERT INTO orders (
            paket, base_amount, amount, whatsapp, status, 
            expires_at, kuota_terpakai, hwid, license_key, paid_at, redeemed_at
          ) VALUES (
            'CUSTOM', 0, 0, ${'tg_' + chatId}, 'REDEEMED',
            ${expiryDate}, 0, ${hwid}, ${key}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `;

        const resText = 
          "✅ *Lisensi Berhasil Dibuat!* (Lifetime)\n\n" +
          `👤 *HWID Klien*: \`${hwid}\`\n` +
          `📦 *Kuota*: \`${kuota.toLocaleString()} Tabung\`\n` +
          "⏳ *Masa Aktif*: `Tanpa Batas (Lifetime)`\n\n" +
          "🔑 *LICENSE KEY* (Klik untuk salin):\n" +
          `\`${key}\``;
        await sendMessage(chatId, resText, messageId);
      } catch (err: any) {
        await sendMessage(chatId, `❌ Gagal membuat lisensi: ${err.message}`, messageId);
      }
      return NextResponse.json({ status: 'ok' });
    }

    // 3. Handle /keygen_custom [HWID] [HARI] [KUOTA] (ADMIN)
    if (text.startsWith('/keygen_custom ')) {
      if (!isAdmin) {
        await sendMessage(chatId, "❌ Perintah ini khusus untuk Administrator.", messageId);
        return NextResponse.json({ status: 'ok' });
      }

      const args = text.split(/\s+/);
      if (args.length < 4) {
        await sendMessage(chatId, "⚠️ Format salah! Gunakan: `/keygen_custom [HWID] [HARI] [KUOTA]`", messageId);
        return NextResponse.json({ status: 'ok' });
      }

      const hwid = args[1].trim().replace(/-/g, '').toUpperCase();
      const hari = parseInt(args[2].trim(), 10);
      const kuota = parseInt(args[3].trim(), 10);

      if (isNaN(hari) || isNaN(kuota)) {
        await sendMessage(chatId, "⚠️ Hari dan Kuota harus berupa angka.", messageId);
        return NextResponse.json({ status: 'ok' });
      }

      try {
        const key = generateLicenseKey(hwid, 'CUSTOM', hari, kuota);

        // Simpan ke database orders
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + hari);
        await sql`
          INSERT INTO orders (
            paket, base_amount, amount, whatsapp, status, 
            expires_at, kuota_terpakai, hwid, license_key, paid_at, redeemed_at
          ) VALUES (
            'CUSTOM', 0, 0, ${'tg_' + chatId}, 'REDEEMED',
            ${expiryDate}, 0, ${hwid}, ${key}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `;

        const resText = 
          "✅ *Lisensi Kustom Berhasil Dibuat!*\n\n" +
          `👤 *HWID Klien*: \`${hwid}\`\n` +
          `📦 *Kuota*: \`${kuota.toLocaleString()} Tabung\`\n` +
          `⏳ *Masa Aktif*: \`${hari} Hari\`\n\n` +
          "🔑 *LICENSE KEY* (Klik untuk salin):\n" +
          `\`${key}\``;
        await sendMessage(chatId, resText, messageId);
      } catch (err: any) {
        await sendMessage(chatId, `❌ Gagal membuat lisensi: ${err.message}`, messageId);
      }
      return NextResponse.json({ status: 'ok' });
    }

    // 4. Handle /redeem [KODE_VOUCHER] (PUBLIC)
    if (text.startsWith('/redeem ')) {
      const args = text.split(/\s+/);
      if (args.length < 2) {
        await sendMessage(chatId, "⚠️ Format salah!\nGunakan: `/redeem [KODE_VOUCHER]`\n\nContoh: `/redeem MAP7A3BX`", messageId);
        return NextResponse.json({ status: 'ok' });
      }

      const voucher = args[1].trim().toUpperCase();

      // Simpan status percakapan ke PostgreSQL
      await sql`
        INSERT INTO keygen_states (chat_id, step, voucher)
        VALUES (${chatId}, 'awaiting_hwid', ${voucher})
        ON CONFLICT (chat_id) 
        DO UPDATE SET step = 'awaiting_hwid', voucher = ${voucher}
      `;

      const instructionText = 
        "🔍 *KODE VOUCHER DITERIMA*\n\n" +
        "Silakan kirimkan *Hardware ID (HWID)* komputer Anda sekarang.\n\n" +
        "💡 *Cara menemukan HWID PC Anda*:\n" +
        "1. Jalankan software *Bot MAP Pertamina* di PC Anda.\n" +
        "2. Lihat kolom *Hardware ID* di bagian atas atau layar lisensi.\n" +
        "3. Salin kode tersebut dan tempel (paste) ke bot ini.\n\n" +
        "👉 Kirimkan kode HWID Anda:";
      await sendMessage(chatId, instructionText, messageId);
      return NextResponse.json({ status: 'ok' });
    }

    // 5. Handle capture HWID state
    const states = await sql`
      SELECT step, voucher FROM keygen_states WHERE chat_id = ${chatId} LIMIT 1
    `;

    if (states.length > 0 && states[0].step === 'awaiting_hwid') {
      const voucher = states[0].voucher;
      const hwid = text.replace(/-/g, '').toUpperCase();

      // Hapus state agar tidak tersangkut
      await sql`
        DELETE FROM keygen_states WHERE chat_id = ${chatId}
      `;

      await sendMessage(chatId, "⏳ *Sedang memverifikasi voucher di server...* Mohon tunggu sebentar.", messageId);

      try {
        // Panggil logikanya secara internal langsung di DB
        const result = await sql`
          SELECT id, paket, status, redeemed_at 
          FROM orders 
          WHERE voucher_code = ${voucher} 
          LIMIT 1
        `;

        if (result.length === 0) {
          await sendMessage(chatId, "❌ *Verifikasi Gagal!*\n\nDetail: *Kode voucher tidak valid.*\n\nSilakan jalankan ulang perintah `/redeem [KODE_VOUCHER]` untuk mencoba kembali.", messageId);
          return NextResponse.json({ status: 'ok' });
        }

        const order = result[0];

        if (order.status === 'REDEEMED') {
          await sendMessage(chatId, "❌ *Verifikasi Gagal!*\n\nDetail: *Kode voucher ini sudah pernah digunakan (diredeem).*\n\nSilakan jalankan ulang perintah `/redeem [KODE_VOUCHER]` untuk mencoba kembali.", messageId);
          return NextResponse.json({ status: 'ok' });
        }

        if (order.status !== 'PAID') {
          await sendMessage(chatId, "❌ *Verifikasi Gagal!*\n\nDetail: *Voucher belum aktif karena pembayaran belum terverifikasi.*\n\nSilakan jalankan ulang perintah `/redeem [KODE_VOUCHER]` untuk mencoba kembali.", messageId);
          return NextResponse.json({ status: 'ok' });
        }

        // Update status order menjadi REDEEMED
        const updateResult = await sql`
          UPDATE orders 
          SET status = 'REDEEMED', 
              redeemed_at = CURRENT_TIMESTAMP
          WHERE id = ${order.id} AND status = 'PAID'
          RETURNING paket
        `;

        if (updateResult.length === 0) {
          await sendMessage(chatId, "❌ *Verifikasi Gagal!*\n\nDetail: *Gagal merubah status voucher. Voucher mungkin sudah diredeem.*\n\nSilakan jalankan ulang perintah `/redeem [KODE_VOUCHER]` untuk mencoba kembali.", messageId);
          return NextResponse.json({ status: 'ok' });
        }

        const redeemedOrder = updateResult[0];
        const paketDetail = CONFIG.pakets[redeemedOrder.paket];

        if (!paketDetail) {
          await sendMessage(chatId, "❌ *Verifikasi Gagal!*\n\nDetail: *Detil paket tidak terkonfigurasi pada sistem.*\n\nSilakan hubungi Admin.", messageId);
          return NextResponse.json({ status: 'ok' });
        }

        // Generate license key
        const licenseKey = generateLicenseKey(hwid, redeemedOrder.paket, paketDetail.hari, paketDetail.kuota);

        // Simpan license_key dan hwid ke database orders
        await sql`
          UPDATE orders
          SET license_key = ${licenseKey},
              hwid = ${hwid}
          WHERE id = ${order.id}
        `;

        const successText = 
          "🚀 *LISENSI RESMI BERHASIL DIAKTIFKAN!* 🚀\n\n" +
          `📦 Paket: *${redeemedOrder.paket}*\n` +
          `📊 Kuota: *${paketDetail.kuota.toLocaleString()} Tabung NIK*\n` +
          "⏳ Masa Aktif: *Tanpa Batas (Lifetime)*\n" +
          `👤 HWID Terdaftar: \`${hwid}\`\n\n` +
          "🔑 *LICENSE KEY* (Ketuk di bawah untuk menyalin):\n" +
          `\`${licenseKey}\`\n\n` +
          "📌 *Petunjuk*: Salin License Key di atas, tempelkan ke kolom Lisensi di software Bot MAP Pertamina Anda, lalu klik *Aktivasi*.";

        await sendMessage(chatId, successText, messageId);

      } catch (err: any) {
        console.error('[Keygen Bot Redeem Error]', err);
        await sendMessage(chatId, `❌ *Terjadi Kesalahan Sistem!*\n\nDetail: ${err.message}\nSilakan hubungi Admin jika kendala berlanjut.`, messageId);
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('[Keygen Webhook Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
