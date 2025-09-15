-- Habilitar RLS na view service_provider_costs_masked
ALTER VIEW public.service_provider_costs_masked SET (security_invoker = on);

-- Criar política para permitir que apenas o owner veja os dados mascarados
CREATE POLICY "Only owner can view masked service provider costs" 
ON public.service_provider_costs_masked 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Habilitar RLS na view security_monitoring_dashboard  
ALTER VIEW public.security_monitoring_dashboard SET (security_invoker = on);

-- Criar política para permitir que apenas o owner veja o dashboard de monitoramento
CREATE POLICY "Only owner can view security monitoring dashboard" 
ON public.security_monitoring_dashboard 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);