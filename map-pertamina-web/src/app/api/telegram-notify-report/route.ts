import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyLicenseKey } from '@/lib/keygen';

export async function POST(request: Request) {
  try {
    // 1. Validasi X-License-Key
    const licenseKey = request.headers.get('x-license-key');
    if (!licenseKey) {
      return NextResponse.json({ error: 'Akses ditolak. Lisensi wajib disertakan.' }, { status: 401 });
    }

    // Validasi Keaslian Kriptografi RSA License Key
    const { isValid: isSigValid, payload: sigPayload } = verifyLicenseKey(licenseKey);

    const orderRow = await sql`
      SELECT id, hwid, paket, kuota_terpakai, customer_name, pangkalan_name, status 
      FROM orders 
      WHERE license_key = ${licenseKey} 
      LIMIT 1
    `;

    if (orderRow.length > 0 && orderRow[0].status === 'REVOKED') {
      return NextResponse.json({ error: 'Lisensi telah dinonaktifkan (REVOKED).' }, { status: 403 });
    }

    if (!isSigValid && orderRow.length === 0) {
      console.warn('[Telegram Notify Report] Invalid license key signature:', licenseKey);
      return NextResponse.json({ error: 'Lisensi tidak valid atau tanda tangan digital salah.' }, { status: 403 });
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is not defined!');
    }

    // 2. Parse form data
    const formData = await request.formData();
    const chatId = formData.get('chat_id') || process.env.ADMIN_TELEGRAM_ID || '1203246492';
    const caption = formData.get('caption') || '';
    const document = formData.get('document');

    if (!document) {
      return NextResponse.json({ error: 'Document file is required.' }, { status: 400 });
    }

    // 3. Forward to Telegram sendDocument API
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
    
    const tgFormData = new FormData();
    tgFormData.append('chat_id', String(chatId));
    tgFormData.append('caption', String(caption));
    tgFormData.append('document', document as Blob, 'Laporan_NIK_Pertamina.xlsx');

    const tgResponse = await fetch(telegramUrl, {
      method: 'POST',
      body: tgFormData
    });

    if (!tgResponse.ok) {
      const errorText = await tgResponse.text();
      console.error('[Telegram API sendDocument Error]', errorText);
      return NextResponse.json({ error: 'Gagal mengirim laporan ke Telegram.' }, { status: 502 });
    }

    // 4. Auto-record Telemetri Pangkalan langsung ke Database Neon PostgreSQL
    try {
      const capStr = String(caption);
      const merchantDataRaw = formData.get('merchant_data');
      let merchantObj: any = null;
      if (merchantDataRaw) {
        try {
          let clean = String(merchantDataRaw).trim();
          if (clean.startsWith('"') && clean.endsWith('"') && clean.length > 2) {
            clean = JSON.parse(clean);
          }
          if (typeof clean === 'string') {
            merchantObj = JSON.parse(clean);
          } else {
            merchantObj = clean;
          }
        } catch (_) {}
      }

      const pNameMatch = capStr.match(/🏢\s*Pangkalan:\s*(.+)/i);
      const phoneMatch = capStr.match(/📱\s*Akun MAP:\s*(.+)/i);
      const successMatch = capStr.match(/✅\s*Sukses:\s*(\d+)/i);
      const processedMatch = capStr.match(/Total Diproses:\s*(\d+)/i);

      let pName = merchantObj?.merchant_name || merchantObj?.storeName || (pNameMatch ? pNameMatch[1].trim() : 'Pangkalan MAP');
      let ownerName = merchantObj?.owner_name || merchantObj?.name || pName;
      let phone = merchantObj?.phone || merchantObj?.phoneNumber || (phoneMatch ? phoneMatch[1].trim() : '');
      let agentName = merchantObj?.agent_name || merchantObj?.agen?.name || 'PT. Agen Penyalur LPG';
      let agentId = merchantObj?.agent_id || merchantObj?.agen?.id || null;
      let address = merchantObj?.address || merchantObj?.storeAddress || null;
      let kelurahan = merchantObj?.kelurahan || merchantObj?.villageName || null;
      let kecamatan = merchantObj?.kecamatan || merchantObj?.districtName || merchantObj?.ditrictName || null;
      let kota = merchantObj?.kota_kabupaten || merchantObj?.city || 'KABUPATEN';
      let prov = merchantObj?.provinsi || merchantObj?.province || 'JAWA BARAT';
      let kuotaPertamina = Number(merchantObj?.kuota_pertamina_bulanan || merchantObj?.stockRedeem) || 2500;
      let sisaStok = Number(merchantObj?.sisa_kuota_pertamina || merchantObj?.stockAvailable) || 2500;
      let het = Number(merchantObj?.het_daerah || merchantObj?.price) || 20000;
      let estimasiOmset = kuotaPertamina * het;
      let estimasiLaba = kuotaPertamina * 2000;
      let sCount = successMatch ? parseInt(successMatch[1], 10) : 0;
      let processed = processedMatch ? parseInt(processedMatch[1], 10) : 0;
      let mId = merchantObj?.merchant_id || merchantObj?.registrationId || merchantObj?.merchantId || `MERCHANT-${phone ? (phone.length >= 6 ? phone.slice(-6) : phone) : '001'}`;

      // Ambil HWID dari database atau langsung dari token lisensi
      const hwid = orderRow[0]?.hwid || sigPayload?.hwid || 'HWID-APP-TELEGRAM';

      await sql`
        INSERT INTO pangkalan_telemetry (
          hwid,
          license_key,
          merchant_id,
          merchant_name,
          owner_name,
          agent_id,
          agent_name,
          phone,
          address,
          kelurahan,
          kecamatan,
          kota_kabupaten,
          provinsi,
          kuota_pertamina_bulanan,
          sisa_kuota_pertamina,
          het_daerah,
          estimasi_omset_bulanan,
          estimasi_laba_bulanan,
          total_nik_processed,
          success_count,
          platform,
          app_version,
          last_sync_at
        ) VALUES (
          ${hwid},
          ${licenseKey},
          ${mId},
          ${pName},
          ${ownerName},
          ${agentId},
          ${agentName},
          ${phone || null},
          ${address},
          ${kelurahan},
          ${kecamatan},
          ${kota},
          ${prov},
          ${kuotaPertamina},
          ${sisaStok},
          ${het},
          ${estimasiOmset},
          ${estimasiLaba},
          ${processed},
          ${sCount},
          'ANDROID',
          '1.1.4',
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (hwid) DO UPDATE SET
          license_key = COALESCE(EXCLUDED.license_key, pangkalan_telemetry.license_key),
          merchant_id = CASE 
            WHEN EXCLUDED.merchant_id IS NOT NULL AND EXCLUDED.merchant_id NOT LIKE 'MERCHANT-%' AND EXCLUDED.merchant_id NOT LIKE '%-%-%-%-%' THEN EXCLUDED.merchant_id 
            ELSE pangkalan_telemetry.merchant_id 
          END,
          merchant_name = CASE 
            WHEN EXCLUDED.merchant_name IS NOT NULL AND EXCLUDED.merchant_name NOT LIKE '%Pangkalan MAP%' THEN EXCLUDED.merchant_name 
            ELSE pangkalan_telemetry.merchant_name 
          END,
          owner_name = COALESCE(EXCLUDED.owner_name, pangkalan_telemetry.owner_name),
          agent_id = COALESCE(EXCLUDED.agent_id, pangkalan_telemetry.agent_id),
          agent_name = CASE 
            WHEN EXCLUDED.agent_name IS NOT NULL AND EXCLUDED.agent_name NOT LIKE '%PT. Agen Penyalur LPG%' THEN EXCLUDED.agent_name 
            ELSE pangkalan_telemetry.agent_name 
          END,
          phone = COALESCE(EXCLUDED.phone, pangkalan_telemetry.phone),
          address = COALESCE(EXCLUDED.address, pangkalan_telemetry.address),
          kelurahan = COALESCE(EXCLUDED.kelurahan, pangkalan_telemetry.kelurahan),
          kecamatan = COALESCE(EXCLUDED.kecamatan, pangkalan_telemetry.kecamatan),
          kota_kabupaten = COALESCE(EXCLUDED.kota_kabupaten, pangkalan_telemetry.kota_kabupaten),
          provinsi = COALESCE(EXCLUDED.provinsi, pangkalan_telemetry.provinsi),
          kuota_pertamina_bulanan = CASE WHEN EXCLUDED.kuota_pertamina_bulanan > 0 THEN EXCLUDED.kuota_pertamina_bulanan ELSE pangkalan_telemetry.kuota_pertamina_bulanan END,
          sisa_kuota_pertamina = CASE WHEN EXCLUDED.sisa_kuota_pertamina > 0 THEN EXCLUDED.sisa_kuota_pertamina ELSE pangkalan_telemetry.sisa_kuota_pertamina END,
          het_daerah = CASE WHEN EXCLUDED.het_daerah > 0 THEN EXCLUDED.het_daerah ELSE pangkalan_telemetry.het_daerah END,
          total_nik_processed = GREATEST(pangkalan_telemetry.total_nik_processed, EXCLUDED.total_nik_processed),
          success_count = GREATEST(pangkalan_telemetry.success_count, EXCLUDED.success_count),
          last_sync_at = CURRENT_TIMESTAMP;
      `;
      console.log(`[Telegram Report Telemetry] Auto-synced FULL telemetry for ${pName} (${phone}) on HWID ${hwid}`);
    } catch (telemetryErr) {
      console.warn('[Telegram Report Telemetry Warn]', telemetryErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API telegram-notify-report Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal pada server.' }, { status: 500 });
  }
}
