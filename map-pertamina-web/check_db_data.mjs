import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });
config({ path: '.env.production.local' });

const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(dbUrl);

async function check() {
  console.log('--- Checking ALL recent syncs ---');
  try {
    const telemetry = await sql`
      SELECT id, hwid, merchant_name, owner_name, phone, kuota_pertamina_bulanan, sisa_kuota_pertamina, last_sync_at, created_at
      FROM pangkalan_telemetry
      ORDER BY last_sync_at DESC;
    `;
    console.log('=== PANGKALAN TELEMETRY (' + telemetry.length + ' rows) ===');
    console.log(JSON.stringify(telemetry, null, 2));
  } catch (e) {
    console.log('telemetry error:', e.message);
  }

  try {
    const sessions = await sql`
      SELECT * FROM bot_sessions ORDER BY ended_at DESC;
    `;
    console.log('=== BOT SESSIONS (' + sessions.length + ' rows) ===');
    console.log(JSON.stringify(sessions, null, 2));
  } catch (e) {
    console.log('sessions error:', e.message);
  }
}

check();
