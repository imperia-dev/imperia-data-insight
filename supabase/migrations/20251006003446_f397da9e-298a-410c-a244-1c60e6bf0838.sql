-- Enable required extensions for pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to auto-generate protocols on 1st of each month at 6 AM
SELECT cron.schedule(
  'auto-generate-provider-protocols',
  '0 6 1 * *', -- Every 1st day of month at 6 AM
  $$
  SELECT
    net.http_post(
        url := 'https://agttqqaampznczkyfvkf.supabase.co/functions/v1/generate-provider-protocols',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndHRxcWFhbXB6bmN6a3lmdmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NjQ1NDQsImV4cCI6MjA3MjQ0MDU0NH0.hOsw_3m9GEXC6Je1e-VMt6sjLXU__Xxl1SQepNel218"}'::jsonb,
        body := jsonb_build_object(
          'competence', to_char(date_trunc('month', current_date - interval '1 month'), 'YYYY-MM'),
          'preview', false
        )
    ) as request_id;
  $$
);

-- Create index on documents for faster protocol generation queries
CREATE INDEX IF NOT EXISTS idx_documents_completed_at ON public.documents(completed_at) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_documents_assigned_to ON public.documents(assigned_to) WHERE assigned_to IS NOT NULL;