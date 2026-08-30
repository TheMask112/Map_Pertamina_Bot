const { neon } = require('@neondatabase/serverless');

async function checkOrders() {
  const sql = neon('postgresql://neondb_owner:npg_blvy5SLgO0ji@ep-plain-fire-aojc3jqt.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
  try {
    const orders = await sql`
      SELECT id, status, voucher_code, hwid, license_key, created_at, paket 
      FROM orders 
      WHERE paket != 'CUSTOM' AND status IN ('PAID', 'REDEEMED')
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    console.log('Successful Midtrans orders:', JSON.stringify(orders, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

checkOrders();
