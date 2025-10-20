-- Adicionar campos para o fluxo de envio ao financeiro na tabela reviewer_protocols
ALTER TABLE public.reviewer_protocols 
ADD COLUMN IF NOT EXISTS sent_to_finance_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_to_finance_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES auth.users(id);

-- Criar índice para melhor performance nas consultas por status enviado ao financeiro
CREATE INDEX IF NOT EXISTS idx_reviewer_protocols_sent_to_finance 
ON public.reviewer_protocols(sent_to_finance_at) 
WHERE sent_to_finance_at IS NOT NULL;