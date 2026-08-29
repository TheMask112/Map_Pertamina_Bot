import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureAffiliateTables } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await ensureAffiliateTables();

    const body = await req.json();
    const {
      hwid,
      license_key,
      merchant_id,
      merchant_name,
      owner_name,
      agent_id,
      agent_name,
      phone,
      email,
      address,
      kelurahan,
      kecamatan,
      kota_kabupaten,
      provinsi,
      kodepos,
      kuota_pertamina_bulanan = 0,
      sisa_kuota_pertamina = 0,
      total_penjualan_pertamina = 0,
      het_daerah = 19000,
      modal_tebus_per_do,
      jadwal_pasokan = 'Selasa & Jumat',
      total_konsumen_unik,
      persen_dtks = 72,
      skor_kepatuhan = 98,
      anomali_overlimit_count = 0,
      metode_bayar_tunai_persen = 85,
      metode_bayar_qris_persen = 15,
      avg_speed_seconds = 3.8,
      peak_hours = '14:00 - 17:00 WIB',
      device_model,
      device_os,
      platform = 'ANDROID',
      app_version = '1.0.9',
      isp,
      total_nik_processed = 0,
      success_count = 0,
      invalid_count = 0,
      persen_rumah_tangga = 75,
      persen_usaha_mikro = 25
    } = body;

    if (!hwid) {
      return NextResponse.json({ success: false, error: 'HWID is required' }, { status: 400 });
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     '127.0.0.1';

    // Estimasi Finansial & Operasional
    const kuotaBulanan = Number(kuota_pertamina_bulanan) || 0;
    const het = Number(het_daerah) || 19000;
    const estimasiOmset = kuotaBulanan * het;
    const estimasiLaba = kuotaBulanan * 2000; // Margin standar pangkalan Rp 2.000 / tabung
    const estimasiModalDo = modal_tebus_per_do ? Number(modal_tebus_per_do) : Math.round((kuotaBulanan / 4) * 15000);
    const konsumenUnik = total_konsumen_unik ? Number(total_konsumen_unik) : Math.round(kuotaBulanan / 3.5);

    // Simpan / Update ke Database Neon Postgres (UPSERT)
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
        email,
        address,
        kelurahan,
        kecamatan,
        kota_kabupaten,
        provinsi,
        kodepos,
        kuota_pertamina_bulanan,
        sisa_kuota_pertamina,
        total_penjualan_pertamina,
        het_daerah,
        estimasi_omset_bulanan,
        estimasi_laba_bulanan,
        modal_tebus_per_do,
        jadwal_pasokan,
        total_konsumen_unik,
        persen_dtks,
        skor_kepatuhan,
        anomali_overlimit_count,
        metode_bayar_tunai_persen,
        metode_bayar_qris_persen,
        avg_speed_seconds,
        peak_hours,
        device_model,
        device_os,
        platform,
        app_version,
        ip_address,
        isp,
        total_nik_processed,
        success_count,
        invalid_count,
        persen_rumah_tangga,
        persen_usaha_mikro,
        last_sync_at
      ) VALUES (
        ${hwid},
        ${license_key || null},
        ${merchant_id || 'UNKNOWN'},
        ${merchant_name || 'Pangkalan MAP'},
        ${owner_name || null},
        ${agent_id || null},
        ${agent_name || null},
        ${phone || null},
        ${email || null},
        ${address || null},
        ${kelurahan || null},
        ${kecamatan || null},
        ${kota_kabupaten || null},
        ${provinsi || null},
        ${kodepos || null},
        ${kuotaBulanan},
        ${Number(sisa_kuota_pertamina) || 0},
        ${Number(total_penjualan_pertamina) || 0},
        ${het},
        ${estimasiOmset},
        ${estimasiLaba},
        ${estimasiModalDo},
        ${jadwal_pasokan},
        ${konsumenUnik},
        ${Number(persen_dtks)},
        ${Number(skor_kepatuhan)},
        ${Number(anomali_overlimit_count)},
        ${Number(metode_bayar_tunai_persen)},
        ${Number(metode_bayar_qris_persen)},
        ${Number(avg_speed_seconds)},
        ${peak_hours},
        ${device_model || null},
        ${device_os || null},
        ${platform},
        ${app_version},
        ${clientIp},
        ${isp || null},
        ${Number(total_nik_processed) || 0},
        ${Number(success_count) || 0},
        ${Number(invalid_count) || 0},
        ${Number(persen_rumah_tangga) || 75},
        ${Number(persen_usaha_mikro) || 25},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (hwid, merchant_id) DO UPDATE SET
        license_key = EXCLUDED.license_key,
        merchant_name = COALESCE(EXCLUDED.merchant_name, pangkalan_telemetry.merchant_name),
        owner_name = COALESCE(EXCLUDED.owner_name, pangkalan_telemetry.owner_name),
        agent_id = COALESCE(EXCLUDED.agent_id, pangkalan_telemetry.agent_id),
        agent_name = COALESCE(EXCLUDED.agent_name, pangkalan_telemetry.agent_name),
        phone = COALESCE(EXCLUDED.phone, pangkalan_telemetry.phone),
        email = COALESCE(EXCLUDED.email, pangkalan_telemetry.email),
        address = COALESCE(EXCLUDED.address, pangkalan_telemetry.address),
        kelurahan = COALESCE(EXCLUDED.kelurahan, pangkalan_telemetry.kelurahan),
        kecamatan = COALESCE(EXCLUDED.kecamatan, pangkalan_telemetry.kecamatan),
        kota_kabupaten = COALESCE(EXCLUDED.kota_kabupaten, pangkalan_telemetry.kota_kabupaten),
        provinsi = COALESCE(EXCLUDED.provinsi, pangkalan_telemetry.provinsi),
        kodepos = COALESCE(EXCLUDED.kodepos, pangkalan_telemetry.kodepos),
        kuota_pertamina_bulanan = CASE WHEN EXCLUDED.kuota_pertamina_bulanan > 0 THEN EXCLUDED.kuota_pertamina_bulanan ELSE pangkalan_telemetry.kuota_pertamina_bulanan END,
        sisa_kuota_pertamina = EXCLUDED.sisa_kuota_pertamina,
        total_penjualan_pertamina = EXCLUDED.total_penjualan_pertamina,
        het_daerah = EXCLUDED.het_daerah,
        estimasi_omset_bulanan = EXCLUDED.estimasi_omset_bulanan,
        estimasi_laba_bulanan = EXCLUDED.estimasi_laba_bulanan,
        modal_tebus_per_do = EXCLUDED.modal_tebus_per_do,
        jadwal_pasokan = EXCLUDED.jadwal_pasokan,
        total_konsumen_unik = EXCLUDED.total_konsumen_unik,
        persen_dtks = EXCLUDED.persen_dtks,
        skor_kepatuhan = EXCLUDED.skor_kepatuhan,
        anomali_overlimit_count = EXCLUDED.anomali_overlimit_count,
        metode_bayar_tunai_persen = EXCLUDED.metode_bayar_tunai_persen,
        metode_bayar_qris_persen = EXCLUDED.metode_bayar_qris_persen,
        avg_speed_seconds = EXCLUDED.avg_speed_seconds,
        peak_hours = EXCLUDED.peak_hours,
        device_model = COALESCE(EXCLUDED.device_model, pangkalan_telemetry.device_model),
        device_os = COALESCE(EXCLUDED.device_os, pangkalan_telemetry.device_os),
        platform = EXCLUDED.platform,
        app_version = EXCLUDED.app_version,
        ip_address = EXCLUDED.ip_address,
        isp = COALESCE(EXCLUDED.isp, pangkalan_telemetry.isp),
        total_nik_processed = pangkalan_telemetry.total_nik_processed + EXCLUDED.total_nik_processed,
        success_count = pangkalan_telemetry.success_count + EXCLUDED.success_count,
        invalid_count = pangkalan_telemetry.invalid_count + EXCLUDED.invalid_count,
        persen_rumah_tangga = EXCLUDED.persen_rumah_tangga,
        persen_usaha_mikro = EXCLUDED.persen_usaha_mikro,
        last_sync_at = CURRENT_TIMESTAMP;
    `;

    return NextResponse.json({
      success: true,
      message: 'Telemetry and deep analytics recorded successfully'
    });
  } catch (error: any) {
    console.error('[TELEMETRY ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
