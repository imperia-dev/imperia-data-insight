-- Add metrics_period column to scheduled_messages table
ALTER TABLE public.scheduled_messages 
ADD COLUMN IF NOT EXISTS metrics_period text DEFAULT 'month';

-- Add comment for documentation
COMMENT ON COLUMN public.scheduled_messages.metrics_period IS 'Period for metrics: day or month';