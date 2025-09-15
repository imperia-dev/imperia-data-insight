-- Criar cron job para backup diário às 2:00 AM (horário de Brasília)
-- Nota: 5:00 UTC = 2:00 BRT

-- Primeiro, verificar se o cron job já existe
DO $$
BEGIN
  -- Deletar job se já existir
  PERFORM cron.unschedule('daily-backup-job');
EXCEPTION
  WHEN OTHERS THEN
    -- Ignorar erro se o job não existir
    NULL;
END
$$;

-- Criar o novo cron job
SELECT cron.schedule(
  'daily-backup-job',
  '0 5 * * *', -- 5:00 AM UTC = 2:00 AM BRT
  $$
  SELECT net.http_post(
    url:='https://agttqqaampznczkyfvkf.supabase.co/functions/v1/daily-backup',
    headers:=jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndHRxcWFhbXB6bmN6a3lmdmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NjQ1NDQsImV4cCI6MjA3MjQ0MDU0NH0.hOsw_3m9GEXC6Je1e-VMt6sjLXU__Xxl1SQepNel218',
      'Content-Type', 'application/json'
    ),
    body:=jsonb_build_object(
      'backup_type', 'daily',
      'timestamp', now()::text
    )
  ) as request_id;
  $$
);

-- Criar job para limpeza semanal de backups antigos
SELECT cron.schedule(
  'cleanup-old-backups-job',
  '0 3 * * 0', -- Domingos às 3:00 AM UTC
  $$
  SELECT public.cleanup_old_backups();
  $$
);

-- Adicionar comentário para documentação
COMMENT ON EXTENSION pg_cron IS 'Scheduler para backups automáticos do sistema';