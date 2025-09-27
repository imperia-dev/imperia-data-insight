-- Criar tabela de leads para armazenar dados recebidos via webhook
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  message TEXT,
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para otimização
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_leads_source ON public.leads(source);

-- Habilitar RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança - apenas owner pode visualizar e gerenciar leads
CREATE POLICY "Owner can view leads" 
ON public.leads 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owner can insert leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owner can update leads" 
ON public.leads 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owner can delete leads" 
ON public.leads 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Criar tabela de logs para auditoria de webhooks
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB,
  status_code INTEGER,
  response JSONB,
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET
);

-- Criar índice para busca por data
CREATE INDEX idx_webhook_logs_processed_at ON public.webhook_logs(processed_at DESC);
CREATE INDEX idx_webhook_logs_event_type ON public.webhook_logs(event_type);

-- Habilitar RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança - apenas owner pode visualizar logs
CREATE POLICY "Owner can view webhook logs" 
ON public.webhook_logs 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Trigger para atualizar updated_at na tabela leads
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();