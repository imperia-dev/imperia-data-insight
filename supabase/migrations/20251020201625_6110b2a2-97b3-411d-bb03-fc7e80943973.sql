-- Return protocol PREST-REV-202509-005-UNK to Novos tab
UPDATE public.reviewer_protocols
SET status = 'pending_approval'
WHERE protocol_number = 'PREST-REV-202509-005-UNK';