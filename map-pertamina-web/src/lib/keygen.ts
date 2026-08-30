// keygen.ts
// =========
// Server-side RSA-2048 License Key Generator
// Sinkron dengan: telegram_keygen_bot.py (Python) & LicenseManager.kt (Android)
// Public Key harus sama persis di: Android Constants.kt, Desktop license_manager.py

import { createSign, createVerify, createPublicKey } from 'crypto';

// RSA Private Key (hanya ada di server — JANGAN bocorkan ke client)
const PRIVATE_KEY_PEM = process.env.RSA_PRIVATE_KEY as string;

export interface LicenseFeatures {
  can_submit_sales?: boolean;
  can_update_customer?: boolean;
  can_auto_captcha?: boolean;
  can_multi_batch?: boolean;
  max_devices?: number;
  unlimited_quota?: boolean;
  is_lifetime?: boolean;
  [key: string]: any;
}

/**
 * Men-generate License Key bertanda tangan digital RSA-2048.
 * Format: base64url(JSON_payload).base64url(RSA_signature)
 * 
 * Algoritma IDENTIK dengan:
 * - telegram_keygen_bot.py :: generate_license_key()
 * - license_generator.py   :: generate_license_key()
 * - Android LicenseManager :: verifyLicenseKeySignature() (verifier)
 */
export function generateLicenseKey(
  hwid: string, 
  paket: string, 
  hari: number, 
  kuota: number,
  features?: LicenseFeatures
): string {
  if (!PRIVATE_KEY_PEM) {
    throw new Error('RSA_PRIVATE_KEY environment variable is not defined!');
  }
  const expiry = new Date(Date.now() + hari * 24 * 60 * 60 * 1000).toISOString();

  const payload: Record<string, any> = {
    hwid: hwid.replace(/-/g, '').toUpperCase(),
    paket: paket.toUpperCase(),
    expiry,
    kuota_total: kuota,
  };

  if (features && Object.keys(features).length > 0) {
    payload.features = features;
  }

  const jsonBytes = Buffer.from(JSON.stringify(payload), 'utf-8');
  const jsonB64 = jsonBytes.toString('base64url');

  const sign = createSign('SHA256');
  sign.update(jsonBytes);
  const sigBytes = sign.sign(PRIVATE_KEY_PEM);
  const sigB64 = sigBytes.toString('base64url');

  return `${jsonB64}.${sigB64}`;
}

/**
 * Memverifikasi tanda tangan digital RSA-2048 dari kunci lisensi yang diberikan.
 * Mengembalikan status validitas dan payload jika tanda tangannya valid.
 */
export function verifyLicenseKey(licenseKey: string): { isValid: boolean; payload?: any } {
  try {
    const parts = licenseKey.trim().split('.');
    if (parts.length !== 2) return { isValid: false };

    const jsonB64 = parts[0];
    const sigB64 = parts[1];

    const jsonBytes = Buffer.from(jsonB64, 'base64url');
    const sigBytes = Buffer.from(sigB64, 'base64url');

    if (!PRIVATE_KEY_PEM) return { isValid: false };

    // Ambil public key dari private key untuk memverifikasi signature
    const publicKey = createPublicKey(PRIVATE_KEY_PEM);

    const verify = createVerify('SHA256');
    verify.update(jsonBytes);
    const isValid = verify.verify(publicKey, sigBytes);

    if (!isValid) return { isValid: false };

    const payload = JSON.parse(jsonBytes.toString('utf-8'));
    return { isValid: true, payload };
  } catch (e) {
    console.error('[verifyLicenseKey Error]', e);
    return { isValid: false };
  }
}
