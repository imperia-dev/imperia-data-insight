-- Função para sincronizar workflow steps baseado nos dados do protocolo
CREATE OR REPLACE FUNCTION public.sync_protocol_workflow_steps(p_protocol_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_protocol RECORD;
  v_step_order integer := 0;
BEGIN
  -- Buscar dados do protocolo
  SELECT * INTO v_protocol
  FROM public.service_provider_protocols
  WHERE id = p_protocol_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Deletar steps antigos para re-sincronizar
  DELETE FROM public.protocol_workflow_steps
  WHERE protocol_id = p_protocol_id;
  
  -- Step 1: Validação do Prestador
  IF v_protocol.provider_approved_at IS NOT NULL THEN
    v_step_order := v_step_order + 1;
    INSERT INTO public.protocol_workflow_steps (
      protocol_id,
      protocol_type,
      step_name,
      step_order,
      status,
      assigned_to,
      started_at,
      completed_at,
      due_date
    ) VALUES (
      p_protocol_id,
      'service_provider',
      'provider_validation',
      v_step_order,
      'completed',
      v_protocol.service_provider_id,
      v_protocol.created_at,
      v_protocol.provider_approved_at,
      v_protocol.created_at + interval '1 day'
    );
  END IF;
  
  -- Step 2: Aprovação Master Inicial
  IF v_protocol.master_initial_approved_at IS NOT NULL THEN
    v_step_order := v_step_order + 1;
    INSERT INTO public.protocol_workflow_steps (
      protocol_id,
      protocol_type,
      step_name,
      step_order,
      status,
      assigned_to,
      started_at,
      completed_at,
      due_date
    ) VALUES (
      p_protocol_id,
      'service_provider',
      'master_initial_approval',
      v_step_order,
      'completed',
      v_protocol.master_initial_approved_by,
      COALESCE(v_protocol.provider_approved_at, v_protocol.created_at),
      v_protocol.master_initial_approved_at,
      COALESCE(v_protocol.provider_approved_at, v_protocol.created_at) + interval '1 day'
    );
  ELSIF v_protocol.provider_approved_at IS NOT NULL THEN
    -- Se prestador aprovou mas master inicial não, criar step pendente
    v_step_order := v_step_order + 1;
    INSERT INTO public.protocol_workflow_steps (
      protocol_id,
      protocol_type,
      step_name,
      step_order,
      status,
      started_at,
      due_date
    ) VALUES (
      p_protocol_id,
      'service_provider',
      'master_initial_approval',
      v_step_order,
      'pending',
      v_protocol.provider_approved_at,
      v_protocol.provider_approved_at + interval '1 day'
    );
  END IF;
  
  -- Step 3: Aprovação Master Final
  IF v_protocol.master_final_approved_at IS NOT NULL THEN
    v_step_order := v_step_order + 1;
    INSERT INTO public.protocol_workflow_steps (
      protocol_id,
      protocol_type,
      step_name,
      step_order,
      status,
      assigned_to,
      started_at,
      completed_at,
      due_date
    ) VALUES (
      p_protocol_id,
      'service_provider',
      'master_final_approval',
      v_step_order,
      'completed',
      v_protocol.master_final_approved_by,
      COALESCE(v_protocol.master_initial_approved_at, v_protocol.provider_approved_at, v_protocol.created_at),
      v_protocol.master_final_approved_at,
      COALESCE(v_protocol.master_initial_approved_at, v_protocol.provider_approved_at, v_protocol.created_at) + interval '1 day'
    );
  ELSIF v_protocol.master_initial_approved_at IS NOT NULL THEN
    -- Se master inicial aprovou mas master final não, criar step pendente
    v_step_order := v_step_order + 1;
    INSERT INTO public.protocol_workflow_steps (
      protocol_id,
      protocol_type,
      step_name,
      step_order,
      status,
      started_at,
      due_date
    ) VALUES (
      p_protocol_id,
      'service_provider',
      'master_final_approval',
      v_step_order,
      'pending',
      v_protocol.master_initial_approved_at,
      v_protocol.master_initial_approved_at + interval '1 day'
    );
  END IF;
  
  -- Step 4: Aprovação Owner
  IF v_protocol.owner_approved_at IS NOT NULL THEN
    v_step_order := v_step_order + 1;
    INSERT INTO public.protocol_workflow_steps (
      protocol_id,
      protocol_type,
      step_name,
      step_order,
      status,
      assigned_to,
      started_at,
      completed_at,
      due_date
    ) VALUES (
      p_protocol_id,
      'service_provider',
      'owner_approval',
      v_step_order,
      'completed',
      v_protocol.owner_approved_by,
      COALESCE(v_protocol.master_final_approved_at, v_protocol.master_initial_approved_at, v_protocol.provider_approved_at, v_protocol.created_at),
      v_protocol.owner_approved_at,
      COALESCE(v_protocol.master_final_approved_at, v_protocol.master_initial_approved_at, v_protocol.provider_approved_at, v_protocol.created_at) + interval '1 day'
    );
  ELSIF v_protocol.master_final_approved_at IS NOT NULL THEN
    -- Se master final aprovou mas owner não, criar step pendente
    v_step_order := v_step_order + 1;
    INSERT INTO public.protocol_workflow_steps (
      protocol_id,
      protocol_type,
      step_name,
      step_order,
      status,
      started_at,
      due_date
    ) VALUES (
      p_protocol_id,
      'service_provider',
      'owner_approval',
      v_step_order,
      'pending',
      v_protocol.master_final_approved_at,
      v_protocol.master_final_approved_at + interval '1 day'
    );
  END IF;
  
  -- Step 5: Pagamento
  IF v_protocol.paid_at IS NOT NULL THEN
    v_step_order := v_step_order + 1;
    INSERT INTO public.protocol_workflow_steps (
      protocol_id,
      protocol_type,
      step_name,
      step_order,
      status,
      started_at,
      completed_at,
      due_date
    ) VALUES (
      p_protocol_id,
      'service_provider',
      'payment',
      v_step_order,
      'completed',
      COALESCE(v_protocol.owner_approved_at, v_protocol.master_final_approved_at, v_protocol.master_initial_approved_at, v_protocol.provider_approved_at, v_protocol.created_at),
      v_protocol.paid_at,
      COALESCE(v_protocol.owner_approved_at, v_protocol.master_final_approved_at, v_protocol.master_initial_approved_at, v_protocol.provider_approved_at, v_protocol.created_at) + interval '1 day'
    );
  ELSIF v_protocol.owner_approved_at IS NOT NULL THEN
    -- Se owner aprovou mas não foi pago, criar step pendente
    v_step_order := v_step_order + 1;
    INSERT INTO public.protocol_workflow_steps (
      protocol_id,
      protocol_type,
      step_name,
      step_order,
      status,
      started_at,
      due_date
    ) VALUES (
      p_protocol_id,
      'service_provider',
      'payment',
      v_step_order,
      'pending',
      v_protocol.owner_approved_at,
      v_protocol.owner_approved_at + interval '1 day'
    );
  END IF;
END;
$function$;

-- Trigger para sincronizar automaticamente quando protocolo é criado/atualizado
CREATE OR REPLACE FUNCTION public.trigger_sync_protocol_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.sync_protocol_workflow_steps(NEW.id);
  RETURN NEW;
END;
$function$;

-- Criar trigger
DROP TRIGGER IF EXISTS on_protocol_change_sync_workflow ON public.service_provider_protocols;
CREATE TRIGGER on_protocol_change_sync_workflow
  AFTER INSERT OR UPDATE ON public.service_provider_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_protocol_workflow();

-- Sincronizar todos os protocolos existentes
DO $$
DECLARE
  protocol_record RECORD;
BEGIN
  FOR protocol_record IN 
    SELECT id FROM public.service_provider_protocols
  LOOP
    PERFORM public.sync_protocol_workflow_steps(protocol_record.id);
  END LOOP;
END $$;