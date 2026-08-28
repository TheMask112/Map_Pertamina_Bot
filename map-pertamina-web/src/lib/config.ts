// config.ts
// Product Tier Packages & Licensing Configurations

export interface PaketDetail {
  id: string;
  nama: string;
  kuota: number; // Jumlah tabung NIK
  harga: number; // Harga dalam Rupiah
  hari: number;  // Durasi dalam hari (36500 = Lifetime)
  icon: string;
  desc: string;
  fitur: string[];
}

export const CONFIG = {
  // Region Vercel Deploy (Singapore)
  region: 'sin1',
  
  // Timeout order pending (15 menit dalam milidetik)
  orderTimeoutMs: 15 * 60 * 1000,

  // Midtrans Client-safe settings
  midtrans: {
    clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true' || 
                  Boolean(process.env.MIDTRANS_SERVER_KEY?.startsWith('Mid-server-')) ||
                  Boolean(process.env.MIDTRANS_CLIENT_KEY?.startsWith('Mid-client-')),
    apiUrl: (process.env.MIDTRANS_IS_PRODUCTION === 'true' || 
             Boolean(process.env.MIDTRANS_SERVER_KEY?.startsWith('Mid-server-')) ||
             Boolean(process.env.MIDTRANS_CLIENT_KEY?.startsWith('Mid-client-')))
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2',
    snapUrl: (process.env.MIDTRANS_IS_PRODUCTION === 'true' || 
              Boolean(process.env.MIDTRANS_SERVER_KEY?.startsWith('Mid-server-')) ||
              Boolean(process.env.MIDTRANS_CLIENT_KEY?.startsWith('Mid-client-')))
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions',
    snapJsUrl: (process.env.MIDTRANS_IS_PRODUCTION === 'true' || 
                Boolean(process.env.MIDTRANS_SERVER_KEY?.startsWith('Mid-server-')) ||
                Boolean(process.env.MIDTRANS_CLIENT_KEY?.startsWith('Mid-client-')))
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js',
  },

  
  // List Paket Pembelian Lisensi
  pakets: {
    STARTER: {
      id: 'STARTER',
      nama: 'Starter',
      kuota: 500,
      harga: 75000, // Rp 75.000
      hari: 36500,  // Lifetime
      icon: '🟢',
      desc: 'Paket dasar untuk penggunaan personal atau bisnis kecil. Memproses hingga 500 tabung NIK.',
      fitur: [
        '✔ Kuota 500 Tabung NIK',
        '✔ Masa Aktif Lifetime (Tanpa Batas)',
        '✔ Bypass Captcha Otomatis',
        '✔ Dukungan Multi-Batch Excel',
        '✔ Lisensi Terkunci per HWID'
      ]
    },
    PRO: {
      id: 'PRO',
      nama: 'Pro',
      kuota: 2000,
      harga: 250000, // Rp 250.000 (Hemat 17%)
      hari: 36500,
      icon: '🔵',
      desc: 'Paket populer untuk bisnis menengah. Memproses hingga 2.000 tabung NIK dengan harga lebih hemat.',
      fitur: [
        '✔ Kuota 2.000 Tabung NIK',
        '✔ Masa Aktif Lifetime (Tanpa Batas)',
        '✔ Bypass Captcha Otomatis',
        '✔ Dukungan Multi-Batch Excel',
        '✔ Lisensi Terkunci per HWID',
        '✔ Prioritas Pemrosesan & Update'
      ]
    },
    ENTERPRISE: {
      id: 'ENTERPRISE',
      nama: 'Enterprise',
      kuota: 5000,
      harga: 500000, // Rp 500.000 (Hemat 33%)
      hari: 36500,
      icon: '🟣',
      desc: 'Paket volume besar untuk distributor gas atau agen besar. Memproses hingga 5,000 tabung NIK.',
      fitur: [
        '✔ Kuota 5.000 Tabung NIK',
        '✔ Masa Aktif Lifetime (Tanpa Batas)',
        '✔ Bypass Captcha Otomatis',
        '✔ Dukungan Multi-Batch Excel',
        '✔ Lisensi Terkunci per HWID',
        '✔ Dukungan Teknis Prioritas 24/7'
      ]
    }
  } as Record<string, PaketDetail>
};
