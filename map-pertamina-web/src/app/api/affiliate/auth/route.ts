import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { sql, ensureAffiliateTables } from '@/lib/db';

function hashPin(pin: string): string {
  return createHash('sha256').update(`MAP_SALT_${pin}_SECRET`).digest('hex');
}

function generateSessionToken(affiliateId: string): string {
  const nonce = randomBytes(16).toString('hex');
  const payload = `${affiliateId}:${nonce}:${Date.now()}`;
  const sig = createHash('sha256').update(`${payload}:AFFILIATE_AUTH_KEY`).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

function verifySessionToken(token: string): string | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parts = raw.split(':');
    if (parts.length !== 4) return null;
    const [affiliateId, nonce, timestamp, sig] = parts;
    const expectedSig = createHash('sha256').update(`${affiliateId}:${nonce}:${timestamp}:AFFILIATE_AUTH_KEY`).digest('hex');
    if (sig !== expectedSig) return null;

    // Check expiration (valid for 30 days)
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > 30 * 24 * 60 * 60 * 1000) return null;

    return affiliateId;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    await ensureAffiliateTables();
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    // === REGISTER ===
    if (action === 'register') {
      const { name, whatsapp, pin, code, bankName, bankAccountNumber, bankAccountName, hwid } = body;

      if (!name || !whatsapp || !pin || !code) {
        return NextResponse.json({ error: 'Nama, No WhatsApp, PIN 6 digit, dan Kode Referral wajib diisi.' }, { status: 400 });
      }

      // Validasi PIN 6 Digit
      const cleanPin = String(pin).trim();
      if (!/^\d{6}$/.test(cleanPin)) {
        return NextResponse.json({ error: 'PIN harus terdiri dari tepat 6 angka (contoh: 123456).' }, { status: 400 });
      }

      // Sanitasi WhatsApp
      let cleanWa = String(whatsapp).trim().replace(/[-+\s]/g, '');
      if (cleanWa.startsWith('08')) cleanWa = '628' + cleanWa.slice(2);
      if (!cleanWa.startsWith('628') || cleanWa.length < 10) {
        return NextResponse.json({ error: 'Format nomor WhatsApp tidak valid (harus awalan 08 atau 628).' }, { status: 400 });
      }

      // Sanitasi Kode Referral
      const cleanCode = String(code).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '');
      if (cleanCode.length < 3 || cleanCode.length > 20) {
        return NextResponse.json({ error: 'Kode referral harus 3-20 karakter huruf/angka tanpa spasi.' }, { status: 400 });
      }

      // Cek apakah WhatsApp atau Kode sudah terdaftar
      const existing = await sql`
        SELECT code, whatsapp FROM affiliates
        WHERE UPPER(code) = ${cleanCode} OR whatsapp = ${cleanWa}
        LIMIT 1
      `;

      if (existing.length > 0) {
        if (existing[0].whatsapp === cleanWa) {
          return NextResponse.json({ error: 'Nomor WhatsApp ini sudah terdaftar sebagai mitra affiliate. Silakan login.' }, { status: 409 });
        }
        if (existing[0].code.toUpperCase() === cleanCode) {
          return NextResponse.json({ error: `Kode referral "${cleanCode}" sudah dipakai orang lain. Silakan pilih kode lain.` }, { status: 409 });
        }
      }

      const pinHash = hashPin(cleanPin);

      // Simpan ke database
      const inserted = await sql`
        INSERT INTO affiliates (
          name, whatsapp, pin_hash, code, markup_percent,
          bank_name, bank_account_number, bank_account_name, hwid
        ) VALUES (
          ${name.trim()}, ${cleanWa}, ${pinHash}, ${cleanCode}, 10,
          ${bankName || ''}, ${bankAccountNumber || ''}, ${bankAccountName || ''}, ${hwid || ''}
        )
        RETURNING id, code, name, whatsapp, markup_percent, total_earnings, withdrawn_amount
      `;

      const affiliate = inserted[0];
      const sessionToken = generateSessionToken(affiliate.id);

      const response = NextResponse.json({
        success: true,
        message: 'Pendaftaran mitra affiliate berhasil!',
        affiliate: {
          id: affiliate.id,
          name: affiliate.name,
          code: affiliate.code,
          whatsapp: affiliate.whatsapp,
          markupPercent: affiliate.markup_percent,
          totalEarnings: Number(affiliate.total_earnings || 0),
          withdrawnAmount: Number(affiliate.withdrawn_amount || 0)
        }
      });

      response.cookies.set('affiliate_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 // 30 hari
      });

      return response;
    }

    // === LOGIN ===
    if (action === 'login') {
      const { whatsapp, pin } = body;

      if (!whatsapp || !pin) {
        return NextResponse.json({ error: 'Nomor WhatsApp dan PIN wajib diisi.' }, { status: 400 });
      }

      let cleanWa = String(whatsapp).trim().replace(/[-+\s]/g, '');
      if (cleanWa.startsWith('08')) cleanWa = '628' + cleanWa.slice(2);

      const cleanPin = String(pin).trim();
      const pinHash = hashPin(cleanPin);

      const rows = await sql`
        SELECT id, code, name, whatsapp, pin_hash, markup_percent, bank_name, bank_account_number, bank_account_name, total_earnings, withdrawn_amount, status
        FROM affiliates
        WHERE whatsapp = ${cleanWa}
        LIMIT 1
      `;

      if (rows.length === 0 || rows[0].pin_hash !== pinHash) {
        return NextResponse.json({ error: 'Nomor WhatsApp atau PIN 6 digit salah!' }, { status: 401 });
      }

      const affiliate = rows[0];

      if (affiliate.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Akun affiliate Anda sedang nonaktif. Hubungi Admin.' }, { status: 403 });
      }

      const sessionToken = generateSessionToken(affiliate.id);

      const response = NextResponse.json({
        success: true,
        message: 'Login berhasil!',
        affiliate: {
          id: affiliate.id,
          name: affiliate.name,
          code: affiliate.code,
          whatsapp: affiliate.whatsapp,
          markupPercent: affiliate.markup_percent,
          bankName: affiliate.bank_name,
          bankAccountNumber: affiliate.bank_account_number,
          bankAccountName: affiliate.bank_account_name,
          totalEarnings: Number(affiliate.total_earnings || 0),
          withdrawnAmount: Number(affiliate.withdrawn_amount || 0)
        }
      });

      response.cookies.set('affiliate_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 // 30 hari
      });

      return response;
    }

    // === LOGOUT ===
    if (action === 'logout') {
      const response = NextResponse.json({ success: true, message: 'Berhasil keluar.' });
      response.cookies.set('affiliate_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0
      });
      return response;
    }

    return NextResponse.json({ error: 'Aksi tidak valid.' }, { status: 400 });

  } catch (error) {
    console.error('[API Affiliate Auth Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    await ensureAffiliateTables();

    // Check cookie session
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/affiliate_session=([^;]+)/);
    const token = match ? match[1] : null;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const affiliateId = verifySessionToken(token);
    if (!affiliateId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const rows = await sql`
      SELECT id, code, name, whatsapp, markup_percent, bank_name, bank_account_number, bank_account_name, total_earnings, withdrawn_amount, status, created_at
      FROM affiliates
      WHERE id = ${affiliateId} AND status = 'ACTIVE'
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const affiliate = rows[0];

    return NextResponse.json({
      authenticated: true,
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        code: affiliate.code,
        whatsapp: affiliate.whatsapp,
        markupPercent: affiliate.markup_percent,
        bankName: affiliate.bank_name,
        bankAccountNumber: affiliate.bank_account_number,
        bankAccountName: affiliate.bank_account_name,
        totalEarnings: Number(affiliate.total_earnings || 0),
        withdrawnAmount: Number(affiliate.withdrawn_amount || 0),
        balance: Number(affiliate.total_earnings || 0) - Number(affiliate.withdrawn_amount || 0),
        createdAt: affiliate.created_at
      }
    });

  } catch (error) {
    console.error('[API Affiliate Session Error]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
