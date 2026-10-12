PRAGMA foreign_keys = ON;

ALTER TABLE orders ADD COLUMN inventory_applied INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS order_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_status_history(order_id,id);

CREATE TRIGGER IF NOT EXISTS trg_products_stock_nonnegative_update
BEFORE UPDATE OF stock_qty ON products
FOR EACH ROW
WHEN NEW.stock_qty IS NOT NULL AND NEW.stock_qty < 0
BEGIN
  SELECT RAISE(ABORT, 'stock cannot be negative');
END;

CREATE TRIGGER IF NOT EXISTS trg_products_stock_nonnegative_insert
BEFORE INSERT ON products
FOR EACH ROW
WHEN NEW.stock_qty IS NOT NULL AND NEW.stock_qty < 0
BEGIN
  SELECT RAISE(ABORT, 'stock cannot be negative');
END;
