-- Primeiro, vamos dropar as views existentes e recriá-las com security_invoker
DROP VIEW IF EXISTS public.service_provider_costs_masked;
DROP VIEW IF EXISTS public.security_monitoring_dashboard;

-- Recriar a view service_provider_costs_masked com security_invoker
CREATE VIEW public.service_provider_costs_masked
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  email,
  mask_sensitive_string(cpf, 'cpf') as cpf_masked,
  mask_sensitive_string(cnpj, 'cnpj') as cnpj_masked,
  phone,
  mask_sensitive_string(pix_key, 'pix') as pix_key_masked,
  type,
  competence,
  amount,
  days_worked,
  status,
  invoice_number,
  files,
  created_by,
  created_at,
  updated_at
FROM public.service_provider_costs
WHERE get_user_role(auth.uid()) = 'owner'::user_role;

-- Recriar a view security_monitoring_dashboard com security_invoker
CREATE VIEW public.security_monitoring_dashboard
WITH (security_invoker = true) AS
SELECT 
  al.user_id,
  p.full_name as user_name,
  p.role as user_role,
  al.table_name,
  al.operation,
  MIN(al.created_at) as first_access,
  MAX(al.created_at) as last_access,
  COUNT(*) as access_count
FROM public.audit_logs al
LEFT JOIN public.profiles p ON al.user_id = p.id
WHERE get_user_role(auth.uid()) = 'owner'::user_role
GROUP BY al.user_id, p.full_name, p.role, al.table_name, al.operation
ORDER BY last_access DESC;

-- Agora vamos configurar o backup automático usando pg_cron
-- Primeiro, habilitar as extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Configurar o job de backup diário para rodar às 3:00 AM BRT (6:00 AM UTC)
SELECT cron.schedule(
  'daily-backup-job',
  '0 6 * * *', -- Executa todo dia às 6:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://agttqqaampznczkyfvkf.supabase.co/functions/v1/daily-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndHRxcWFhbXB6bmN6a3lmdmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NjQ1NDQsImV4cCI6MjA3MjQ0MDU0NH0.hOsw_3m9GEXC6Je1e-VMt6sjLXU__Xxl1SQepNel218'
    ),
    body := jsonb_build_object(
      'trigger', 'scheduled',
      'timestamp', now()
    )
  );
  $$
);