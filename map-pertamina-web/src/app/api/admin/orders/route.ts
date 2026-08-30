import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateVoucherCode } from '@/lib/voucher';
import { generateLicenseKey, LicenseFeatures } from '@/lib/keygen';
import { CONFIG } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    // Validasi passcode admin dari env variable (Strict passcode check)
    const adminPasscode = process.env.ADMIN_PASSCODE;
    if (!adminPasscode || authHeader !== adminPasscode) {
      console.warn('[Admin API] Unauthorized GET request attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-expire old pending orders
    try {
      await sql`
        UPDATE orders 
        SET status = 'EXPIRED' 
        WHERE status = 'PENDING' AND expires_at < NOW();
      `;
    } catch (e) {
      console.warn('Auto-expire failed (non-critical):', e);
    }

    // Ambil data semua order dengan kolom lengkap dari database Neon
    let orders: any[] = [];
    try {
      orders = await sql`
        SELECT 
          id, 
          paket, 
          base_amount, 
          amount, 
          whatsapp, 
          status, 
          voucher_code, 
          created_at, 
          paid_at, 
          redeemed_at, 
          expires_at, 
          COALESCE(kuota_terpakai, 0) AS kuota_terpakai, 
          hwid, 
          license_key
        FROM orders 
        ORDER BY created_at DESC;
      `;
    } catch (err: any) {
      // Fallback jika ada kolom yang belum termigrasi
      orders = await sql`
        SELECT id, paket, base_amount, amount, whatsapp, status, voucher_code, created_at, expires_at 
        FROM orders 
        ORDER BY created_at DESC;
      `;
    }

    // Ambil data link Telegram jika tabel ada
    let telegramLinks: any[] = [];
    try {
      telegramLinks = await sql`
        SELECT chat_id, whatsapp, created_at 
        FROM telegram_links 
        ORDER BY created_at DESC;
      `;
    } catch (e) {
      // Telegram links optional
    }

    // Ambil data profil pangkalan
    let pangkalanProfiles: any[] = [];
    try {
      pangkalanProfiles = await sql`
        SELECT id, whatsapp, nama_pangkalan, nama_pemilik, kota, provinsi,
               alokasi_bulanan, jumlah_pelanggan, platform, app_version,
               last_active_at, total_sesi, total_nik_sukses, total_nik_gagal,
               created_at
        FROM pangkalan_profiles
        ORDER BY last_active_at DESC;
      `;
    } catch (e) {
      // pangkalan_profiles optional (belum dimigrasi)
    }

    // Ambil data sesi bot (50 sesi terakhir)
    let botSessions: any[] = [];
    try {
      botSessions = await sql`
        SELECT id, whatsapp, hwid, platform, started_at, ended_at,
               duration_seconds, total_nik, nik_sukses, nik_gagal,
               nik_tidak_terdaftar, nik_kuota_habis, nik_meninggal,
               nik_dibawah_umur, nik_tidak_aktif, captcha_total,
               captcha_sukses, jumlah_tabung, avg_seconds_per_nik,
               batch_number, app_version, nama_pangkalan, created_at
        FROM bot_sessions
        ORDER BY ended_at DESC
        LIMIT 200;
      `;
    } catch (e) {
      // bot_sessions optional (belum dimigrasi)
    }

    return NextResponse.json({ 
      orders, 
      telegramLinks,
      pangkalanProfiles,
      botSessions,
      paketsConfig: CONFIG.pakets 
    });
  } catch (error: any) {
    console.error('Error fetching admin orders:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem internal.' }, { status: 500 });
  }
}

