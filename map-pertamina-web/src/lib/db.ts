import { neon } from '@neondatabase/serverless';

// Menggunakan fallback dummy string saat build-time di Vercel jika env variable belum di-set di dashboard
const connectionString = process.env.NEON_DATABASE_URL || 
                         process.env.DATABASE_URL || 
                         'postgresql://placeholder_user:placeholder_pass@ep-placeholder-pool.ap-southeast-1.aws.neon.tech/neondb';

export const sql = neon(connectionString);
