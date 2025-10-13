-- Marcar protocolo DESP-2025-08-003 como pago para teste
UPDATE public.expense_closing_protocols
SET 
  paid_at = NOW(),
  paid_by = (SELECT id FROM auth.users LIMIT 1),
  payment_amount = 1178.00
WHERE protocol_number = 'DESP-2025-08-003';