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

    tablesInitialized = true;
    console.log('[DB] Affiliate tables initialized successfully');
  } catch (error) {
    console.error('[DB] Error initializing affiliate tables:', error);
  }
}
