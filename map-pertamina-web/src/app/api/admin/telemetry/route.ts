import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureAffiliateTables } from '@/lib/db';

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'Thema$k4j4';

// Benchmark Resmi Nasional (ESDM & Pertamina Patra Niaga)
const BENCHMARK_NASIONAL = {
  totalPangkalanNasional: 250000, // ~250.000 pangkalan resmi se-Indonesia
  totalAgenNasional: 5500,        // ~5.500 PT Agen LPG 3Kg
  totalTabungNasionalBulanan: 220000000 // ~220 Juta tabung/bulan (~8.03 Juta Metrik Ton kuota APBN/tahun)
};

export async function GET(req: NextRequest) {
  try {
    const passcode = req.headers.get('x-admin-passcode');
    if (passcode !== ADMIN_PASSCODE) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureAffiliateTables();

    // 1. Ambil seluruh data pangkalan real yang masuk ke sistem kita
    const pangkalans = await sql`
      SELECT * FROM pangkalan_telemetry 
      ORDER BY last_sync_at DESC
    `;

    // 2. Hitung Agregat Data Klien Kita
    const totalPangkalan = pangkalans.length;
    let totalTabungKlien = 0;
    let totalEstimasiOmset = 0;
    let totalEstimasiLaba = 0;
    let totalModalTebusDo = 0;
    let totalNikProcessed = 0;
    let totalSuccessCount = 0;
    let totalInvalidCount = 0;
    let totalKonsumenUnik = 0;
    let sumDtks = 0;
    let sumKepatuhan = 0;
    let sumRt = 0;
    let sumUm = 0;
    let androidCount = 0;
    let windowsCount = 0;

    const agentMap: Record<string, { name: string; id: string; count: number; tabung: number; omset: number }> = {};
    const provinceMap: Record<string, { name: string; count: number; tabung: number }> = {};
    const cityMap: Record<string, { name: string; count: number }> = {};
    const brandMap: Record<string, number> = {};
    const ispMap: Record<string, number> = {};

    for (const p of pangkalans) {
      const kuota = Number(p.kuota_pertamina_bulanan) || 0;
      const omset = Number(p.estimasi_omset_bulanan) || 0;
      const laba = Number(p.estimasi_laba_bulanan) || 0;
      const modalDo = Number(p.modal_tebus_per_do) || Math.round((kuota / 4) * 15000);
      const nik = Number(p.total_nik_processed) || 0;
      const succ = Number(p.success_count) || 0;
      const inv = Number(p.invalid_count) || 0;
      const unik = Number(p.total_konsumen_unik) || Math.round(kuota / 3.5);

      totalTabungKlien += kuota;
      totalEstimasiOmset += omset;
      totalEstimasiLaba += laba;
      totalModalTebusDo += modalDo;
      totalNikProcessed += nik;
      totalSuccessCount += succ;
      totalInvalidCount += inv;
      totalKonsumenUnik += unik;

      sumDtks += Number(p.persen_dtks) || 72;
      sumKepatuhan += Number(p.skor_kepatuhan) || 98;
      sumRt += Number(p.persen_rumah_tangga) || 75;
      sumUm += Number(p.persen_usaha_mikro) || 25;

      if (p.platform === 'ANDROID') androidCount++;
      else windowsCount++;

      // Agen
      const agName = p.agent_name || 'PT. Agen Penyalur';
      if (!agentMap[agName]) {
        agentMap[agName] = { name: agName, id: p.agent_id || '-', count: 0, tabung: 0, omset: 0 };
      }
      agentMap[agName].count += 1;
      agentMap[agName].tabung += kuota;
      agentMap[agName].omset += omset;

      // Wilayah
      const provName = p.provinsi || 'Jawa Barat';
      if (!provinceMap[provName]) {
        provinceMap[provName] = { name: provName, count: 0, tabung: 0 };
      }
      provinceMap[provName].count += 1;
      provinceMap[provName].tabung += kuota;

      const cityName = p.kota_kabupaten || 'Kabupaten';
      if (!cityMap[cityName]) cityMap[cityName] = { name: cityName, count: 0 };
      cityMap[cityName].count += 1;

      // Hardware Brand
      const dev = (p.device_model || '').toUpperCase();
      let brand = 'Lainnya';
      if (dev.includes('SAMSUNG')) brand = 'Samsung';
      else if (dev.includes('XIAOMI') || dev.includes('REDMI') || dev.includes('POCO')) brand = 'Xiaomi/Redmi';
      else if (dev.includes('OPPO')) brand = 'Oppo';
      else if (dev.includes('VIVO')) brand = 'Vivo';
      else if (dev.includes('REALME')) brand = 'Realme';
      else if (dev.includes('INFINIX')) brand = 'Infinix';
      else if (p.platform === 'WINDOWS') brand = 'Windows PC/Laptop';

      brandMap[brand] = (brandMap[brand] || 0) + 1;

      // ISP
      const isp = p.isp || 'Telkomsel/Indihome';
      ispMap[isp] = (ispMap[isp] || 0) + 1;
    }

    const avgDtks = totalPangkalan > 0 ? Math.round(sumDtks / totalPangkalan) : 72;
    const avgKepatuhan = totalPangkalan > 0 ? Math.round(sumKepatuhan / totalPangkalan) : 98;
    const avgRt = totalPangkalan > 0 ? Math.round(sumRt / totalPangkalan) : 75;
    const avgUm = totalPangkalan > 0 ? Math.round(sumUm / totalPangkalan) : 25;

    // Perhitungan Pangsa Pasar (Market Share) terhadap Benchmark Nasional
    const totalAgenKita = Object.keys(agentMap).length;
    const marketShareTabungPercent = totalTabungKlien > 0 ? Number(((totalTabungKlien / BENCHMARK_NASIONAL.totalTabungNasionalBulanan) * 100).toFixed(4)) : 0;
    const penetrasiPangkalanPercent = totalPangkalan > 0 ? Number(((totalPangkalan / BENCHMARK_NASIONAL.totalPangkalanNasional) * 100).toFixed(3)) : 0;
    const penetrasiAgenPercent = totalAgenKita > 0 ? Number(((totalAgenKita / BENCHMARK_NASIONAL.totalAgenNasional) * 100).toFixed(2)) : 0;

    const topAgents = Object.values(agentMap)
      .map(ag => {
        const penetrasiInternal = Math.min(100, Math.round((ag.count / 40) * 100)); // Rata-rata 1 agen menaungi ~40 pangkalan
        const sisaPotensi = Math.max(0, 40 - ag.count);
        return {
          ...ag,
          penetrasiInternal,
          sisaPotensi
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topProvinces = Object.values(provinceMap).sort((a, b) => b.count - a.count).slice(0, 10);
    const topCities = Object.values(cityMap).sort((a, b) => b.count - a.count).slice(0, 10);
    const brandStats = Object.entries(brandMap).map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      metrics: {
        // Real Data Platform Kita
        totalPangkalan,
        totalTabungKlien,
        totalEstimasiOmset,
        totalEstimasiLaba,
        totalModalTebusDo,
        totalNikProcessed,
        totalSuccessCount,
        totalInvalidCount,
        totalKonsumenUnik,
        totalAgenKita,
        avgDtks,
        avgKepatuhan,
        avgRt,
        avgUm,
        androidCount,
        windowsCount,
        topAgents,
        topProvinces,
        topCities,
        brandStats,

        // Benchmark & Pangsa Pasar (Market Share)
        benchmarkNasional: BENCHMARK_NASIONAL,
        marketShareTabungPercent,
        penetrasiPangkalanPercent,
        penetrasiAgenPercent
      },
      pangkalans
    });
  } catch (error: any) {
    console.error('[ADMIN TELEMETRY ERROR]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
