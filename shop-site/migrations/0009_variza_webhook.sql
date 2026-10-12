PRAGMA foreign_keys = ON;

ALTER TABLE orders ADD COLUMN payment_gateway_amount_toman INTEGER;
ALTER TABLE payment_events ADD COLUMN delivery_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_delivery_id
ON payment_events(delivery_id)
WHERE delivery_id IS NOT NULL;
