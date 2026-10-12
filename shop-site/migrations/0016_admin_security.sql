CREATE TABLE IF NOT EXISTS admin_login_attempts (
  fingerprint TEXT PRIMARY KEY,
  fail_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  locked_until TEXT,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_updated ON admin_login_attempts(updated_at);
