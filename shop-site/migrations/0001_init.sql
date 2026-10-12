PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'quote',
  price_toman INTEGER,
  stock_qty INTEGER,
  image_url TEXT,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  company TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0 AND quantity <= 20),
  unit_price_toman INTEGER,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category,is_active,sort_order);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

INSERT OR IGNORE INTO products(slug,name,category,status,image_url,sort_order) VALUES
('city-gas-leak-detector','نشت‌یاب گاز شهری','gas-detectors','quote','https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Methane_detectors.jpg/960px-Methane_detectors.jpg',10),
('dry-powder-fire-extinguisher','کپسول آتش نشانی پودر و گاز','fire-extinguishers','quote','https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/A_Fire_Extinguisher.jpg/500px-A_Fire_Extinguisher.jpg',20),
('fire-sprinkler','اسپرینکلر آتش نشانی','sprinklers','quote','https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Fire_Sprinkler.jpg/500px-Fire_Sprinkler.jpg',30),
('fire-alarm-smoke-detector','دتکتور دود اعلام حریق','fire-alarm','quote','https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/Smoke_detector_%281%29.JPG/960px-Smoke_detector_%281%29.JPG',40),
('fire-alarm-heat-detector','دتکتور حرارت اعلام حریق','fire-alarm','quote','https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Heat_detector_IP_101-1A-A3_%28foto01%29.jpg/500px-Heat_detector_IP_101-1A-A3_%28foto01%29.jpg',50),
('fire-alarm-control-panel','پنل اعلام حریق','fire-alarm','quote','https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Fire_alarm_control_panel_VERS-PK_2.jpg/960px-Fire_alarm_control_panel_VERS-PK_2.jpg',60),
('fire-alarm-sounder-beacon','آژیر فلاشر اعلام حریق','fire-alarm','quote','https://upload.wikimedia.org/wikipedia/commons/0/0b/Mircom_Fire_Alarm_HornStrobe_%28crop%29.jpg',70),
('fire-alarm-manual-call-point','شستی اعلام حریق','fire-alarm','quote','https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Fire_alarm_pull_station_Unitest.jpg/500px-Fire_alarm_pull_station_Unitest.jpg',80);
