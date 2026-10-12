CREATE TABLE IF NOT EXISTS quantity_discount_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('product','category')),
  scope_value TEXT NOT NULL,
  min_quantity INTEGER NOT NULL CHECK(min_quantity >= 2),
  percent_off INTEGER NOT NULL CHECK(percent_off BETWEEN 1 AND 70),
  starts_at TEXT,
  ends_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quantity_discount_scope_qty ON quantity_discount_rules(scope_type,scope_value,min_quantity);
CREATE INDEX IF NOT EXISTS idx_quantity_discount_active ON quantity_discount_rules(is_active,scope_type,scope_value,min_quantity);

CREATE TABLE IF NOT EXISTS sales_bundles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  percent_off INTEGER NOT NULL CHECK(percent_off BETWEEN 1 AND 50),
  starts_at TEXT,
  ends_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_bundles_active ON sales_bundles(is_active,sort_order,id);

CREATE TABLE IF NOT EXISTS sales_bundle_items (
  bundle_id INTEGER NOT NULL,
  product_slug TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity BETWEEN 1 AND 20),
  PRIMARY KEY(bundle_id,product_slug),
  FOREIGN KEY(bundle_id) REFERENCES sales_bundles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sales_bundle_items_slug ON sales_bundle_items(product_slug,bundle_id);

ALTER TABLE orders ADD COLUMN automatic_discount_toman INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN coupon_discount_toman INTEGER;
ALTER TABLE orders ADD COLUMN promotion_kind TEXT;
ALTER TABLE orders ADD COLUMN promotion_ref TEXT;
ALTER TABLE orders ADD COLUMN promotion_label TEXT;
UPDATE orders SET coupon_discount_toman=COALESCE(discount_toman,0) WHERE coupon_discount_toman IS NULL;
