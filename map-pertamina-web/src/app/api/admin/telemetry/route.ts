import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureAffiliateTables } from '@/lib/db';

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || 'Thema$k4j4';

export async function GET(req: NextRequest) {
  try {
    const passcode = req.headers.get('x-admin-passcode');
    if (passcode !== ADMIN_PASSCODE) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureAffiliateTables();

    // 1. Ambil seluruh data pangkalan
    const pangkalans = await sql`
      SELECT * FROM pangkalan_telemetry 
      ORDER BY last_sync_at DESC
    `;

    // 2. Hitung Agregat & Analisis Mendalam
    const totalPangkalan = pangkalans.length;
    let totalTabungNasional = 0;
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

      totalTabungNasional += kuota;
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
      const agName = p.agent_name || 'PT. Penyalur Mandiri';
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

    const topAgents = Object.values(agentMap).sort((a, b) => b.count - a.count).slice(0, 10);
    const topProvinces = Object.values(provinceMap).sort((a, b) => b.count - a.count).slice(0, 10);
    const topCities = Object.values(cityMap).sort((a, b) => b.count - a.count).slice(0, 10);
    const brandStats = Object.entries(brandMap).map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      metrics: {
        totalPangkalan,
        totalTabungNasional,
        totalEstimasiOmset,
        totalEstimasiLaba,
        totalModalTebusDo,
        totalNikProcessed,
        totalSuccessCount,
        totalInvalidCount,
        totalKonsumenUnik,
        avgDtks,
        avgKepatuhan,
        avgRt,
        avgUm,
        androidCount,
        windowsCount,
        topAgents,
        topProvinces,
        topCities,
        brandStats
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
