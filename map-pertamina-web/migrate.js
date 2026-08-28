require('dotenv').config({ path: '.env.migrate' });
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);

  console.log('🔄 Menjalankan migrasi database...');

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS hwid TEXT`;
  console.log('✅ Kolom hwid ditambahkan');

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS license_key TEXT`;
  console.log('✅ Kolom license_key ditambahkan');

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ`;
  console.log('✅ Kolom redeemed_at ditambahkan');

  await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS kuota_terpakai INTEGER DEFAULT 0`;
  console.log('✅ Kolom kuota_terpakai ditambahkan');

  await sql`CREATE INDEX IF NOT EXISTS idx_orders_hwid ON orders(hwid)`;
  console.log('✅ Index idx_orders_hwid dibuat');

  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'orders' 
    ORDER BY ordinal_position
  `;

  console.log('\n📋 Struktur tabel orders saat ini:');
  cols.forEach(c => console.log('  -', c.column_name, ':', c.data_type));
  console.log('\n🎉 Migrasi selesai!');
}

migrate().catch(e => {
  console.error('❌ Migrasi gagal:', e.message);
  process.exit(1);
});
