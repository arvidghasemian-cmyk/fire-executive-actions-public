PRAGMA foreign_keys = ON;

ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'not_ready';
ALTER TABLE orders ADD COLUMN payable_amount_toman INTEGER;
ALTER TABLE orders ADD COLUMN payment_provider TEXT;
ALTER TABLE orders ADD COLUMN payment_authority TEXT;
ALTER TABLE orders ADD COLUMN payment_reference TEXT;
ALTER TABLE orders ADD COLUMN payment_requested_at TEXT;
ALTER TABLE orders ADD COLUMN payment_paid_at TEXT;
ALTER TABLE orders ADD COLUMN payment_updated_at TEXT;

CREATE TABLE IF NOT EXISTS payment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  provider TEXT,
  authority TEXT,
  reference TEXT,
  amount_toman INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_events_order ON payment_events(order_id,id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status,id DESC);
