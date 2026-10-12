ALTER TABLE product_variants ADD COLUMN cost_price_toman INTEGER;

ALTER TABLE orders ADD COLUMN margin_min_percent INTEGER;
ALTER TABLE orders ADD COLUMN margin_discount_cap_toman INTEGER;
ALTER TABLE orders ADD COLUMN margin_discount_reduced_toman INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN margin_guard_applied INTEGER NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO store_settings(key,value,updated_at) VALUES
('margin_protection_enabled','0',CURRENT_TIMESTAMP),
('min_gross_margin_percent','0',CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS margin_guard_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL UNIQUE,
  requested_discount_toman INTEGER NOT NULL,
  applied_discount_toman INTEGER NOT NULL,
  discount_cap_toman INTEGER NOT NULL,
  min_margin_percent INTEGER NOT NULL,
  missing_cost_items INTEGER NOT NULL DEFAULT 0,
  below_floor_items INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_margin_guard_events_created ON margin_guard_events(id DESC);
