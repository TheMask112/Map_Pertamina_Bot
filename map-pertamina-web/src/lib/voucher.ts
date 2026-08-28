// voucher.ts
// Voucher Code Generator & Unique Amount Generator with Collision Check

import { sql } from './db';

/**
 * Men-generate kode voucher 8 karakter alfanumerik.
 * Menghindari karakter ambigu seperti 'I', 'O', '0', '1' untuk mencegah salah ketik oleh pengguna.
 */
import crypto from 'crypto';

export function generateVoucherCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MAP'; // Prefix MAP untuk branding
  for (let i = 0; i < 9; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars.charAt(randomIndex);
  }
  return code; // Hasilnya: MAPXXXXXXXXX (total 12 karakter)
}

/**
 * Men-generate nominal unik dengan menambahkan angka acak (1-999) ke harga dasar.
 * Melakukan pengecekan tabrakan (collision) di database untuk order berstatus PENDING.
 * @param baseAmount Harga dasar paket (misal: 75000)
 */
export async function generateUniqueAmount(baseAmount: number): Promise<number> {
  const maxRetries = 15;
  
  for (let retry = 0; retry < maxRetries; retry++) {
    // Generate nominal acak antara 1 s.d. 999
    const randomOffset = Math.floor(Math.random() * 999) + 1;
    const uniqueAmount = baseAmount + randomOffset;

    // Kueri database untuk melihat apakah nominal unik ini sedang digunakan oleh order PENDING lain
    const result = await sql`
      SELECT id FROM orders 
      WHERE amount = ${uniqueAmount} AND status = 'PENDING'
      LIMIT 1
    `;

    // Jika tidak ada tabrakan nominal, kembalikan nominal unik ini
    if (result.length === 0) {
      return uniqueAmount;
    }
  }

  throw new Error('Sistem sedang sibuk. Gagal men-generate nominal pembayaran yang unik.');
}
