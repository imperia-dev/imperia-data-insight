-- Add custom date range columns for metrics period
ALTER TABLE public.scheduled_messages 
ADD COLUMN IF NOT EXISTS metrics_period_start date NULL,
ADD COLUMN IF NOT EXISTS metrics_period_end date NULL;