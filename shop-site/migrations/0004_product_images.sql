CREATE TABLE IF NOT EXISTS product_images (
  product_slug TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/webp','image/jpeg','image/png')),
  image_data BLOB NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 1500000),
  original_name TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(product_slug) REFERENCES products(slug) ON DELETE CASCADE
);
