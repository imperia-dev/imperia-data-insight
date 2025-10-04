-- ============================================================================
-- ETAPA 1: Sistema de Fechamento de Prestadores - Estrutura de Dados
-- ============================================================================

-- 1. EXPANSÃO DA TABELA SUPPLIERS
-- Adicionar campos bancários específicos
ALTER TABLE public.suppliers 
  ADD COLUMN IF NOT EXISTS banco text,
  ADD COLUMN IF NOT EXISTS agencia text,
  ADD COLUMN IF NOT EXISTS conta text,
  ADD COLUMN IF NOT EXISTS tipo_conta text;

-- Constraint para validar tipo de conta
ALTER TABLE public.suppliers 
  DROP CONSTRAINT IF EXISTS valid_tipo_conta;

ALTER TABLE public.suppliers 
  ADD CONSTRAINT valid_tipo_conta 
  CHECK (tipo_conta IS NULL OR tipo_conta IN ('corrente', 'poupanca'));

-- Comentários para documentação
COMMENT ON COLUMN public.suppliers.banco IS 'Nome do banco';
COMMENT ON COLUMN public.suppliers.agencia IS 'Número da agência bancária';
COMMENT ON COLUMN public.suppliers.conta IS 'Número da conta bancária';
COMMENT ON COLUMN public.suppliers.tipo_conta IS 'Tipo de conta: corrente ou poupanca';

-- ============================================================================
-- 2. TABELA SERVICE_PROVIDER_PROTOCOLS (Protocolos Individuais)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.service_provider_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação do protocolo
  protocol_number text NOT NULL UNIQUE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  competence_month date NOT NULL,
  
  -- Dados desnormalizados do prestador (para histórico imutável)
  provider_name text NOT NULL,
  provider_email text NOT NULL,
  provider_cpf text,
  provider_cnpj text,
  provider_pix_key text,
  provider_phone text,
  provider_banco text,
  provider_agencia text,
  provider_conta text,
  provider_tipo_conta text,
  
  -- Totalizadores
  total_amount numeric NOT NULL DEFAULT 0,
  expense_count integer NOT NULL DEFAULT 0,
  
  -- Status do protocolo
  status text NOT NULL DEFAULT 'draft',
  
  -- Dados estruturados das despesas (JSONB)
  expenses_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Token temporário para aprovação do prestador
  provider_token text,
  provider_token_expires_at timestamp with time zone,
  
  -- Aprovação do prestador
  provider_approved_at timestamp with time zone,
  provider_approval_notes text,
  provider_approval_ip inet,
  
  -- Aprovação final (owner)
  final_approved_at timestamp with time zone,
  final_approved_by uuid,
  final_approval_notes text,
  
  -- Pagamento
  paid_at timestamp with time zone,
  payment_reference text,
  payment_batch_id uuid,
  
  -- Metadados
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Auditoria
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints de validação
ALTER TABLE public.service_provider_protocols 
  ADD CONSTRAINT valid_spp_status 
  CHECK (status IN ('draft', 'awaiting_provider', 'provider_approved', 
                    'awaiting_final', 'approved', 'paid', 'delayed', 'cancelled'));

ALTER TABLE public.service_provider_protocols 
  ADD CONSTRAINT valid_token_expiry 
  CHECK (provider_token IS NULL OR provider_token_expires_at > created_at);

ALTER TABLE public.service_provider_protocols 
  ADD CONSTRAINT valid_approval_dates 
  CHECK (final_approved_at IS NULL OR provider_approved_at IS NULL OR 
         final_approved_at >= provider_approved_at);

ALTER TABLE public.service_provider_protocols 
  ADD CONSTRAINT valid_provider_tipo_conta 
  CHECK (provider_tipo_conta IS NULL OR provider_tipo_conta IN ('corrente', 'poupanca'));

-- Comentários
COMMENT ON TABLE public.service_provider_protocols IS 'Protocolos individuais de fechamento por prestador de serviço';
COMMENT ON COLUMN public.service_provider_protocols.expenses_data IS 'Lista estruturada das despesas incluídas no protocolo';
COMMENT ON COLUMN public.service_provider_protocols.provider_token IS 'Token temporário único para aprovação externa do prestador';
COMMENT ON COLUMN public.service_provider_protocols.status IS 'Status: draft, awaiting_provider, provider_approved, awaiting_final, approved, paid, delayed, cancelled';

-- ============================================================================
-- 3. TABELA CONSOLIDATED_PROTOCOLS (Protocolo Consolidado Mensal)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consolidated_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação do protocolo consolidado
  protocol_number text NOT NULL UNIQUE,
  competence_month date NOT NULL,
  
  -- Totalizadores
  total_amount numeric NOT NULL DEFAULT 0,
  provider_count integer NOT NULL DEFAULT 0,
  expense_count integer NOT NULL DEFAULT 0,
  
  -- Status
  status text NOT NULL DEFAULT 'draft',
  
  -- Referências aos protocolos individuais
  service_provider_protocol_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  
  -- Dados agregados (JSONB)
  summary_data jsonb DEFAULT '{}'::jsonb,
  
  -- Aprovação
  approved_at timestamp with time zone,
  approved_by uuid,
  approval_notes text,
  
  -- Pagamento
  paid_at timestamp with time zone,
  payment_reference text,
  payment_batch_id uuid,
  
  -- Metadados
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Auditoria
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints de validação
ALTER TABLE public.consolidated_protocols 
  ADD CONSTRAINT valid_cp_status 
  CHECK (status IN ('draft', 'awaiting_final', 'approved', 'paid', 'cancelled'));

