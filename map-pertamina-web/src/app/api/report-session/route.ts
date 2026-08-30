import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyLicenseKey } from '@/lib/keygen';

export async function POST(request: Request) {
  try {
    const licenseKey = request.headers.get('x-license-key');
    if (!licenseKey) {
      return NextResponse.json({ error: 'License key wajib disertakan.' }, { status: 401 });
    }

    // Verify against DB first
    const result = await sql`
      SELECT id 
      FROM orders 
      WHERE license_key = ${licenseKey} AND status = 'REDEEMED' 
      LIMIT 1
    `;

    if (result.length === 0) {
      // Fallback: verify RSA signature
      const { isValid } = verifyLicenseKey(licenseKey);
      if (!isValid) {
        return NextResponse.json({ error: 'Lisensi tidak valid.' }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const {
      whatsapp, nama_pangkalan, platform, app_version,
      started_at, ended_at, duration_seconds,
      total_nik, nik_sukses, nik_gagal, nik_tidak_terdaftar,
      nik_kuota_habis, nik_meninggal, nik_dibawah_umur, nik_tidak_aktif,
      captcha_total, captcha_sukses, jumlah_tabung,
      avg_seconds_per_nik, batch_number, error_summary,
      kota, provinsi, alokasi_bulanan, jumlah_pelanggan, hwid
    } = body;

    if (!whatsapp) {
      return NextResponse.json({ error: 'whatsapp wajib disertakan.' }, { status: 400 });
    }

    // 3. INSERT into bot_sessions
    const sessionResult = await sql`
      INSERT INTO bot_sessions (
        whatsapp, hwid, platform, started_at, ended_at, duration_seconds,
        total_nik, nik_sukses, nik_gagal, nik_tidak_terdaftar,
        nik_kuota_habis, nik_meninggal, nik_dibawah_umur, nik_tidak_aktif,
        captcha_total, captcha_sukses, jumlah_tabung, avg_seconds_per_nik,
        batch_number, app_version, error_summary, nama_pangkalan
      ) VALUES (
        ${whatsapp}, ${hwid}, ${platform || 'DESKTOP'}, ${started_at ? new Date(started_at) : null}, ${ended_at ? new Date(ended_at) : new Date()}, ${duration_seconds || 0},
        ${total_nik || 0}, ${nik_sukses || 0}, ${nik_gagal || 0}, ${nik_tidak_terdaftar || 0},
        ${nik_kuota_habis || 0}, ${nik_meninggal || 0}, ${nik_dibawah_umur || 0}, ${nik_tidak_aktif || 0},
        ${captcha_total || 0}, ${captcha_sukses || 0}, ${jumlah_tabung || 1}, ${avg_seconds_per_nik || 0},
        ${batch_number || 1}, ${app_version}, ${error_summary}, ${nama_pangkalan}
      )
      RETURNING id
    `;
    const session_id = sessionResult[0].id;

    // 4. UPSERT into pangkalan_profiles
    await sql`
      INSERT INTO pangkalan_profiles (
        whatsapp, nama_pangkalan, kota, provinsi, alokasi_bulanan, jumlah_pelanggan, platform, app_version,
        last_active_at, total_sesi, total_nik_sukses, total_nik_gagal
      ) VALUES (
        ${whatsapp}, ${nama_pangkalan}, ${kota}, ${provinsi}, ${alokasi_bulanan || 0}, ${jumlah_pelanggan || 0}, ${platform || 'DESKTOP'}, ${app_version},
        NOW(), 1, ${nik_sukses || 0}, ${nik_gagal || 0}
      )
      ON CONFLICT (whatsapp) DO UPDATE SET
        nama_pangkalan = COALESCE(EXCLUDED.nama_pangkalan, pangkalan_profiles.nama_pangkalan),
        kota = COALESCE(EXCLUDED.kota, pangkalan_profiles.kota),
        provinsi = COALESCE(EXCLUDED.provinsi, pangkalan_profiles.provinsi),
        alokasi_bulanan = COALESCE(EXCLUDED.alokasi_bulanan, pangkalan_profiles.alokasi_bulanan),
        jumlah_pelanggan = COALESCE(EXCLUDED.jumlah_pelanggan, pangkalan_profiles.jumlah_pelanggan),
        platform = EXCLUDED.platform,
        app_version = EXCLUDED.app_version,
        last_active_at = NOW(),
        total_sesi = pangkalan_profiles.total_sesi + 1,
        total_nik_sukses = pangkalan_profiles.total_nik_sukses + EXCLUDED.total_nik_sukses,
        total_nik_gagal = pangkalan_profiles.total_nik_gagal + EXCLUDED.total_nik_gagal
    `;

    return NextResponse.json({ success: true, session_id });

  } catch (error) {
    console.error('[API Report Session Error]', error);
    return NextResponse.json({ error: 'Internal system error' }, { status: 500 });
  }
}
