-- Dropar policy antiga que causa erro de permissão
DROP POLICY IF EXISTS provider_view_own_steps ON protocol_workflow_steps;

-- Criar nova policy usando auth.email() para comparação segura
CREATE POLICY "provider_view_own_steps" ON protocol_workflow_steps
FOR SELECT
USING (
  (protocol_type = 'service_provider') 
  AND (EXISTS (
    SELECT 1
    FROM service_provider_protocols spp
    WHERE spp.id = protocol_workflow_steps.protocol_id
      AND spp.provider_email = auth.email()
  ))
);