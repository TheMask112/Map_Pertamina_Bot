-- migrate_add_hwid_licensekey.sql
-- Jalankan sekali di Neon/PostgreSQL untuk menambahkan kolom yang dibutuhkan
-- oleh fitur auto-aktivasi lisensi lintas platform

ALTER TABLE orders ADD COLUMN IF NOT EXISTS hwid TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS license_key TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;

-- Index untuk mempercepat lookup berdasarkan hwid (admin view)
CREATE INDEX IF NOT EXISTS idx_orders_hwid ON orders(hwid);

-- Tampilkan struktur tabel setelah migrasi
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
