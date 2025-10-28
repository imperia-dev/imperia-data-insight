
-- Corrigir manualmente as etapas de owner_approval dos protocolos já concluídos
UPDATE protocol_workflow_steps
SET 
  status = 'completed',
  completed_at = NOW()
WHERE id IN (
  '63998ea5-1c3a-46e8-91eb-72253f5a77ec',  -- PREST-DIAG-202509-005-ANA
  '43cd7d8b-74f7-4ff8-b180-9f1b89251608',  -- PREST-DIAG-202509-004-DAP
  'b9ced867-0ded-4660-9e1e-c0e6ec8be501',  -- PREST-DIAG-202509-003-NIC
  '9e43a672-ea0d-4980-9aca-e8f39c0136cb'   -- PREST-DIAG-202509-002-FLA
)
AND step_name = 'owner_approval'
AND status = 'pending';
