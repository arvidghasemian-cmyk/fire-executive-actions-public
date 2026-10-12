CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_outbox_order_status_once
ON sms_outbox(order_id, kind, order_status)
WHERE order_id IS NOT NULL AND kind = 'order_status' AND order_status IS NOT NULL;
