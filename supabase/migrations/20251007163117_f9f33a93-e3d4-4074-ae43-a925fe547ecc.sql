-- Fix search_path security warnings for two functions

-- 1. Fix cleanup_old_backups function
CREATE OR REPLACE FUNCTION public.cleanup_old_backups()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Marcar como deletados backups diários com mais de 30 dias
  UPDATE public.backup_logs
  SET status = 'deleted',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{deleted_at}',
        to_jsonb(now())
      )
  WHERE backup_type = 'daily'
    AND backup_date < CURRENT_DATE - INTERVAL '30 days'
    AND status = 'success';
    
  -- Backups semanais: manter por 3 meses
  UPDATE public.backup_logs
  SET status = 'deleted',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{deleted_at}',
        to_jsonb(now())
      )
  WHERE backup_type = 'weekly'
    AND backup_date < CURRENT_DATE - INTERVAL '3 months'
    AND status = 'success';
    
  -- Backups mensais: manter por 1 ano
  UPDATE public.backup_logs
  SET status = 'deleted',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{deleted_at}',
        to_jsonb(now())
      )
  WHERE backup_type = 'monthly'
    AND backup_date < CURRENT_DATE - INTERVAL '1 year'
    AND status = 'success';
END;
$function$;

-- 2. Fix test_backup function
CREATE OR REPLACE FUNCTION public.test_backup()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
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
$function$;