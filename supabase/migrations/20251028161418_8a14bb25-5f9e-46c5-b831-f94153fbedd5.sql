UPDATE service_provider_protocols 
SET status = 'cancelled', updated_at = now() 
WHERE protocol_number = 'PREST-DIAG-202509-001-HEL'