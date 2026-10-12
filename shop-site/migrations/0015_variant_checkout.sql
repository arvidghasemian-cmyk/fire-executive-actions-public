ALTER TABLE order_items ADD COLUMN variant_id INTEGER REFERENCES product_variants(id);
ALTER TABLE order_items ADD COLUMN variant_title TEXT;
ALTER TABLE order_items ADD COLUMN variant_sku TEXT;
CREATE INDEX IF NOT EXISTS idx_order_items_variant ON order_items(variant_id) WHERE variant_id IS NOT NULL;

DROP TRIGGER IF EXISTS order_stock_guard;
DROP TRIGGER IF EXISTS order_stock_deduct;
DROP TRIGGER IF EXISTS order_stock_restore;

CREATE TRIGGER order_stock_guard BEFORE UPDATE OF status ON orders
WHEN NEW.status_revision<>OLD.status_revision
 AND NEW.status IN('confirmed','ready_to_ship','shipped','closed')
 AND OLD.inventory_applied=0
BEGIN
 SELECT RAISE(ABORT,'insufficient stock') WHERE EXISTS(
   SELECT 1
   FROM order_items oi
   JOIN products p ON p.id=oi.product_id
   LEFT JOIN product_variants v ON v.id=oi.variant_id
   WHERE oi.order_id=NEW.id AND p.track_inventory=1 AND p.allow_backorder=0
   GROUP BY oi.product_id,oi.variant_id
   HAVING MAX(CASE WHEN oi.variant_id IS NULL THEN p.stock_qty ELSE v.stock_qty END) IS NULL
      OR MAX(CASE WHEN oi.variant_id IS NULL THEN p.stock_qty ELSE v.stock_qty END)<SUM(oi.quantity)
 );
END;

CREATE TRIGGER order_stock_deduct AFTER UPDATE OF status ON orders
WHEN NEW.status_revision<>OLD.status_revision
 AND NEW.status IN('confirmed','ready_to_ship','shipped','closed')
 AND OLD.inventory_applied=0
BEGIN
 UPDATE order_items SET inventory_deducted=quantity
 WHERE order_id=NEW.id AND product_id IN(SELECT id FROM products WHERE track_inventory=1);

 UPDATE product_variants
 SET stock_qty=CASE WHEN stock_qty IS NULL THEN NULL ELSE stock_qty-(SELECT COALESCE(SUM(oi.inventory_deducted),0) FROM order_items oi WHERE oi.order_id=NEW.id AND oi.variant_id=product_variants.id) END,
     updated_at=NEW.updated_at
 WHERE id IN(SELECT variant_id FROM order_items WHERE order_id=NEW.id AND variant_id IS NOT NULL AND inventory_deducted>0);

 UPDATE products
 SET stock_qty=CASE WHEN stock_qty IS NULL THEN NULL ELSE stock_qty-(SELECT COALESCE(SUM(oi.inventory_deducted),0) FROM order_items oi WHERE oi.order_id=NEW.id AND oi.product_id=products.id AND oi.variant_id IS NULL) END,
     updated_at=NEW.updated_at
 WHERE id IN(SELECT product_id FROM order_items WHERE order_id=NEW.id AND variant_id IS NULL AND inventory_deducted>0);

 UPDATE orders SET inventory_applied=1 WHERE id=NEW.id;
END;

CREATE TRIGGER order_stock_restore AFTER UPDATE OF status ON orders
WHEN NEW.status_revision<>OLD.status_revision
 AND NEW.status NOT IN('confirmed','ready_to_ship','shipped','closed')
 AND OLD.inventory_applied=1
BEGIN
 UPDATE product_variants
 SET stock_qty=CASE WHEN stock_qty IS NULL THEN NULL ELSE stock_qty+(SELECT COALESCE(SUM(oi.inventory_deducted),0) FROM order_items oi WHERE oi.order_id=NEW.id AND oi.variant_id=product_variants.id) END,
     updated_at=NEW.updated_at
 WHERE id IN(SELECT variant_id FROM order_items WHERE order_id=NEW.id AND variant_id IS NOT NULL AND inventory_deducted>0);

 UPDATE products
 SET stock_qty=CASE WHEN stock_qty IS NULL THEN NULL ELSE stock_qty+(SELECT COALESCE(SUM(oi.inventory_deducted),0) FROM order_items oi WHERE oi.order_id=NEW.id AND oi.product_id=products.id AND oi.variant_id IS NULL) END,
     updated_at=NEW.updated_at
 WHERE id IN(SELECT product_id FROM order_items WHERE order_id=NEW.id AND variant_id IS NULL AND inventory_deducted>0);

 UPDATE order_items SET inventory_deducted=0 WHERE order_id=NEW.id;
 UPDATE orders SET inventory_applied=0 WHERE id=NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS variant_stock_log AFTER UPDATE OF stock_qty ON product_variants
WHEN NEW.stock_qty IS NOT OLD.stock_qty
BEGIN
 INSERT INTO inventory_movements(product_id,variant_id,delta,reason,note,created_at)
 VALUES(NEW.product_id,NEW.id,COALESCE(NEW.stock_qty,0)-COALESCE(OLD.stock_qty,0),'variant_stock_change','تغییر موجودی تنوع کالا یا سفارش',NEW.updated_at);
END;
