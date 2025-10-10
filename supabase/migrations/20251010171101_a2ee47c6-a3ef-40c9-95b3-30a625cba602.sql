-- Adicionar coluna de motivo de cancelamento nas tabelas de protocolos

-- Tabela service_provider_protocols
ALTER TABLE public.service_provider_protocols
ADD COLUMN IF NOT EXISTS cancelled_reason text;

COMMENT ON COLUMN public.service_provider_protocols.cancelled_reason IS 'Motivo do cancelamento/exclusão do protocolo';

-- Tabela reviewer_protocols  
ALTER TABLE public.reviewer_protocols
ADD COLUMN IF NOT EXISTS cancelled_reason text;

COMMENT ON COLUMN public.reviewer_protocols.cancelled_reason IS 'Motivo do cancelamento/exclusão do protocolo';