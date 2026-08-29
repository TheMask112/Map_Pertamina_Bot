import { neon } from '@neondatabase/serverless';

// Menggunakan fallback dummy string saat build-time di Vercel jika env variable belum di-set di dashboard
const connectionString = process.env.NEON_DATABASE_URL || 
                         process.env.DATABASE_URL || 
                         'postgresql://placeholder_user:placeholder_pass@ep-placeholder-pool.ap-southeast-1.aws.neon.tech/neondb';

export const sql = neon(connectionString);

let tablesInitialized = false;

export async function ensureAffiliateTables() {
  if (tablesInitialized) return;
  try {
    // 1. Tambah kolom affiliate & customer profile ke tabel orders jika belum ada
    await sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS affiliate_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS affiliate_markup BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS pangkalan_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50);
    `;

    // 2. Buat tabel affiliates
    await sql`
      CREATE TABLE IF NOT EXISTS affiliates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        whatsapp VARCHAR(25) UNIQUE NOT NULL,
        pin_hash VARCHAR(255) NOT NULL,
        markup_percent INT DEFAULT 10,
        bank_name VARCHAR(50),
        bank_account_number VARCHAR(50),
        bank_account_name VARCHAR(100),
        hwid VARCHAR(100),
        total_earnings BIGINT DEFAULT 0,
        withdrawn_amount BIGINT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 3. Buat tabel affiliate_commissions
    await sql`
      CREATE TABLE IF NOT EXISTS affiliate_commissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID UNIQUE NOT NULL,
        affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
        base_amount BIGINT NOT NULL,
        gross_amount BIGINT NOT NULL,
        gateway_fee BIGINT NOT NULL,
        net_commission BIGINT NOT NULL,
        status VARCHAR(20) DEFAULT 'AVAILABLE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 4. Buat tabel affiliate_payouts
    await sql`
      CREATE TABLE IF NOT EXISTS affiliate_payouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
        amount BIGINT NOT NULL,
        bank_name VARCHAR(50) NOT NULL,
        bank_account_number VARCHAR(50) NOT NULL,
        bank_account_name VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP WITH TIME ZONE
      );
    `;

    // 5. Buat tabel pangkalan_telemetry (Data Intelijen Pangkalan & Device)
    await sql`
      CREATE TABLE IF NOT EXISTS pangkalan_telemetry (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        hwid VARCHAR(100) NOT NULL,
        license_key VARCHAR(100),
        merchant_id VARCHAR(50),
        merchant_name VARCHAR(200),
        owner_name VARCHAR(150),
        agent_id VARCHAR(50),
        agent_name VARCHAR(200),
        phone VARCHAR(30),
        email VARCHAR(100),
        address TEXT,
        kelurahan VARCHAR(100),
        kecamatan VARCHAR(100),
        kota_kabupaten VARCHAR(100),
        provinsi VARCHAR(100),
        kodepos VARCHAR(20),
        kuota_pertamina_bulanan INT DEFAULT 0,
        sisa_kuota_pertamina INT DEFAULT 0,
        total_penjualan_pertamina INT DEFAULT 0,
        het_daerah BIGINT DEFAULT 19000,
        estimasi_omset_bulanan BIGINT DEFAULT 0,
        estimasi_laba_bulanan BIGINT DEFAULT 0,
        modal_tebus_per_do BIGINT DEFAULT 0,
        jadwal_pasokan VARCHAR(100) DEFAULT 'Selasa & Jumat',
        total_konsumen_unik INT DEFAULT 0,
        persen_dtks INT DEFAULT 70,
        skor_kepatuhan INT DEFAULT 98,
        anomali_overlimit_count INT DEFAULT 0,
        metode_bayar_tunai_persen INT DEFAULT 85,
        metode_bayar_qris_persen INT DEFAULT 15,
        avg_speed_seconds NUMERIC(4, 2) DEFAULT 3.8,
        peak_hours VARCHAR(50) DEFAULT '14:00 - 17:00 WIB',
        device_model VARCHAR(150),
        device_os VARCHAR(100),
        platform VARCHAR(20),
        app_version VARCHAR(20),
        ip_address VARCHAR(50),
        isp VARCHAR(100),
        total_nik_processed INT DEFAULT 0,
        success_count INT DEFAULT 0,
        invalid_count INT DEFAULT 0,
        persen_rumah_tangga INT DEFAULT 0,
        persen_usaha_mikro INT DEFAULT 0,
        last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_hwid_merchant UNIQUE(hwid, merchant_id)
      );
    `;

    // Pastikan kolom baru ter-apply jika tabel sudah terbuat sebelumnya
    await sql`
      ALTER TABLE pangkalan_telemetry
      ADD COLUMN IF NOT EXISTS modal_tebus_per_do BIGINT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS jadwal_pasokan VARCHAR(100) DEFAULT 'Selasa & Jumat',
      ADD COLUMN IF NOT EXISTS total_konsumen_unik INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS persen_dtks INT DEFAULT 70,
      ADD COLUMN IF NOT EXISTS skor_kepatuhan INT DEFAULT 98,
      ADD COLUMN IF NOT EXISTS anomali_overlimit_count INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS metode_bayar_tunai_persen INT DEFAULT 85,
      ADD COLUMN IF NOT EXISTS metode_bayar_qris_persen INT DEFAULT 15,
      ADD COLUMN IF NOT EXISTS avg_speed_seconds NUMERIC(4, 2) DEFAULT 3.8,
      ADD COLUMN IF NOT EXISTS peak_hours VARCHAR(50) DEFAULT '14:00 - 17:00 WIB';
    `;

    tablesInitialized = true;
    console.log('[DB] Affiliate & Telemetry tables initialized successfully');
  } catch (error) {
    console.error('[DB] Error initializing tables:', error);
  }
}
