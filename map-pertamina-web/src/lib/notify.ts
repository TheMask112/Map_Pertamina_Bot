// notify.ts
// Multi-channel Notification Service (Telegram Bot & WhatsApp Fonnte)

import { sendWhatsApp } from './fonnte';

export async function sendTelegramToAdmin(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.ADMIN_CHAT_ID;

  if (!token || !adminChatId) {
    console.warn('[Telegram Admin] TELEGRAM_BOT_TOKEN atau TELEGRAM_ADMIN_CHAT_ID belum diatur.');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Telegram Admin Error]', err);
    return false;
  }
}

export async function sendAdminPayoutAlert(payoutData: {
  affiliateName: string;
  affiliateCode: string;
  affiliatePhone: string;
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
}) {
  const textMsg =
    `🔔 *PERMOHONAN PENARIKAN KOMISI AFFILIATE* 🔔\n\n` +
    `👤 Mitra: *${payoutData.affiliateName}* (Kode: \`${payoutData.affiliateCode}\`)\n` +
    `📱 WhatsApp: *${payoutData.affiliatePhone}*\n` +
    `💰 Nominal: *Rp ${payoutData.amount.toLocaleString('id-ID')}*\n\n` +
    `🏦 *Tujuan Transfer:*\n` +
    `• Bank/E-Wallet: *${payoutData.bankName}*\n` +
    `• No. Rekening/No. HP: \`${payoutData.bankAccountNumber}\`\n` +
    `• Atas Nama: *${payoutData.bankAccountName}*\n\n` +
    `👉 Buka Admin Panel untuk periksa & tandai selesai:\n` +
    `https://map-pertamina-web.vercel.app/admin`;

  // 1. Kirim Telegram ke Admin
  try {
    await sendTelegramToAdmin(textMsg);
  } catch (e) {
    console.warn('[Admin Payout Alert] Telegram send failed:', e);
  }

  // 2. Kirim WhatsApp ke Admin (jika ADMIN_PHONE diset)
  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    try {
      await sendWhatsApp(adminPhone, textMsg);
    } catch (e) {
      console.warn('[Admin Payout Alert] WhatsApp send failed:', e);
    }
  }
}
