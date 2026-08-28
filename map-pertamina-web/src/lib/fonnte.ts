// fonnte.ts
// WhatsApp Notification Integration using Fonnte API (Free Tier)

/**
 * Mengirim pesan WhatsApp melalui Fonnte API Gateway.
 * Otomatis memformat nomor HP Indonesia (08xxx -> 628xxx).
 * @param phone Nomor telepon tujuan
 * @param message Isi pesan teks
 */
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    console.warn('[Fonnte] Warning: FONNTE_TOKEN tidak diatur. Notifikasi WhatsApp diabaikan.');
    return false;
  }

  // Sanitasi nomor telepon: hapus spasi, tanda minus, plus
  let sanitizedPhone = phone.trim().replace(/[-+\s]/g, '');
  
  // Ubah awalan 08xxx menjadi format internasional 628xxx
  if (sanitizedPhone.startsWith('08')) {
    sanitizedPhone = '628' + sanitizedPhone.slice(2);
  }

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: sanitizedPhone,
        message: message,
        // Optional: delay agar terkesan natural
        delay: '2'
      })
    });

    const data = await response.json();
    
    if (response.ok && data.status === true) {
      console.log(`[Fonnte] Sukses mengirim WhatsApp ke ${sanitizedPhone}`);
      return true;
    } else {
      console.error('[Fonnte] Gagal mengirim pesan:', data);
      return false;
    }
  } catch (error) {
    console.error('[Fonnte] Terjadi error saat memanggil API:', error);
    return false;
  }
}

/**
 * Template notifikasi pembelian voucher lisensi.
 */
export function getVoucherMessageTemplate(paketNama: string, kuota: number, nominal: number, voucherCode: string): string {
  return (
    `*🎉 PEMBAYARAN SUKSES - BOT MAP PERTAMINA* 🎉\n\n` +
    `Terima kasih! Pembayaran Anda sebesar *Rp ${nominal.toLocaleString('id-ID')}* telah terverifikasi secara otomatis oleh sistem.\n\n` +
    `*Detail Pembelian*:\n` +
    `📦 Paket: *${paketNama}*\n` +
    `📊 Kuota: *${kuota.toLocaleString('id-ID')} Tabung NIK*\n` +
    `⏳ Durasi: *Lifetime (Selamanya)*\n\n` +
    `🔑 *KODE VOUCHER ANDA*:\n` +
    `👉 \`${voucherCode}\` 👈 (Tekan untuk salin)\n\n` +
    `*Cara Aktivasi (Redeem)*:\n` +
    `1. Buka Telegram dan hubungi Bot keygen resmi di https://t.me/M4PGenerator_bot\n` +
    `2. Ketik perintah: \`/redeem ${voucherCode}\`\n` +
    `3. Bot akan meminta Hardware ID (HWID) komputer Anda.\n` +
    `4. Masukkan HWID Anda, dan Bot akan men-generate *LICENSE KEY* secara instan!\n` +
    `5. Masukkan License Key tersebut ke aplikasi Bot MAP Pertamina Anda.\n\n` +
    `Simpan pesan ini sebagai bukti pembelian sah Anda. Selamat menggunakan! 🤖⚡`
  );
}
