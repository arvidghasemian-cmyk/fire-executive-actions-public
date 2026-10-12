ALTER TABLE orders ADD COLUMN status_revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN request_key TEXT;
ALTER TABLE orders ADD COLUMN request_hash TEXT;
CREATE UNIQUE INDEX idx_orders_request_key ON orders(request_key) WHERE request_key IS NOT NULL;
ALTER TABLE order_items ADD COLUMN inventory_deducted INTEGER NOT NULL DEFAULT 0;
UPDATE order_items SET inventory_deducted=quantity WHERE order_id IN(SELECT id FROM orders WHERE inventory_applied=1);
CREATE TABLE order_notes(id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL REFERENCES orders(id),note TEXT NOT NULL,created_at TEXT NOT NULL);
ALTER TABLE discounts ADD COLUMN automatic INTEGER NOT NULL DEFAULT 0;

CREATE TRIGGER order_discount_capacity BEFORE INSERT ON orders WHEN NEW.discount_code IS NOT NULL BEGIN
 SELECT RAISE(ABORT,'discount unavailable') WHERE NOT EXISTS(SELECT 1 FROM discounts WHERE code=NEW.discount_code AND is_active=1 AND (max_uses IS NULL OR used_count<max_uses) AND (starts_at IS NULL OR julianday(starts_at)<=julianday('now')) AND (ends_at IS NULL OR julianday(ends_at)>=julianday('now')));
END;
CREATE TRIGGER order_discount_usage AFTER INSERT ON orders WHEN NEW.discount_code IS NOT NULL BEGIN
 UPDATE discounts SET used_count=used_count+1,updated_at=NEW.created_at WHERE code=NEW.discount_code;
END;
CREATE TRIGGER order_stock_guard BEFORE UPDATE OF status ON orders WHEN NEW.status_revision<>OLD.status_revision AND NEW.status IN('confirmed','ready_to_ship','shipped','closed') AND OLD.inventory_applied=0 BEGIN
 SELECT RAISE(ABORT,'insufficient stock') WHERE EXISTS(SELECT 1 FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=NEW.id AND p.track_inventory=1 GROUP BY p.id HAVING p.stock_qty IS NULL OR p.stock_qty<SUM(oi.quantity));
END;
CREATE TRIGGER order_stock_deduct AFTER UPDATE OF status ON orders WHEN NEW.status_revision<>OLD.status_revision AND NEW.status IN('confirmed','ready_to_ship','shipped','closed') AND OLD.inventory_applied=0 BEGIN
 UPDATE order_items SET inventory_deducted=quantity WHERE order_id=NEW.id AND product_id IN(SELECT id FROM products WHERE track_inventory=1);
 UPDATE products SET stock_qty=stock_qty-(SELECT SUM(inventory_deducted) FROM order_items WHERE order_id=NEW.id AND product_id=products.id),updated_at=NEW.updated_at WHERE id IN(SELECT product_id FROM order_items WHERE order_id=NEW.id AND inventory_deducted>0);
 UPDATE orders SET inventory_applied=1 WHERE id=NEW.id;
END;
CREATE TRIGGER order_stock_restore AFTER UPDATE OF status ON orders WHEN NEW.status_revision<>OLD.status_revision AND NEW.status NOT IN('confirmed','ready_to_ship','shipped','closed') AND OLD.inventory_applied=1 BEGIN
 UPDATE products SET stock_qty=COALESCE(stock_qty,0)+(SELECT SUM(inventory_deducted) FROM order_items WHERE order_id=NEW.id AND product_id=products.id),updated_at=NEW.updated_at WHERE id IN(SELECT product_id FROM order_items WHERE order_id=NEW.id AND inventory_deducted>0);
 UPDATE order_items SET inventory_deducted=0 WHERE order_id=NEW.id;
 UPDATE orders SET inventory_applied=0 WHERE id=NEW.id;
END;
CREATE TRIGGER order_status_log AFTER UPDATE OF status ON orders WHEN NEW.status_revision<>OLD.status_revision AND NEW.status<>OLD.status BEGIN
 INSERT INTO order_status_history(order_id,from_status,to_status,changed_at) VALUES(NEW.id,OLD.status,NEW.status,NEW.updated_at);
 INSERT INTO audit_log(action,entity_type,entity_id,details_json,created_at) VALUES('order.status','order',NEW.id,json_object('from',OLD.status,'to',NEW.status),NEW.updated_at);
END;
CREATE TRIGGER product_stock_log AFTER UPDATE OF stock_qty ON products WHEN NEW.stock_qty IS NOT OLD.stock_qty BEGIN
 INSERT INTO inventory_movements(product_id,delta,reason,note,created_at) VALUES(NEW.id,COALESCE(NEW.stock_qty,0)-COALESCE(OLD.stock_qty,0),'stock_change','تغییر موجودی کالا یا سفارش',NEW.updated_at);
END;
CREATE TRIGGER product_change_log AFTER UPDATE ON products BEGIN
 INSERT INTO audit_log(action,entity_type,entity_id,details_json,created_at) VALUES('product.update','product',NEW.id,json_object('slug',NEW.slug,'old_stock',OLD.stock_qty,'new_stock',NEW.stock_qty,'old_price',OLD.price_toman,'new_price',NEW.price_toman,'active',NEW.is_active),NEW.updated_at);
END;

-- Compatibility during migration-before-deploy: the previous Worker still handles
-- inventory itself. Synchronize its item ledger without double-deducting stock.
CREATE TRIGGER legacy_inventory_ledger AFTER UPDATE OF inventory_applied ON orders
WHEN NEW.status_revision=0 AND OLD.inventory_applied<>NEW.inventory_applied BEGIN
 UPDATE order_items SET inventory_deducted=quantity*NEW.inventory_applied WHERE order_id=NEW.id;
END;
