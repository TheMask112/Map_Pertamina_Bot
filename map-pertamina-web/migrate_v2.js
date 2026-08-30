require('dotenv').config({ path: '.env.migrate' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);
  console.log('🔄 Menjalankan migrasi database v2...');
  
  const schemaPath = path.join(__dirname, 'schema_v2.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  // We'll execute the queries in a simple loop splitting by statements. 
  // Neon serverless supports batch queries but let's do it safely.
  
  await sql(schemaSql);

  console.log('✅ Migrasi v2 selesai!');
}

migrate().catch(e => {
  console.error('❌ Migrasi gagal:', e.message);
  process.exit(1);
});
