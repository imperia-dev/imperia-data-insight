-- Retornar pedido bdfefd para disponível
UPDATE orders 
SET 
  status_order = 'available',
  assigned_to = NULL,
  assigned_at = NULL
WHERE order_number ILIKE '%bdfefd%';