-- Adicionar foreign keys que estão faltando na tabela protocol_workflow_steps
ALTER TABLE public.protocol_workflow_steps
  ADD CONSTRAINT protocol_workflow_steps_protocol_id_fkey 
  FOREIGN KEY (protocol_id) 
  REFERENCES public.service_provider_protocols(id) 
  ON DELETE CASCADE;

ALTER TABLE public.protocol_workflow_steps
  ADD CONSTRAINT protocol_workflow_steps_assigned_to_fkey 
  FOREIGN KEY (assigned_to) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;