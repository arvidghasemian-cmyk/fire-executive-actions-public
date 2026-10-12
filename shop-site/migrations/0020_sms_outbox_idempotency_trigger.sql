DROP INDEX IF EXISTS uq_sms_outbox_order_status_once;

CREATE TRIGGER IF NOT EXISTS trg_sms_outbox_order_status_once
BEFORE INSERT ON sms_outbox
WHEN NEW.order_id IS NOT NULL
  AND NEW.kind = 'order_status'
  AND NEW.order_status IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM sms_outbox
    WHERE order_id = NEW.order_id
      AND kind = 'order_status'
      AND order_status = NEW.order_status
  )
BEGIN
  SELECT RAISE(IGNORE);
END;
