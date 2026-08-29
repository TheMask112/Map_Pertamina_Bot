import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.development.local') });

const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing!");
  process.exit(1);
}

const sql = neon(connectionString);

async function initAffiliateSchema() {
  console.log("Initializing Affiliate Database Schema on Neon PostgreSQL...");

  // 1. Add affiliate columns to orders table
  await sql`
    ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS affiliate_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS affiliate_markup BIGINT DEFAULT 0;
  `;
  console.log("✓ Updated orders table with affiliate columns");

  // 2. Create affiliates table
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
  console.log("✓ Created affiliates table");

  // 3. Create affiliate_commissions table
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
  console.log("✓ Created affiliate_commissions table");

  // 4. Create affiliate_payouts table
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
  console.log("✓ Created affiliate_payouts table");

  console.log("ALL SCHEMA MIGRATIONS COMPLETED SUCCESSFULLY! 🎉");
}

initAffiliateSchema().catch(console.error);
