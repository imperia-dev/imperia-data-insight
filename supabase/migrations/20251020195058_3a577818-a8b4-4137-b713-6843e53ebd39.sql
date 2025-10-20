-- Retornar protocolo PREST-REV-202509-005-UNK para status pending_approval
UPDATE reviewer_protocols
SET 
  status = 'pending_approval',
  paid_at = NULL,
  sent_to_finance_at = NULL,
  sent_to_finance_by = NULL
WHERE protocol_number = 'PREST-REV-202509-005-UNK';