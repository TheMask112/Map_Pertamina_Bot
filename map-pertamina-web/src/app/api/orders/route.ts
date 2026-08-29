// route.ts (api/orders)
// API Endpoint to Create a New License Order (Integrated with Midtrans QRIS)

import { NextResponse } from 'next/server';
import { sql, ensureAffiliateTables } from '@/lib/db';
import { CONFIG } from '@/lib/config';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    // hwid opsional (dikirim dari Android/Desktop untuk aktivasi otomatis)
    // affiliateCode opsional (dikirim dari URL ref / input referral)
    // customerName, pangkalanName, customerType opsional (untuk database customer follow-up)
    const { paket, whatsapp, hwid, affiliateCode, customerName, pangkalanName, customerType } = body;

    // 1. Validasi input parameter
    if (!paket || !whatsapp) {
      return NextResponse.json(
        { error: 'Parameter "paket" dan "whatsapp" wajib diisi.' },
        { status: 400 }
      );
    }

    await ensureAffiliateTables();

    const paketKey = paket.toUpperCase();
    const paketDetail = CONFIG.pakets[paketKey];

    // 2. Validasi ketersediaan paket
    if (!paketDetail) {
      return NextResponse.json(
        { error: 'Paket yang Anda pilih tidak valid.' },
        { status: 400 }
      );
    }

    // 3. Cek apakah ada kode affiliate valid & hitung harga markup
    let finalPrice = paketDetail.harga;
    let validAffiliateCode: string | null = null;
    let affiliateMarkup = 0;

    if (affiliateCode) {
      try {
        const cleanAffCode = String(affiliateCode).trim().toUpperCase();
        const affRows = await sql`
          SELECT code, markup_percent, status
          FROM affiliates
          WHERE UPPER(code) = ${cleanAffCode} AND status = 'ACTIVE'
          LIMIT 1
        `;
        if (affRows.length > 0) {
          validAffiliateCode = affRows[0].code;
          const markupPercent = Math.min(Math.max(affRows[0].markup_percent || 0, 0), 50);
          finalPrice = Math.round(paketDetail.harga * (1 + markupPercent / 100));
          affiliateMarkup = finalPrice - paketDetail.harga;
          console.log(`[API Create Order] Applied affiliate "${validAffiliateCode}" (+${markupPercent}%): Base ${paketDetail.harga} -> Final ${finalPrice}`);
        }
      } catch (e) {
        console.warn('[API Create Order] Error checking affiliate code:', e);
      }
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey || serverKey.includes("your_midtrans_server_key")) {
      console.error('[API Create Order] Midtrans Server Key is missing or default placeholder.');
      return NextResponse.json(
        { error: 'Sistem pembayaran Midtrans belum dikonfigurasi secara lengkap.' },
        { status: 500 }
      );
    }

    // 4. Hitung waktu kadaluwarsa (15 menit dari sekarang)
    const expiresAt = new Date(Date.now() + CONFIG.orderTimeoutMs);

    // 5. Simpan data order awal ke database PostgreSQL (Neon)
    const cleanHwid = hwid ? String(hwid).replace(/-/g, '').toUpperCase() : null;
    const cleanCustomerName = customerName ? String(customerName).trim().slice(0, 100) : null;
    const cleanPangkalanName = pangkalanName ? String(pangkalanName).trim().slice(0, 150) : null;
    const cleanCustomerType = customerType ? String(customerType).trim().slice(0, 50) : null;

    const result = await sql`
      INSERT INTO orders (
        paket, base_amount, amount, whatsapp, hwid, status, expires_at,
        affiliate_code, affiliate_markup,
        customer_name, pangkalan_name, customer_type
      )
      VALUES (
        ${paketKey}, ${paketDetail.harga}, ${finalPrice}, ${whatsapp}, ${cleanHwid}, 'PENDING', ${expiresAt},
        ${validAffiliateCode}, ${affiliateMarkup},
        ${cleanCustomerName}, ${cleanPangkalanName}, ${cleanCustomerType}
      )
      RETURNING id, expires_at
    `;

    const newOrder = result[0];
    const orderId = newOrder.id;

    // 6. Panggil API Midtrans Snap untuk memunculkan semua metode pembayaran
    const authHeader = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;
    
    // Deteksi domain saat ini secara dinamis untuk webhook dan callback redirect
    const host = request.headers.get('host') || 'map-pertamina-web.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const currentDomain = `${protocol}://${host}`;
    
    console.log(`[API Create Order] Requesting Midtrans Snap Token for Order: ${orderId}, Amount: ${finalPrice}, Domain: ${currentDomain}`);
    
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
          gross_amount: finalPrice
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

