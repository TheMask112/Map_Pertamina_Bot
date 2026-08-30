// migrate_v2.mjs — Run: node migrate_v2.mjs
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env.production.local' });

const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: NEON_DATABASE_URL or DATABASE_URL not found');
  process.exit(1);
}

const sql = neon(dbUrl);

// Use tagged template literals as required by @neondatabase/serverless
try {
  console.log('Creating pangkalan_profiles table...');
  await sql`
    CREATE TABLE IF NOT EXISTS pangkalan_profiles (
      id SERIAL PRIMARY KEY,
      whatsapp VARCHAR(20) UNIQUE NOT NULL,
      nama_pangkalan TEXT,
      nama_pemilik TEXT,
      kota TEXT,
      provinsi TEXT,
      alokasi_bulanan INTEGER DEFAULT 0,
      jumlah_pelanggan INTEGER DEFAULT 0,
      platform VARCHAR(20) DEFAULT 'DESKTOP',
      app_version VARCHAR(20),
      last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      total_sesi INTEGER DEFAULT 0,
      total_nik_sukses INTEGER DEFAULT 0,
      total_nik_gagal INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log('✓ pangkalan_profiles created');

  await sql`CREATE INDEX IF NOT EXISTS idx_pangkalan_whatsapp ON pangkalan_profiles(whatsapp)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pangkalan_last_active ON pangkalan_profiles(last_active_at)`;
  console.log('✓ pangkalan_profiles indexes created');

  console.log('Creating bot_sessions table...');
  await sql`
    CREATE TABLE IF NOT EXISTS bot_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      whatsapp VARCHAR(20) NOT NULL,
      hwid TEXT,
      platform VARCHAR(20) DEFAULT 'DESKTOP',
      started_at TIMESTAMP WITH TIME ZONE,
      ended_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      duration_seconds INTEGER DEFAULT 0,
      total_nik INTEGER DEFAULT 0,
      nik_sukses INTEGER DEFAULT 0,
      nik_gagal INTEGER DEFAULT 0,
      nik_tidak_terdaftar INTEGER DEFAULT 0,
      nik_kuota_habis INTEGER DEFAULT 0,
      nik_meninggal INTEGER DEFAULT 0,
      nik_dibawah_umur INTEGER DEFAULT 0,
      nik_tidak_aktif INTEGER DEFAULT 0,
      captcha_total INTEGER DEFAULT 0,
      captcha_sukses INTEGER DEFAULT 0,
      jumlah_tabung INTEGER DEFAULT 1,
      avg_seconds_per_nik FLOAT,
      batch_number INTEGER DEFAULT 1,
      app_version VARCHAR(20),
      error_summary TEXT,
      nama_pangkalan TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log('✓ bot_sessions created');

  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_whatsapp ON bot_sessions(whatsapp)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_ended ON bot_sessions(ended_at)`;
  console.log('✓ bot_sessions indexes created');

  console.log('\n🎉 Migration v2 complete!');
} catch (err) {
  console.error('Migration error:', err);
  process.exit(1);
}
