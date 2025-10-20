-- Adicionar campo centro_custo_id na tabela reviewer_protocols
ALTER TABLE public.reviewer_protocols 
ADD COLUMN IF NOT EXISTS centro_custo_id UUID REFERENCES public.cost_centers(id);