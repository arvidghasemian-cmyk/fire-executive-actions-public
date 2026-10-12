PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customer_wishlist (
  phone TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(phone, product_id),
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_wishlist_phone_created
ON customer_wishlist(phone, created_at DESC);
