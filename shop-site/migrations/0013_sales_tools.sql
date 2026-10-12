CREATE TABLE IF NOT EXISTS product_sales_tools (
  product_slug TEXT PRIMARY KEY,
  datasheet_url TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(product_slug) REFERENCES products(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_sales_tools_updated_at
ON product_sales_tools(updated_at);
