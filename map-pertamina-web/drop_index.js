const { neon } = require('@neondatabase/serverless');

async function dropIndex() {
  const sql = neon('postgresql://neondb_owner:npg_blvy5SLgO0ji@ep-plain-fire-aojc3jqt.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
  try {
    await sql`DROP INDEX IF EXISTS idx_unique_pending_amount`;
    console.log('Index dropped successfully.');
  } catch (err) {
    console.error('Error dropping index:', err);
  }
}

dropIndex();
