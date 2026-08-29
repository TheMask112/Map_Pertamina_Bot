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

    // 2. Hitung Agregat KPI
    const totalPangkalan = pangkalans.length;
    let totalTabungNasional = 0;
    let totalEstimasiOmset = 0;
    let totalEstimasiLaba = 0;
    let totalNikProcessed = 0;
    let androidCount = 0;
    let windowsCount = 0;

    const agentMap: Record<string, { name: string; count: number; tabung: number }> = {};
    const provinceMap: Record<string, number> = {};

    for (const p of pangkalans) {
      const kuota = Number(p.kuota_pertamina_bulanan) || 0;
      const omset = Number(p.estimasi_omset_bulanan) || 0;
      const laba = Number(p.estimasi_laba_bulanan) || 0;
      const nik = Number(p.total_nik_processed) || 0;

      totalTabungNasional += kuota;
      totalEstimasiOmset += omset;
      totalEstimasiLaba += laba;
      totalNikProcessed += nik;

      if (p.platform === 'ANDROID') androidCount++;
      else windowsCount++;

      if (p.agent_name) {
        if (!agentMap[p.agent_name]) {
          agentMap[p.agent_name] = { name: p.agent_name, count: 0, tabung: 0 };
        }
        agentMap[p.agent_name].count += 1;
        agentMap[p.agent_name].tabung += kuota;
      }

      if (p.provinsi) {
        provinceMap[p.provinsi] = (provinceMap[p.provinsi] || 0) + 1;
      }
    }

    const topAgents = Object.values(agentMap).sort((a, b) => b.count - a.count).slice(0, 10);
    const topProvinces = Object.entries(provinceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      metrics: {
        totalPangkalan,
        totalTabungNasional,
        totalEstimasiOmset,
        totalEstimasiLaba,
        totalNikProcessed,
        androidCount,
        windowsCount,
        topAgents,
        topProvinces
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
