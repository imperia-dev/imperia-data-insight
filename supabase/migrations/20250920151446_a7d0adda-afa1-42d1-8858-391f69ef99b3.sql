-- Resetar o protocolo para status 'pending' para permitir novo teste
UPDATE public.closing_protocols
SET 
  payment_status = 'pending',
  payment_requested_at = NULL,
  payment_received_at = NULL,
  payment_amount = NULL,
  receipt_url = NULL,
  updated_at = now()
WHERE payment_status != 'pending' 
  AND payment_received_at IS NULL
  AND receipt_url IS NULL;

-- Opcional: Se quiser resetar TODOS os protocolos que não foram pagos
-- UPDATE public.closing_protocols
-- SET 
--   payment_status = 'pending',
--   payment_requested_at = NULL
-- WHERE payment_status != 'paid';