ALTER TABLE public.consolidated_protocols 
  ADD CONSTRAINT unique_competence_month 
  UNIQUE (competence_month);

-- Comentários
COMMENT ON TABLE public.consolidated_protocols IS 'Protocolo consolidado mensal agregando todos os protocolos individuais';
COMMENT ON COLUMN public.consolidated_protocols.service_provider_protocol_ids IS 'Array de IDs dos protocolos individuais incluídos';
COMMENT ON COLUMN public.consolidated_protocols.summary_data IS 'Dados agregados e estatísticas do fechamento mensal';

-- ============================================================================
-- 4. TABELA PROTOCOL_WORKFLOW_STEPS (Histórico de Workflow)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.protocol_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência polimórfica ao protocolo (individual ou consolidado)
  protocol_id uuid NOT NULL,
  protocol_type text NOT NULL,
  
  -- Detalhes do step
  step_name text NOT NULL,
  step_order integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  
  -- Atribuição
  assigned_to uuid,
  assigned_to_email text,
  
  -- Datas
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  due_date timestamp with time zone,
  
  -- Observações
  notes text,
  
  -- Metadados
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Auditoria
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Constraints de validação
ALTER TABLE public.protocol_workflow_steps 
  ADD CONSTRAINT valid_pws_protocol_type 
  CHECK (protocol_type IN ('service_provider', 'consolidated'));

ALTER TABLE public.protocol_workflow_steps 
  ADD CONSTRAINT valid_pws_status 
  CHECK (status IN ('pending', 'in_progress', 'completed', 'delayed', 'cancelled'));

-- Comentários
COMMENT ON TABLE public.protocol_workflow_steps IS 'Histórico detalhado de cada etapa do workflow dos protocolos';
COMMENT ON COLUMN public.protocol_workflow_steps.protocol_type IS 'Tipo de protocolo: service_provider ou consolidated';
COMMENT ON COLUMN public.protocol_workflow_steps.step_order IS 'Ordem sequencial do step no workflow';

-- ============================================================================
-- 5. ATUALIZAÇÃO DA TABELA EXPENSES
-- ============================================================================

