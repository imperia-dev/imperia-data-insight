-- Tabela para armazenar configurações de KPIs por colaborador
CREATE TABLE public.collaborator_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  kpi_label TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  target_operator TEXT NOT NULL CHECK (target_operator IN ('lte', 'gte', 'eq')),
  unit TEXT NOT NULL DEFAULT '%',
  calculation_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, kpi_name)
);

-- Tabela para histórico mensal de KPIs
CREATE TABLE public.collaborator_kpi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES public.collaborator_kpis(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  actual_value NUMERIC NOT NULL,
  target_value NUMERIC NOT NULL,
  total_base INTEGER,
  total_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(kpi_id, period_start)
);

-- Índices para performance
CREATE INDEX idx_collaborator_kpis_user_id ON public.collaborator_kpis(user_id);
CREATE INDEX idx_collaborator_kpis_active ON public.collaborator_kpis(is_active) WHERE is_active = true;
CREATE INDEX idx_collaborator_kpi_history_kpi_id ON public.collaborator_kpi_history(kpi_id);
CREATE INDEX idx_collaborator_kpi_history_period ON public.collaborator_kpi_history(period_start, period_end);

-- RLS
ALTER TABLE public.collaborator_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborator_kpi_history ENABLE ROW LEVEL SECURITY;

-- Apenas owner pode ver e gerenciar KPIs
CREATE POLICY "Owner can manage collaborator KPIs"
ON public.collaborator_kpis
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owner can manage KPI history"
ON public.collaborator_kpi_history
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Trigger para updated_at
CREATE TRIGGER update_collaborator_kpis_updated_at
BEFORE UPDATE ON public.collaborator_kpis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir KPIs da Aline
INSERT INTO public.collaborator_kpis (user_id, kpi_name, kpi_label, target_value, target_operator, unit, calculation_type, display_order)
VALUES 
  ('f333d9ec-61bf-4181-8c59-904ed3fa4f12', 'taxa_erro', 'Taxa de Erro', 1.0, 'lte', '%', 'error_rate', 1),
  ('f333d9ec-61bf-4181-8c59-904ed3fa4f12', 'taxa_nao_erro', 'Taxa de Não Erro', 1.0, 'lte', '%', 'not_error_rate', 2);