import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { sql, ensureAffiliateTables } from '@/lib/db';

function verifySessionToken(token: string): string | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = raw.split(':');
    if (parts.length !== 4) return null;
    const [affiliateId, nonce, timestamp, sig] = parts;
    const expectedSig = createHash('sha256').update(`${affiliateId}:${nonce}:${timestamp}:AFFILIATE_AUTH_KEY`).digest('hex');
    if (sig !== expectedSig) return null;

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > 30 * 24 * 60 * 60 * 1000) return null;

    return affiliateId;
  } catch {
    return null;
  }
}

async function getAffiliateFromRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/affiliate_session=([^;]+)/);
  const token = match ? match[1] : null;
  if (!token) return null;

  const affiliateId = verifySessionToken(token);
  if (!affiliateId) return null;

  const rows = await sql`
    SELECT * FROM affiliates WHERE id = ${affiliateId} AND status = 'ACTIVE' LIMIT 1
  `;
  return rows.length > 0 ? rows[0] : null;
}

export async function GET(request: Request) {
  try {
    await ensureAffiliateTables();
    const affiliate = await getAffiliateFromRequest(request);

    if (!affiliate) {
      return NextResponse.json({ error: 'Sesi login tidak valid atau kadaluarsa.' }, { status: 401 });
    }

    // 1. Ambil riwayat komisi penjualan
    const commissions = await sql`
      SELECT c.id, c.order_id, c.base_amount, c.gross_amount, c.net_commission, c.status, c.created_at,
             o.paket, o.whatsapp AS buyer_whatsapp
      FROM affiliate_commissions c
      JOIN orders o ON c.order_id = o.id
      WHERE c.affiliate_id = ${affiliate.id}
      ORDER BY c.created_at DESC
      LIMIT 50
    `;

    // 2. Ambil riwayat penarikan dana
    const payouts = await sql`
      SELECT id, amount, bank_name, bank_account_number, bank_account_name, status, notes, created_at, processed_at
      FROM affiliate_payouts
      WHERE affiliate_id = ${affiliate.id}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const totalEarnings = Number(affiliate.total_earnings || 0);
    const withdrawnAmount = Number(affiliate.withdrawn_amount || 0);
    const availableBalance = totalEarnings - withdrawnAmount;

    return NextResponse.json({
      success: true,
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        code: affiliate.code,
        whatsapp: affiliate.whatsapp,
        markupPercent: affiliate.markup_percent,
        bankName: affiliate.bank_name,
        bankAccountNumber: affiliate.bank_account_number,
        bankAccountName: affiliate.bank_account_name,
        totalEarnings,
        withdrawnAmount,
        availableBalance,
        totalSalesCount: commissions.length
      },
      commissions: commissions.map((c: any) => ({
        id: c.id,
        orderId: c.order_id,
        paket: c.paket,
        buyerWa: c.buyer_whatsapp ? c.buyer_whatsapp.slice(0, 4) + '****' + c.buyer_whatsapp.slice(-3) : '-',
        baseAmount: Number(c.base_amount),
        grossAmount: Number(c.gross_amount),
        netCommission: Number(c.net_commission),
        status: c.status,
        createdAt: c.created_at
      })),
      payouts: payouts.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        bankName: p.bank_name,
        bankAccountNumber: p.bank_account_number,
        bankAccountName: p.bank_account_name,
        status: p.status,
        notes: p.notes,
        createdAt: p.created_at,
        processedAt: p.processed_at
      }))
    });

  } catch (error) {
    console.error('[API Affiliate Dashboard GET Error]', error);
    return NextResponse.json({ error: 'Gagal memuat data dashboard.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureAffiliateTables();
    const affiliate = await getAffiliateFromRequest(request);

    if (!affiliate) {
      return NextResponse.json({ error: 'Sesi login tidak valid atau kadaluarsa.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action } = body;

    // === 1. UPDATE MARKUP PERCENT ===
    if (action === 'update_markup') {
      const markupPercent = parseInt(body.markupPercent, 10);
      if (isNaN(markupPercent) || markupPercent < 0 || markupPercent > 50) {
        return NextResponse.json({ error: 'Markup persentase harus antara 0% hingga maksimal 50%.' }, { status: 400 });
      }

      await sql`
        UPDATE affiliates
        SET markup_percent = ${markupPercent}
        WHERE id = ${affiliate.id}
      `;

      return NextResponse.json({
        success: true,
        message: `Markup berhasil diubah menjadi +${markupPercent}%!`,
        markupPercent
      });
    }

    // === 2. UPDATE BANK INFO ===
    if (action === 'update_bank') {
      const { bankName, bankAccountNumber, bankAccountName } = body;
      if (!bankName || !bankAccountNumber || !bankAccountName) {
        return NextResponse.json({ error: 'Nama Bank / E-Wallet, Nomor Rekening, dan Atas Nama wajib diisi.' }, { status: 400 });
      }

      await sql`
        UPDATE affiliates
        SET bank_name = ${bankName.trim()},
            bank_account_number = ${bankAccountNumber.trim()},
            bank_account_name = ${bankAccountName.trim()}
        WHERE id = ${affiliate.id}
      `;

      return NextResponse.json({
        success: true,
        message: 'Informasi rekening penarikan berhasil disimpan!'
      });
    }

    // === 3. REQUEST PAYOUT ===
    if (action === 'request_payout') {
      const amount = parseInt(body.amount, 10);
      const MIN_PAYOUT = 50000; // Minimal Rp 50.000

      if (isNaN(amount) || amount < MIN_PAYOUT) {
        return NextResponse.json({ error: `Minimal penarikan saldo adalah Rp ${MIN_PAYOUT.toLocaleString('id-ID')}.` }, { status: 400 });
      }

      const totalEarnings = Number(affiliate.total_earnings || 0);
      const withdrawnAmount = Number(affiliate.withdrawn_amount || 0);
      const availableBalance = totalEarnings - withdrawnAmount;

      if (amount > availableBalance) {
        return NextResponse.json({ error: `Saldo Anda tidak mencukupi. Saldo tersedia: Rp ${availableBalance.toLocaleString('id-ID')}.` }, { status: 400 });
      }

      if (!affiliate.bank_name || !affiliate.bank_account_number || !affiliate.bank_account_name) {
        return NextResponse.json({ error: 'Silakan lengkapi informasi rekening bank/e-wallet Anda terlebih dahulu.' }, { status: 400 });
      }

      // Cek apakah ada penarikan yang masih PENDING
      const pendingRows = await sql`
        SELECT id FROM affiliate_payouts
        WHERE affiliate_id = ${affiliate.id} AND status = 'PENDING'
        LIMIT 1
      `;
      if (pendingRows.length > 0) {
        return NextResponse.json({ error: 'Anda masih memiliki permohonan penarikan dana yang sedang diproses. Mohon tunggu.' }, { status: 400 });
      }

      // Catat permohonan penarikan dan kunci saldo
      await sql`
        INSERT INTO affiliate_payouts (
          affiliate_id, amount, bank_name, bank_account_number, bank_account_name, status
        ) VALUES (
          ${affiliate.id}, ${amount}, ${affiliate.bank_name}, ${affiliate.bank_account_number}, ${affiliate.bank_account_name}, 'PENDING'
        )
      `;

      await sql`
        UPDATE affiliates
        SET withdrawn_amount = withdrawn_amount + ${amount}
        WHERE id = ${affiliate.id}
      `;

      return NextResponse.json({
        success: true,
        message: `Permohonan penarikan dana Rp ${amount.toLocaleString('id-ID')} berhasil diajukan! Admin akan memproses transfer dalam 1x24 jam.`
      });
    }

    return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });

  } catch (error) {
    console.error('[API Affiliate Dashboard POST Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
