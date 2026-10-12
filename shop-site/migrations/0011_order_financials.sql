ALTER TABLE orders ADD COLUMN subtotal_toman INTEGER;
ALTER TABLE orders ADD COLUMN discount_code TEXT;
ALTER TABLE orders ADD COLUMN discount_toman INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN shipping_method TEXT;
ALTER TABLE orders ADD COLUMN shipping_toman INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN tax_toman INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN grand_total_toman INTEGER;
ALTER TABLE orders ADD COLUMN fulfilled_at TEXT;
ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN tracking_url TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone,id DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status,id DESC);
