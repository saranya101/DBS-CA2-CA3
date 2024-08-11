BEGIN TRANSACTION;

-- Insert a new sale order item that matches the condition used by T1
INSERT INTO sale_order_item (sale_order_id, product_id, quantity)
VALUES (1, 2, 10);

COMMIT;
