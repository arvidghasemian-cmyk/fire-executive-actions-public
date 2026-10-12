CREATE TABLE IF NOT EXISTS product_gallery_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_slug TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/webp','image/jpeg','image/png')),
  image_data BLOB NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 1500000),
  original_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(product_slug) REFERENCES products(slug) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_product_gallery_slug_position
ON product_gallery_images(product_slug, position, id);
