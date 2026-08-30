const { neon } = require('@neondatabase/serverless');

async function resetVoucher() {
  const sql = neon('postgresql://neondb_owner:npg_blvy5SLgO0ji@ep-plain-fire-aojc3jqt.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
  try {
    const res = await sql`UPDATE orders SET status = 'PAID' WHERE voucher_code = 'MAPT94QP' RETURNING id, status, voucher_code`;
    console.log('Reset success:', res);
  } catch (err) {
    console.error('Error:', err);
  }
}

resetVoucher();
