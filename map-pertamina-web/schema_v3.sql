-- schema_v3.sql
-- Penambahan Kolom Big Data untuk Pangkalan Telemetry

ALTER TABLE pangkalan_telemetry
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS inbox_alerts TEXT,
ADD COLUMN IF NOT EXISTS ram_usage_mb INTEGER,
ADD COLUMN IF NOT EXISTS ping_ms INTEGER,
ADD COLUMN IF NOT EXISTS logistic_history JSONB,
ADD COLUMN IF NOT EXISTS nik_demographics JSONB;

-- Buat index untuk pencarian spasial sederhana (opsional jika nanti perlu pencarian radius)
CREATE INDEX IF NOT EXISTS idx_telemetry_lat_lng ON pangkalan_telemetry (latitude, longitude);

-- Update bot_sessions untuk menerima telemetri hardware dan lat/lng
ALTER TABLE bot_sessions
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS ram_usage_mb INTEGER,
ADD COLUMN IF NOT EXISTS ping_ms INTEGER;

-- (Opsional) Tabel khusus untuk Riwayat NIK Demografi bila ingin agregasi time-series
CREATE TABLE IF NOT EXISTS nik_demographics_log (
    id SERIAL PRIMARY KEY,
    whatsapp VARCHAR(20) NOT NULL,
    hwid TEXT,
    rumah_tangga INT DEFAULT 0,
    usaha_mikro INT DEFAULT 0,
    petani INT DEFAULT 0,
    nelayan INT DEFAULT 0,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_nik_demo_wa ON nik_demographics_log(whatsapp);
