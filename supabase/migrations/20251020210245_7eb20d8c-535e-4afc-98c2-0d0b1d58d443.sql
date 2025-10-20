
-- Retornar protocolos para status inicial (draft)
UPDATE reviewer_protocols 
SET status = 'draft', updated_at = now()
WHERE protocol_number = 'PREST-REV-202509-005-UNK';

UPDATE service_provider_protocols 
SET status = 'draft', updated_at = now()
WHERE protocol_number = 'PREST-DIAG-202509-006-ALE';
