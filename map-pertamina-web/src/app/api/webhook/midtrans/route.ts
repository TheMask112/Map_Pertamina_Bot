// route.ts (api/webhook/midtrans)
// Webhook for Automatic Payment Detection via Midtrans Notifications

import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { sql } from '@/lib/db';
import { CONFIG } from '@/lib/config';
import { generateVoucherCode } from '@/lib/voucher';
import { generateLicenseKey } from '@/lib/keygen';
import { sendWhatsApp, getVoucherMessageTemplate } from '@/lib/fonnte';
import { sendTelegramToAdmin } from '@/lib/notify';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status
    } = body;

    // 1. Validasi keberadaan field wajib
    if (!order_id || !status_code || !gross_amount || !signature_key || !transaction_status) {
      console.log('[Webhook Midtrans] Test/Ping notification received (missing required fields). Returning 200.');
      return NextResponse.json({ status: 'ok', message: 'Test notification received' }, { status: 200 });
    }

    // 2. Validasi UUID Format untuk order_id agar PostgreSQL tidak error
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id);
    if (!isUuid) {
      console.log(`[Webhook Midtrans] Test/Dummy notification received (order_id: "${order_id}"). Returning 200.`);
      return NextResponse.json({ status: 'ok', message: 'Test notification received' }, { status: 200 });
    }

    // 3. Verifikasi Signature Key untuk keamanan
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      console.error('[Webhook Midtrans] MIDTRANS_SERVER_KEY is not configured in environment variables.');
      return NextResponse.json(
        { error: 'Server configuration error (Server Key missing).' },
        { status: 500 }
      );
    }
    const rawSignature = order_id + status_code + gross_amount + serverKey;
    const calculatedHash = createHash('sha512').update(rawSignature).digest('hex');

    if (calculatedHash !== signature_key) {
      console.warn('[Webhook Midtrans] Signature mismatch. Returning 200 (ignored).');
      return NextResponse.json({ status: 'ignored', message: 'Invalid signature key' }, { status: 200 });
    }

    console.log(`[Webhook Midtrans] Signature verified OK for Order: ${order_id}, Status: ${transaction_status}`);

    // 4. Cari order terkait di database
    const orders = await sql`
      SELECT id, paket, whatsapp, status, amount 
      FROM orders 
      WHERE id = ${order_id}
      LIMIT 1
    `;

    if (orders.length === 0) {
      console.warn(`[Webhook Midtrans] Order ID "${order_id}" not found in database. Returning 200 (ignored).`);
      return NextResponse.json({ status: 'ignored', message: 'Order not found' }, { status: 200 });
    }

    const order = orders[0];

    // 5. Cek apakah transaksi sukses dibayar (settlement atau capture accept)
    const isPaymentSuccess = 
      transaction_status === 'settlement' || 
      (transaction_status === 'capture' && fraud_status === 'accept');

    if (isPaymentSuccess) {
      if (order.status === 'PAID' || order.status === 'REDEEMED') {
        console.log(`[Webhook Midtrans] Order "${order_id}" already marked as PAID/REDEEMED. Ignoring duplicate webhook.`);
        return NextResponse.json({ status: 'success', message: 'Already processed' });
      }

      const voucherCode = generateVoucherCode();

      // Update status order menjadi PAID secara atomik
      const updateResult = await sql`
        UPDATE orders 
        SET status = 'PAID', 
            paid_at = CURRENT_TIMESTAMP, 
            voucher_code = ${voucherCode}
        WHERE id = ${order.id} 
          AND (status = 'PENDING' OR status = 'EXPIRED')
        RETURNING id, paket, whatsapp, amount, base_amount, hwid, affiliate_code, affiliate_markup
      `;

      if (updateResult.length === 0) {
        console.warn(`[Webhook Midtrans] Concurrent update conflict for order: ${order_id}`);
        return NextResponse.json({ error: 'Conflict' }, { status: 409 });
      }

      const updatedOrder = updateResult[0];
      const paketDetail = CONFIG.pakets[updatedOrder.paket];
      const kuota = paketDetail ? paketDetail.kuota : 0;
      const hari = paketDetail ? paketDetail.hari : 36500;
      const paketNama = paketDetail ? paketDetail.nama : updatedOrder.paket;

      console.log(`[Webhook Midtrans] Order ${order_id} successfully marked as PAID. Voucher: ${voucherCode}`);

      // === ATRIBUSI KOMISI AFFILIATE (JIKA ADA) ===
      if (updatedOrder.affiliate_code) {
        try {
          const affRows = await sql`
            SELECT id, code, name, whatsapp, hwid, total_earnings, withdrawn_amount, status
            FROM affiliates
            WHERE UPPER(code) = ${String(updatedOrder.affiliate_code).trim().toUpperCase()} AND status = 'ACTIVE'
            LIMIT 1
          `;

          if (affRows.length > 0) {
            const aff = affRows[0];
            const isSelfReferral = (updatedOrder.whatsapp === aff.whatsapp) || 
                                   (updatedOrder.hwid && aff.hwid && updatedOrder.hwid === aff.hwid);

            if (isSelfReferral) {
              console.warn(`[Webhook Midtrans] Self-referral detected for affiliate "${aff.code}". Commission skipped.`);
            } else {
              const grossAmount = Number(updatedOrder.amount);
              const baseAmount = Number(updatedOrder.base_amount || paketDetail?.harga || grossAmount);
              const gatewayFee = Math.round(grossAmount * 0.007); // 0.7% QRIS fee
              const netCommission = Math.max(grossAmount - baseAmount - gatewayFee, 0);

              if (netCommission > 0) {
                // Simpan ke affiliate_commissions
                await sql`
                  INSERT INTO affiliate_commissions (
                    order_id, affiliate_id, base_amount, gross_amount, gateway_fee, net_commission, status
                  ) VALUES (
                    ${order.id}, ${aff.id}, ${baseAmount}, ${grossAmount}, ${gatewayFee}, ${netCommission}, 'AVAILABLE'
                  )
                  ON CONFLICT (order_id) DO NOTHING
                `;

                // Update saldo total_earnings affiliator
                await sql`
                  UPDATE affiliates
                  SET total_earnings = total_earnings + ${netCommission}
                  WHERE id = ${aff.id}
                `;

                const newBalance = (Number(aff.total_earnings || 0) + netCommission) - Number(aff.withdrawn_amount || 0);

                console.log(`[Webhook Midtrans] Commission +Rp ${netCommission} credited to affiliate "${aff.code}"`);

                // Kirim Notifikasi WhatsApp KASINGG ke Affiliator
                if (aff.whatsapp) {
                  const affMsg = 
                    `🎉 *KASINGG! PENJUALAN BARU MASUK!* 🔔\n\n` +
                    `Pelanggan baru telah membeli paket *${paketNama}* via link/kode referral Anda (*${aff.code}*).\n\n` +
                    `💰 Komisi Bersih Anda: *+Rp ${netCommission.toLocaleString('id-ID')}*\n` +
                    `📊 Saldo Dompet Anda: *Rp ${newBalance.toLocaleString('id-ID')}*\n\n` +
                    `Pantau saldo & ajukan penarikan di dashboard:\nhttps://map-pertamina-web.vercel.app/affiliate/dashboard\n\n` +
                    `Terus bagikan link Anda di grup pangkalan untuk komisi tanpa batas! 🚀`;
                  await sendWhatsApp(aff.whatsapp, affMsg);
                }
              }
            }
          }
        } catch (affError) {
          console.error('[Webhook Midtrans] Error processing affiliate commission:', affError);
        }
      }

      // === AUTO-ACTIVATE jika Android/Desktop sudah kirim hwid ===
      let autoLicenseKey: string | null = null;
      if (updatedOrder.hwid) {
        try {
          autoLicenseKey = generateLicenseKey(updatedOrder.hwid, updatedOrder.paket, hari, kuota);
          // Simpan license key ke DB dan tandai sebagai REDEEMED
          await sql`
            UPDATE orders
            SET status = 'REDEEMED',
                redeemed_at = CURRENT_TIMESTAMP,
                license_key = ${autoLicenseKey}
            WHERE id = ${order.id}
          `;
          console.log(`[Webhook Midtrans] Auto-activated license for HWID: ${updatedOrder.hwid}`);
        } catch (e) {
          console.error('[Webhook Midtrans] Auto-activation failed:', e);
        }
      }

      // Kirim WhatsApp ke Pembeli & Admin (Non-blocking / Resilient)
      try {
        const customerMsg = autoLicenseKey
          ? `✅ *Pembayaran ${paketNama} berhasil!*\n\nLisensi Anda sudah AKTIF otomatis di perangkat Anda.\n\n🔑 Backup License Key:\n\`${autoLicenseKey}\`\n\nTerima kasih sudah menggunakan Bot MAP Pertamina! 🚀`
          : getVoucherMessageTemplate(paketNama, kuota, updatedOrder.amount, voucherCode);
        await sendWhatsApp(updatedOrder.whatsapp, customerMsg);

        const adminMsg = 
          `*🔔 MIDTRANS: PENJUALAN MASUK* 🔔\n\n` +
          `📦 Paket: *${paketNama}* (${kuota.toLocaleString('id-ID')} Tabung)\n` +
          `💰 Nominal: *Rp ${updatedOrder.amount.toLocaleString('id-ID')}*\n` +
          `📱 HP Pembeli: *${updatedOrder.whatsapp}*\n` +
          `🎟️ Voucher: \`${voucherCode}\`\n` +
          (autoLicenseKey ? `🔑 Auto-Activated HWID: \`${updatedOrder.hwid}\`\n` : '') +
          (updatedOrder.affiliate_code ? `🤝 Mitra Referral: *${updatedOrder.affiliate_code}*\n` : '') +
          `\n🚀 Sistem berhasil memverifikasi pembayaran Midtrans secara otomatis.`;

        // Kirim Notifikasi Telegram ke Admin
        await sendTelegramToAdmin(adminMsg);

        const adminPhone = process.env.ADMIN_PHONE;
        if (adminPhone) {
          await sendWhatsApp(adminPhone, adminMsg);
        }
      } catch (notifyError) {
        console.warn('[Webhook Midtrans] Error saat mengirim notifikasi:', notifyError);
      }

      return NextResponse.json({
        status: 'success',
        orderId: order_id,
        voucherCode: voucherCode
      });
      
    } else if (transaction_status === 'expire' || transaction_status === 'cancel' || transaction_status === 'deny') {
      // Jika pembayaran kedaluwarsa atau dibatalkan
      if (order.status === 'PENDING') {
        await sql`
          UPDATE orders 
          SET status = 'EXPIRED'
          WHERE id = ${order.id}
        `;
        console.log(`[Webhook Midtrans] Order ${order_id} marked as EXPIRED (status: ${transaction_status})`);
      }
      return NextResponse.json({ status: 'success', message: `Order status updated to EXPIRED/FAILED` });
    }

    return NextResponse.json({ status: 'success', message: 'Notification received and processed' });

  } catch (error: any) {
    console.error('[Webhook Midtrans] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem di webhook Midtrans.' },
      { status: 500 }
    );
  }
}
