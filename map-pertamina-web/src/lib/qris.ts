// qris.ts
// QRIS Dynamic Converter & QR Code Generator

import QRCode from 'qrcode';

// Defensive require to handle CommonJS vs ES Module transpile wrap safely on Vercel
const qrisDinamis = require('qris-dinamis');
const makeString = qrisDinamis.makeString || 
                   (qrisDinamis.default && qrisDinamis.default.makeString) || 
                   qrisDinamis;

// Sanitasi string QRIS Statis dari env: hapus spasi & tanda kutip membungkus (jika ditambahkan oleh CLI)
const rawQris = process.env.QRIS_STATIC_STRING;
if (!rawQris) {
  throw new Error('QRIS_STATIC_STRING environment variable is not defined!');
}
const STATIC_QRIS = rawQris.trim().replace(/^["']|["']$/g, '');

/**
 * Mengubah QRIS Statis merchant menjadi QRIS Dinamis dengan nominal unik tertentu.
 * @param amount Nominal unik pembayaran (misal: 75037)
 */
export function convertStaticToDynamic(amount: number): string {
  try {
    if (typeof makeString !== 'function') {
      throw new TypeError('makeString is not resolved as a function from qris-dinamis module');
    }
    
    // makeString mengharapkan nominal dalam tipe string
    const dynamicQris = makeString(STATIC_QRIS, {
      nominal: amount.toString(),
      taxtype: 'p',
      fee: '0'
    });
    return dynamicQris;
  } catch (error) {
    console.error('Error converting QRIS static to dynamic:', error, 'STATIC_QRIS_VAL:', STATIC_QRIS);
    throw new Error('Gagal memproses QRIS Dinamis');
  }
}

/**
 * Membuat Data URL gambar QR Code dari string QRIS.
 * @param qrisString String QRIS lengkap
 */
export async function generateQRDataURL(qrisString: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(qrisString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 400,
      color: {
        dark: '#0f172a',  // Slate 900 untuk kontras QR
        light: '#ffffff'  // Background putih bersih
      }
    });
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR Code image:', error);
    throw new Error('Gagal men-generate gambar QR Code');
  }
}
