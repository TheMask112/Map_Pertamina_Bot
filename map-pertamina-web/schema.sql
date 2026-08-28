-- schema.sql
-- Neon PostgreSQL Database Schema for Map Pertamina Licensing Web App

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paket VARCHAR(20) NOT NULL,
  base_amount INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, EXPIRED, REDEEMED
  voucher_code VARCHAR(8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP WITH TIME ZONE,
  redeemed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  kuota_terpakai INTEGER DEFAULT 0,
  hwid TEXT,
  license_key TEXT
);

-- Index nominal unik untuk mempercepat deteksi pembayaran dan mencegah kolisi data
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_amount 
  ON orders (amount) 
  WHERE status = 'PENDING';

-- Index kode voucher untuk pencarian cepat saat redeem via Telegram
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_voucher 
  ON orders (voucher_code) 
  WHERE voucher_code IS NOT NULL;

-- Index status untuk efisiensi kueri monitoring
CREATE INDEX IF NOT EXISTS idx_status ON orders (status);

-- Tabel hubungan Chat ID Telegram dengan WhatsApp pangkalan
CREATE TABLE IF NOT EXISTS telegram_links (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  whatsapp VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT telegram_links_chat_id_whatsapp_key UNIQUE (chat_id, whatsapp)
);

-- Tabel antrean perintah kendali jarak jauh (remote control)
CREATE TABLE IF NOT EXISTS telegram_commands (
  whatsapp VARCHAR(20) PRIMARY KEY,
  command VARCHAR(20) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel status/state percakapan pembuatan lisensi keygen bot
CREATE TABLE IF NOT EXISTS keygen_states (
  chat_id BIGINT PRIMARY KEY,
  step VARCHAR(50) NOT NULL,
  voucher VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

