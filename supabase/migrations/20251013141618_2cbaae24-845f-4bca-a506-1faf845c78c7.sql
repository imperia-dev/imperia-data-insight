-- Marcar protocolo DESP-2025-08-004 como pago
UPDATE public.expense_closing_protocols
SET 
  paid_at = NOW(),
  paid_by = (SELECT id FROM auth.users LIMIT 1),
  payment_amount = 5800.00
WHERE protocol_number = 'DESP-2025-08-004';