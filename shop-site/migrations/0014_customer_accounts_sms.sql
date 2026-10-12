PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customer_accounts (
  phone TEXT PRIMARY KEY,
  name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS customer_otp_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_otp_phone_created ON customer_otp_challenges(phone,created_at DESC);

CREATE TABLE IF NOT EXISTS customer_sessions (
  token_hash TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_phone ON customer_sessions(phone,expires_at);

CREATE TABLE IF NOT EXISTS customer_notification_preferences (
  phone TEXT PRIMARY KEY,
  order_status_sms INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sms_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL,
  kind TEXT NOT NULL,
  order_id INTEGER,
  order_code TEXT,
  order_status TEXT,
  provider TEXT,
  provider_message_id TEXT,
  status TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sms_outbox_phone_created ON sms_outbox(phone,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_outbox_order ON sms_outbox(order_id,created_at DESC);
