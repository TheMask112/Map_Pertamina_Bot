// route.ts (api/orders)
// API Endpoint to Create a New License Order (Integrated with Midtrans QRIS)

import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CONFIG } from '@/lib/config';
import { sendTelegramToAdmin } from '@/lib/notify';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    // hwid opsional (dikirim dari Android/Desktop untuk aktivasi otomatis)
    const { paket, whatsapp, hwid } = body;

    // 1. Validasi input parameter
    if (!paket || !whatsapp) {
      return NextResponse.json(
        { error: 'Parameter "paket" dan "whatsapp" wajib diisi.' },
        { status: 400 }
      );
    }

    const paketKey = paket.toUpperCase();
    const paketDetail = CONFIG.pakets[paketKey];

    // 2. Validasi ketersediaan paket
    if (!paketDetail) {
      return NextResponse.json(
        { error: 'Paket yang Anda pilih tidak valid.' },
        { status: 400 }
      );
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey || serverKey.includes("your_midtrans_server_key")) {
      console.error('[API Create Order] Midtrans Server Key is missing or default placeholder.');
      return NextResponse.json(
        { error: 'Sistem pembayaran Midtrans belum dikonfigurasi secara lengkap.' },
        { status: 500 }
      );
    }

    // 3. Hitung waktu kadaluwarsa (15 menit dari sekarang)
    const expiresAt = new Date(Date.now() + CONFIG.orderTimeoutMs);

    // 4. Simpan data order awal ke database PostgreSQL (Neon)
    // hwid disimpan jika dikirim dari Android/Desktop untuk aktivasi otomatis pasca bayar
    const cleanHwid = hwid ? String(hwid).replace(/-/g, '').toUpperCase() : null;
    const result = await sql`
      INSERT INTO orders (paket, base_amount, amount, whatsapp, hwid, status, expires_at)
      VALUES (${paketKey}, ${paketDetail.harga}, ${paketDetail.harga}, ${whatsapp}, ${cleanHwid}, 'PENDING', ${expiresAt})
      RETURNING id, expires_at
    `;

    const newOrder = result[0];
    const orderId = newOrder.id;

    // 5. Panggil API Midtrans Snap untuk memunculkan semua metode pembayaran
    const authHeader = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;
    
    // Deteksi domain saat ini secara dinamis untuk webhook dan callback redirect
    const host = request.headers.get('host') || 'map-pertamina-web.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const currentDomain = `${protocol}://${host}`;
    
    console.log(`[API Create Order] Requesting Midtrans Snap Token for Order: ${orderId}, Domain: ${currentDomain}`);
    
    const midtransRes = await fetch(`${CONFIG.midtrans.snapUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: paketDetail.harga
        },
        customer_details: {
          phone: whatsapp
        },
        notification_url: `${currentDomain}/api/webhook/midtrans`,
        callbacks: {
          finish: `${currentDomain}/payment/success`,
          error: `${currentDomain}/payment/failed`,
          unfinish: `${currentDomain}/payment/failed`
        }
      })
    });

    const midtransData = await midtransRes.json();

    // Check both HTTP status and Midtrans-specific status_code inside the body (if any)
    const isMidtransSuccess = midtransRes.ok && 
      (!midtransData.status_code || midtransData.status_code === '200' || midtransData.status_code === '201');

    if (!isMidtransSuccess) {
      console.error('[API Create Order] Midtrans Snap API Failed:', midtransData);
      
      // Hapus data order yang gagal dari database agar tidak menjadi sampah
      await sql`DELETE FROM orders WHERE id = ${orderId}`;
      
      const errorMsg = midtransData.error_messages?.[0] || midtransData.status_message || 'Unknown error';
      return NextResponse.json(
        { error: `Gagal membuat transaksi pembayaran ke Midtrans: ${errorMsg}` },
        { status: 502 }
      );
    }

    // Ekstrak Snap Token
    const snapToken = midtransData.token;
    if (!snapToken) {
      console.error('[API Create Order] snapToken not found in Midtrans response:', midtransData);
      
      await sql`DELETE FROM orders WHERE id = ${orderId}`;
      
      return NextResponse.json(
        { error: 'Gagal mendapatkan token pembayaran dari Midtrans.' },
        { status: 502 }
      );
    }

    // Ambil redirect_url juga (untuk Android Chrome Custom Tabs)
    const redirectUrl = midtransData.redirect_url || '';

    // Kirim notifikasi pesanan baru ke Admin Telegram (Non-blocking)
    try {
      const newOrderMsg = 
        `🛒 *PESANAN BARU DIBUAT (MENUNGGU PEMBAYARAN)* 🛒\n\n` +
        `📦 Paket: *${paketDetail.nama}* (${paketDetail.kuota.toLocaleString('id-ID')} Tabung)\n` +
        `💵 Nominal: *Rp ${paketDetail.harga.toLocaleString('id-ID')}*\n` +
        `📱 WhatsApp: *${whatsapp}*\n` +
        `🆔 Order ID: \`${orderId}\`\n` +
        (cleanHwid ? `💻 HWID: \`${cleanHwid}\`\n` : '') +
        `⏳ Kadaluwarsa: *15 Menit*`;
      sendTelegramToAdmin(newOrderMsg).catch(err => console.warn('[Telegram New Order] Error:', err));
    } catch (e) {
      console.warn('[Telegram New Order] Failed:', e);
    }

    return NextResponse.json({
      orderId: orderId,
      paket: paketKey,
      baseAmount: paketDetail.harga,
      amount: paketDetail.harga,
      snapToken: snapToken,
      redirectUrl: redirectUrl,
      expiresAt: newOrder.expires_at,
      clientKey: CONFIG.midtrans.clientKey,
      // Android/Desktop akan polling status order ini untuk mendapat licenseKey
      statusUrl: `/api/orders/${orderId}/status`
    }, { status: 201 });

  } catch (error: any) {
    console.error('[API Create Order] Unexpected Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal pada server.' },
      { status: 500 }
    );
  }
}

