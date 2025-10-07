-- Adicionar campos para a nova sequência de aprovações dos protocolos de revisores

-- 1. Adicionar campo para usuário operation responsável pela inserção de dados
ALTER TABLE public.reviewer_protocols 
ADD COLUMN IF NOT EXISTS assigned_operation_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Adicionar campo para data de aprovação do revisor (primeiro step após criação)
ALTER TABLE public.reviewer_protocols 
ADD COLUMN IF NOT EXISTS reviewer_approved_at TIMESTAMPTZ;

-- 3. Adicionar campos de notas para cada etapa
ALTER TABLE public.reviewer_protocols 
ADD COLUMN IF NOT EXISTS reviewer_approval_notes TEXT,
ADD COLUMN IF NOT EXISTS master_initial_notes TEXT,
ADD COLUMN IF NOT EXISTS master_final_notes TEXT,
ADD COLUMN IF NOT EXISTS owner_approval_notes TEXT;

-- 4. Criar comentários explicativos
COMMENT ON COLUMN public.reviewer_protocols.assigned_operation_user_id IS 'Usuário de role operation vinculado na aprovação master inicial para inserir dados';
COMMENT ON COLUMN public.reviewer_protocols.reviewer_approved_at IS 'Data/hora da aprovação do revisor (primeiro step)';

-- 5. Criar índice para buscar por usuário operation
CREATE INDEX IF NOT EXISTS idx_reviewer_protocols_operation_user ON public.reviewer_protocols(assigned_operation_user_id);