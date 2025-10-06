-- Criar função security definer para obter email do usuário
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = user_id;
$$;

-- Dropar a policy antiga
DROP POLICY IF EXISTS "provider_view_own_spp" ON public.service_provider_protocols;

-- Criar nova policy usando a função
CREATE POLICY "provider_view_own_spp" 
ON public.service_provider_protocols
FOR SELECT
USING (
  (provider_email = public.get_user_email(auth.uid())) 
  OR 
  (provider_token IS NOT NULL 
   AND provider_token = current_setting('app.provider_token', true) 
   AND provider_token_expires_at > now())
);

-- Verificar outras tabelas com policies similares
DROP POLICY IF EXISTS "owner_only_consolidated" ON public.consolidated_protocols;

CREATE POLICY "owner_only_consolidated" 
ON public.consolidated_protocols
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Policy para protocol_workflow_steps
DROP POLICY IF EXISTS "owner_manage_workflow" ON public.protocol_workflow_steps;

CREATE POLICY "owner_manage_workflow" 
ON public.protocol_workflow_steps
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Policy para protocol_history
DROP POLICY IF EXISTS "owner_view_history" ON public.protocol_history;

CREATE POLICY "owner_view_history" 
ON public.protocol_history
FOR SELECT
USING (get_user_role(auth.uid()) = 'owner'::user_role);