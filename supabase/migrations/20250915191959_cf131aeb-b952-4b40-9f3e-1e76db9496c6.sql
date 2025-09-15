-- Mover extensões do schema public para um schema dedicado
-- Primeiro criar o schema para extensões se ainda não existir
CREATE SCHEMA IF NOT EXISTS extensions;

-- Conceder permissões ao postgres e supabase_admin
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA extensions TO postgres;

-- Remover as extensões do schema public e recriar no schema extensions
DROP EXTENSION IF EXISTS pg_cron CASCADE;
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Recriar as extensões no schema correto
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Reconfigurar o job de backup com o schema correto
SELECT extensions.cron.schedule(
  'daily-backup-job',
  '0 6 * * *', -- Executa todo dia às 6:00 AM UTC
  $$
  SELECT extensions.net.http_post(
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

-- Criar função para teste manual do backup
CREATE OR REPLACE FUNCTION public.test_backup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM extensions.net.http_post(
    url := 'https://agttqqaampznczkyfvkf.supabase.co/functions/v1/daily-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndHRxcWFhbXB6bmN6a3lmdmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NjQ1NDQsImV4cCI6MjA3MjQ0MDU0NH0.hOsw_3m9GEXC6Je1e-VMt6sjLXU__Xxl1SQepNel218'
    ),
    body := jsonb_build_object(
      'trigger', 'manual_test',
      'timestamp', now()
    )
  );
  
  RAISE NOTICE 'Backup test triggered. Check Edge Function logs for results.';
END;
$$;

-- Conceder permissão para owner executar o teste
GRANT EXECUTE ON FUNCTION public.test_backup() TO authenticated;