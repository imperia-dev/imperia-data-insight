-- Adicionar campos para anexo de PDF ao agendamento
ALTER TABLE public.scheduled_messages 
ADD COLUMN IF NOT EXISTS include_pdf BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pdf_period_type TEXT DEFAULT 'current_month' CHECK (pdf_period_type IN ('current_month', 'previous_month', 'current_week', 'previous_week', 'last_7_days', 'last_30_days')),
ADD COLUMN IF NOT EXISTS pdf_customer_filter TEXT DEFAULT 'all';

-- Adicionar coluna para armazenar URL do último PDF gerado nos logs
ALTER TABLE public.scheduled_message_logs
ADD COLUMN IF NOT EXISTS pdf_url TEXT;