// Endpoint untuk berbagai aksi manajemen admin
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    const adminPasscode = process.env.ADMIN_PASSCODE;
    if (!adminPasscode || authHeader !== adminPasscode) {
      console.warn('[Admin API] Unauthorized POST request attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // 1. Aksi Cabut Lisensi (REVOKE)
    if (action === 'revoke') {
      const { orderId } = body;
      if (!orderId) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      
      await sql`
        UPDATE orders 
        SET status = 'REVOKED', voucher_code = NULL, license_key = NULL 
        WHERE id = ${orderId};
      `;
      return NextResponse.json({ success: true, message: 'Lisensi berhasil dicabut.' });
    }

    // 2. Aksi Reset HWID (Ganti Mesin/PC)
    if (action === 'reset_hwid') {
      const { orderId } = body;
      if (!orderId) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });

      // Reset HWID dan kembalikan status ke PAID dengan voucher tetap ada, agar pangkalan bisa aktivasi ulang di PC baru
      await sql`
        UPDATE orders 
        SET hwid = NULL, 
            license_key = NULL, 
            status = 'PAID', 
            redeemed_at = NULL 
        WHERE id = ${orderId};
      `;
      return NextResponse.json({ success: true, message: 'HWID berhasil di-reset. Voucher dapat diaktivasi ulang di perangkat baru.' });
    }

    // 3. Aksi Top Up Kuota / Reset Kuota Terpakai
    if (action === 'topup_quota') {
      const { orderId, resetUsage, additionalDays } = body;
      if (!orderId) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });

      if (resetUsage) {
        await sql`
          UPDATE orders 
          SET kuota_terpakai = 0 
          WHERE id = ${orderId};
        `;
      }

      if (additionalDays && Number(additionalDays) > 0) {
        await sql`
          UPDATE orders 
          SET expires_at = expires_at + (${Number(additionalDays)} || ' days')::INTERVAL
          WHERE id = ${orderId};
        `;
      }

      return NextResponse.json({ success: true, message: 'Kuota / Masa aktif berhasil diperbarui.' });
    }

    // 4. Aksi Buat Lisensi Kustom / Enterprise Baru
    if (action === 'create_custom_license') {
      const { 
        whatsapp, 
        paket = 'ENTERPRISE', 
        harga = 0, 
        kuota = 5000, 
        hari = 36500, 
        hwid, 
        features = {} as LicenseFeatures 
      } = body;

      if (!whatsapp) {
        return NextResponse.json({ error: 'Nomor WhatsApp wajib diisi.' }, { status: 400 });
      }

      const voucherCode = generateVoucherCode();
      const expiryDate = new Date(Date.now() + Number(hari) * 24 * 60 * 60 * 1000);
      const cleanHwid = hwid ? String(hwid).replace(/-/g, '').toUpperCase() : null;

      let licenseKey: string | null = null;
      let orderStatus = 'PAID';

      // Jika HWID langsung diisi, generate RSA License Key sekarang juga
      if (cleanHwid) {
        try {
          licenseKey = generateLicenseKey(cleanHwid, paket, Number(hari), Number(kuota), features);
          orderStatus = 'REDEEMED';
        } catch (e: any) {
          console.error('Failed generating license key in custom create:', e);
        }
      }

      const inserted = await sql`
        INSERT INTO orders (
          paket, 
          base_amount, 
          amount, 
          whatsapp, 
          status, 
          voucher_code, 
          created_at, 
          paid_at, 
          expires_at, 
          kuota_terpakai, 
          hwid, 
          license_key, 
          redeemed_at
        ) VALUES (
          ${paket}, 
          ${Number(harga)}, 
          ${Number(harga)}, 
          ${whatsapp}, 
          ${orderStatus}, 
          ${voucherCode}, 
          CURRENT_TIMESTAMP, 
          CURRENT_TIMESTAMP, 
          ${expiryDate.toISOString()}, 
          0, 
          ${cleanHwid}, 
          ${licenseKey}, 
          ${cleanHwid ? new Date().toISOString() : null}
        )
        RETURNING id, voucher_code, status, license_key;
      `;

      return NextResponse.json({
        success: true,
        order: inserted[0],
        voucherCode,
        licenseKey,
        message: 'Lisensi Enterprise / Kustom berhasil dibuat.'
      });
    }

    // 5. Aksi Hapus Order (Delete)
    if (action === 'delete') {
      const { orderId } = body;
      if (!orderId) return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });

      await sql`
        DELETE FROM orders WHERE id = ${orderId};
      `;
      return NextResponse.json({ success: true, message: 'Order berhasil dihapus.' });
    }

    // 6. Aksi Default: Tandai Lunas (PAID) manual
    const { orderId } = body;
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Generate kode voucher lisensi unik
    const voucherCode = generateVoucherCode();

    // Update status order menjadi PAID dan masukkan kode voucher
    const updateResult = await sql`
      UPDATE orders 
      SET status = 'PAID', 
          paid_at = CURRENT_TIMESTAMP,
          voucher_code = ${voucherCode} 
      WHERE id = ${orderId} AND (status = 'PENDING' OR status = 'EXPIRED' OR status = 'REVOKED')
      RETURNING id, paket, whatsapp, amount;
    `;

    if (updateResult.length === 0) {
      return NextResponse.json({ error: 'Order tidak ditemukan atau status tidak dapat diubah.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, voucherCode, message: 'Transaksi berhasil ditandai Lunas.' });
  } catch (error: any) {
    console.error('Error in admin action:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem internal: ' + (error.message || '') }, { status: 500 });
  }
}
