CREATE TABLE IF NOT EXISTS pangkalan_profiles (
  id SERIAL PRIMARY KEY,
  whatsapp VARCHAR(20) UNIQUE NOT NULL,
  nama_pangkalan TEXT,
  nama_pemilik TEXT,
  kota TEXT,
  provinsi TEXT,
  alokasi_bulanan INTEGER DEFAULT 0,
  jumlah_pelanggan INTEGER DEFAULT 0,
  platform VARCHAR(20) DEFAULT 'DESKTOP',
  app_version VARCHAR(20),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  total_sesi INTEGER DEFAULT 0,
  total_nik_sukses INTEGER DEFAULT 0,
  total_nik_gagal INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pangkalan_whatsapp ON pangkalan_profiles(whatsapp);
CREATE INDEX IF NOT EXISTS idx_pangkalan_last_active ON pangkalan_profiles(last_active_at);

CREATE TABLE IF NOT EXISTS bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp VARCHAR(20) NOT NULL,
  hwid TEXT,
  platform VARCHAR(20) DEFAULT 'DESKTOP',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INTEGER DEFAULT 0,
  total_nik INTEGER DEFAULT 0,
  nik_sukses INTEGER DEFAULT 0,
  nik_gagal INTEGER DEFAULT 0,
  nik_tidak_terdaftar INTEGER DEFAULT 0,
  nik_kuota_habis INTEGER DEFAULT 0,
  nik_meninggal INTEGER DEFAULT 0,
  nik_dibawah_umur INTEGER DEFAULT 0,
  nik_tidak_aktif INTEGER DEFAULT 0,
  captcha_total INTEGER DEFAULT 0,
  captcha_sukses INTEGER DEFAULT 0,
  jumlah_tabung INTEGER DEFAULT 1,
  avg_seconds_per_nik FLOAT,
  batch_number INTEGER DEFAULT 1,
  app_version VARCHAR(20),
  error_summary TEXT,
  nama_pangkalan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_whatsapp ON bot_sessions(whatsapp);
CREATE INDEX IF NOT EXISTS idx_sessions_ended ON bot_sessions(ended_at);