-- Adicionar coluna de relacionamento com protocolo de prestador
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS service_provider_protocol_id uuid 
  REFERENCES public.service_provider_protocols(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.expenses.service_provider_protocol_id IS 'Referência ao protocolo de fechamento do prestador';

-- ============================================================================
-- 6. FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para gerar número de protocolo único
CREATE OR REPLACE FUNCTION public.generate_protocol_number(
  p_type text,
  p_competence_month date,
  p_supplier_name text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_year_month text;
  v_sequence integer;
  v_supplier_suffix text;
  v_protocol_number text;
BEGIN
  -- Definir prefixo baseado no tipo
  IF p_type = 'service_provider' THEN
    v_prefix := 'PREST';
  ELSIF p_type = 'consolidated' THEN
    v_prefix := 'CONS';
  ELSE
    RAISE EXCEPTION 'Invalid protocol type: %', p_type;
  END IF;
  
  -- Formato ano-mês
  v_year_month := to_char(p_competence_month, 'YYYYMM');
  
  -- Calcular sequencial do mês
  IF p_type = 'service_provider' THEN
    SELECT COALESCE(MAX(CAST(split_part(protocol_number, '-', 3) AS integer)), 0) + 1
    INTO v_sequence
    FROM public.service_provider_protocols
    WHERE protocol_number LIKE v_prefix || '-' || v_year_month || '-%';
    
    -- Adicionar sufixo do nome do fornecedor (primeiras 3 letras, uppercase)
    IF p_supplier_name IS NOT NULL THEN
      v_supplier_suffix := upper(substring(regexp_replace(p_supplier_name, '[^a-zA-Z]', '', 'g'), 1, 3));
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || 
                          lpad(v_sequence::text, 3, '0') || '-' || v_supplier_suffix;
    ELSE
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || lpad(v_sequence::text, 3, '0');
    END IF;
  ELSE
    -- Para protocolo consolidado, não há sequencial (único por mês)
    v_protocol_number := v_prefix || '-' || v_year_month;
  END IF;
  
  RETURN v_protocol_number;
END;
$$;

COMMENT ON FUNCTION public.generate_protocol_number IS 'Gera número único de protocolo (PREST-YYYYMM-XXX-NOME ou CONS-YYYYMM)';

-- Função para calcular dias úteis entre duas datas
CREATE OR REPLACE FUNCTION public.get_business_days_between(
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_days integer := 0;
  v_current_date date;
  v_day_of_week integer;
BEGIN
  v_current_date := p_start_date::date;
  
  WHILE v_current_date < p_end_date::date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    -- Contar apenas dias úteis (segunda a sexta: 1-5)
    IF v_day_of_week BETWEEN 1 AND 5 THEN
      v_days := v_days + 1;
    END IF;
    
    v_current_date := v_current_date + interval '1 day';
  END LOOP;
  
  RETURN v_days;
END;
$$;

COMMENT ON FUNCTION public.get_business_days_between IS 'Calcula o número de dias úteis entre duas datas (exclui fins de semana)';

-- Função para verificar se um protocolo está atrasado
CREATE OR REPLACE FUNCTION public.is_protocol_delayed(
  p_protocol_id uuid,
  p_current_step text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step_started timestamp with time zone;
  v_business_days integer;
BEGIN
  -- Buscar o step mais recente se não especificado
  IF p_current_step IS NULL THEN
    SELECT started_at INTO v_step_started
    FROM public.protocol_workflow_steps
    WHERE protocol_id = p_protocol_id
      AND status IN ('pending', 'in_progress')
    ORDER BY step_order DESC
    LIMIT 1;
  ELSE
    SELECT started_at INTO v_step_started
    FROM public.protocol_workflow_steps
    WHERE protocol_id = p_protocol_id
      AND step_name = p_current_step
      AND status IN ('pending', 'in_progress')
    LIMIT 1;
  END IF;
  
  -- Se não encontrou step ou não iniciou, não está atrasado
  IF v_step_started IS NULL THEN
    RETURN false;
  END IF;
  
  -- Calcular dias úteis desde o início
  v_business_days := public.get_business_days_between(v_step_started, now());
  
  -- Considerar atrasado se passou mais de 1 dia útil
  RETURN v_business_days > 1;
END;
$$;

COMMENT ON FUNCTION public.is_protocol_delayed IS 'Verifica se um protocolo está atrasado (> 1 dia útil no step atual)';

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.service_provider_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consolidated_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_workflow_steps ENABLE ROW LEVEL SECURITY;

-- Policies para service_provider_protocols
CREATE POLICY "owner_full_access_spp" 
ON public.service_provider_protocols
FOR ALL 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "provider_view_own_spp" 
ON public.service_provider_protocols
FOR SELECT 
USING (
  provider_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
  (provider_token IS NOT NULL AND 
   provider_token = current_setting('app.provider_token', true) AND
   provider_token_expires_at > now())
);

-- Policies para consolidated_protocols
CREATE POLICY "owner_only_consolidated" 
ON public.consolidated_protocols
FOR ALL 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Policies para protocol_workflow_steps
CREATE POLICY "owner_view_all_steps" 
ON public.protocol_workflow_steps
FOR ALL 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "provider_view_own_steps" 
ON public.protocol_workflow_steps
FOR SELECT 
USING (
  protocol_type = 'service_provider' AND
  EXISTS (
    SELECT 1 FROM public.service_provider_protocols spp
    WHERE spp.id = protocol_workflow_steps.protocol_id
    AND spp.provider_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- ============================================================================
-- 8. TRIGGERS PARA AUTO-UPDATE DE updated_at
-- ============================================================================

CREATE TRIGGER update_spp_updated_at 
  BEFORE UPDATE ON public.service_provider_protocols
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cp_updated_at 
  BEFORE UPDATE ON public.consolidated_protocols
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pws_updated_at 
  BEFORE UPDATE ON public.protocol_workflow_steps
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 9. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices para service_provider_protocols
CREATE INDEX IF NOT EXISTS idx_spp_supplier 
  ON public.service_provider_protocols(supplier_id);

CREATE INDEX IF NOT EXISTS idx_spp_competence 
  ON public.service_provider_protocols(competence_month);

CREATE INDEX IF NOT EXISTS idx_spp_status 
  ON public.service_provider_protocols(status);

CREATE INDEX IF NOT EXISTS idx_spp_token 
  ON public.service_provider_protocols(provider_token) 
  WHERE provider_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_spp_created_at 
  ON public.service_provider_protocols(created_at DESC);

-- Índices para consolidated_protocols
CREATE INDEX IF NOT EXISTS idx_cp_competence 
  ON public.consolidated_protocols(competence_month);

CREATE INDEX IF NOT EXISTS idx_cp_status 
  ON public.consolidated_protocols(status);

-- Índices para protocol_workflow_steps
CREATE INDEX IF NOT EXISTS idx_pws_protocol 
  ON public.protocol_workflow_steps(protocol_id, protocol_type);

CREATE INDEX IF NOT EXISTS idx_pws_status 
  ON public.protocol_workflow_steps(status);

CREATE INDEX IF NOT EXISTS idx_pws_assigned 
  ON public.protocol_workflow_steps(assigned_to) 
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pws_step_order 
  ON public.protocol_workflow_steps(protocol_id, step_order);

-- Índice para expenses
CREATE INDEX IF NOT EXISTS idx_expenses_spp 
  ON public.expenses(service_provider_protocol_id) 
  WHERE service_provider_protocol_id IS NOT NULL;

-- ============================================================================
-- MIGRATION COMPLETA
-- ============================================================================