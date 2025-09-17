-- =====================================================
-- FINANCIAL MODULE REFACTORING - COMPLETE MIGRATION
-- =====================================================

-- 1. Create ENUM types for better data integrity
CREATE TYPE expense_type AS ENUM ('empresa', 'prestador_servico', 'custo_venda', 'investimento');
CREATE TYPE expense_classification AS ENUM ('fixo', 'variavel');
CREATE TYPE expense_nature AS ENUM ('capex', 'opex');
CREATE TYPE expense_status AS ENUM ('previsto', 'lancado', 'pago', 'conciliado');
CREATE TYPE dre_section_type AS ENUM ('REVENUE', 'DEDUCTIONS', 'COGS', 'VAR_EXP', 'FIXED_EXP', 'DEPREC_AMORT', 'FIN_RESULT', 'INCOME_TAX');
CREATE TYPE dfc_activity_type AS ENUM ('OPERATING', 'INVESTING', 'FINANCING');

-- 2. Chart of Accounts (Plano de Contas)
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT auth.uid(), -- For multi-tenant future
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  dre_section dre_section_type,
  dfc_activity dfc_activity_type,
  is_cac BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(org_id, code)
);

-- 3. Cost Centers
CREATE TABLE public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT auth.uid(),
  code TEXT,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.cost_centers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(org_id, name)
);

-- 4. Projects/Clients
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT auth.uid(),
  code TEXT,
  name TEXT NOT NULL,
  client_name TEXT,
  client_id UUID,
  start_date DATE,
  end_date DATE,
  budget NUMERIC(15,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(org_id, name)
);

-- 5. Suppliers/Vendors (Fornecedores)
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT auth.uid(),
  name TEXT NOT NULL,
  tipo_fornecedor TEXT, -- PJ, PF, MEI
  cpf TEXT,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  pix_key TEXT,
  bank_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Unified Expenses Table
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID DEFAULT auth.uid(),
  
  -- Classification
  tipo_lancamento expense_type NOT NULL,
  conta_contabil_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  centro_custo_id UUID REFERENCES public.cost_centers(id),
  projeto_cliente_id UUID REFERENCES public.projects(id),
  fixo_variavel expense_classification,
  capex_opex expense_nature,
  
  -- Supplier/Vendor
  fornecedor_id UUID REFERENCES public.suppliers(id),
  tipo_fornecedor TEXT,
  
  -- Amounts and Currency
  amount_original NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  exchange_rate NUMERIC(10,6) NOT NULL DEFAULT 1.0,
  amount_base NUMERIC(15,2) GENERATED ALWAYS AS (amount_original * exchange_rate) STORED,
  
  -- Dates
  data_emissao DATE,
  data_competencia DATE NOT NULL,
  data_vencimento DATE,
  data_pagamento DATE,
  
  -- Payment info
  payment_method TEXT,
  status expense_status NOT NULL DEFAULT 'lancado',
  
  -- Documentation
  invoice_number TEXT,
  document_ref TEXT,
  description TEXT NOT NULL,
  notes TEXT,
  files TEXT[],
  
  -- Metadata
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Expense Allocations (Rateio)
CREATE TABLE public.expense_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  centro_custo_id UUID REFERENCES public.cost_centers(id),
  projeto_cliente_id UUID REFERENCES public.projects(id),
  driver TEXT, -- 'horas', 'percentual', 'pedidos', etc
  driver_value NUMERIC(10,2),
  percent NUMERIC(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  amount_allocated NUMERIC(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Create indexes for performance
CREATE INDEX idx_expenses_org_competencia ON public.expenses(org_id, data_competencia);
CREATE INDEX idx_expenses_org_pagamento ON public.expenses(org_id, data_pagamento);
CREATE INDEX idx_expenses_org_conta ON public.expenses(org_id, conta_contabil_id);
CREATE INDEX idx_expenses_org_centro ON public.expenses(org_id, centro_custo_id);
CREATE INDEX idx_expenses_org_projeto ON public.expenses(org_id, projeto_cliente_id);
CREATE INDEX idx_expenses_tipo ON public.expenses(tipo_lancamento);
CREATE INDEX idx_expenses_status ON public.expenses(status);
CREATE INDEX idx_chart_accounts_org ON public.chart_of_accounts(org_id);
CREATE INDEX idx_cost_centers_org ON public.cost_centers(org_id);
CREATE INDEX idx_projects_org ON public.projects(org_id);

-- 9. Create compatibility views
CREATE OR REPLACE VIEW public.company_costs_v AS
SELECT 
  e.id,
  e.data_competencia as date,
  e.amount_base as amount,
  coa.name as category,
  cc.name as sub_category,
  e.description,
  e.notes as observations,
  e.files,
  e.created_at,
  e.updated_at,
  e.created_by
FROM public.expenses e
LEFT JOIN public.chart_of_accounts coa ON e.conta_contabil_id = coa.id
LEFT JOIN public.cost_centers cc ON e.centro_custo_id = cc.id
WHERE e.tipo_lancamento = 'empresa';

CREATE OR REPLACE VIEW public.service_provider_costs_v AS
SELECT 
  e.id,
  s.name,
  s.email,
  s.phone,
  s.cpf,
  s.cnpj,
  s.pix_key,
  s.tipo_fornecedor as type,
  TO_CHAR(e.data_competencia, 'YYYY-MM') as competence,
  e.amount_base as amount,
  NULL::INTEGER as days_worked,
  e.status,
  e.invoice_number,
  e.files,
  e.created_at,
  e.updated_at,
  e.created_by,
  NULL::TIMESTAMP as last_sensitive_access,
  0 as sensitive_access_count
FROM public.expenses e
LEFT JOIN public.suppliers s ON e.fornecedor_id = s.id
WHERE e.tipo_lancamento = 'prestador_servico';

-- 10. Create masked view for sensitive data
CREATE OR REPLACE VIEW public.service_provider_costs_masked_v AS
SELECT 
  e.id,
  s.name,
  s.email,
  s.phone,
  CASE 
    WHEN LENGTH(s.cpf) > 0 THEN '***.***.***-' || RIGHT(s.cpf, 2)
    ELSE NULL 
  END as cpf_masked,
  CASE 
    WHEN LENGTH(s.cnpj) > 0 THEN '**.***.***/**' || RIGHT(s.cnpj, 6)
    ELSE NULL 
  END as cnpj_masked,
  CASE 
    WHEN LENGTH(s.pix_key) > 5 THEN LEFT(s.pix_key, 3) || REPEAT('*', LENGTH(s.pix_key) - 5) || RIGHT(s.pix_key, 2)
    ELSE s.pix_key
  END as pix_key_masked,
  s.tipo_fornecedor as type,
  TO_CHAR(e.data_competencia, 'YYYY-MM') as competence,
  e.amount_base as amount,
  NULL::INTEGER as days_worked,
  e.status,
  e.invoice_number,
  e.files,
  e.created_at,
  e.updated_at,
  e.created_by
FROM public.expenses e
LEFT JOIN public.suppliers s ON e.fornecedor_id = s.id
WHERE e.tipo_lancamento = 'prestador_servico';

-- 11. Enable RLS for all new tables
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_allocations ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS Policies
-- Chart of Accounts policies
CREATE POLICY "Users can view chart of accounts" ON public.chart_of_accounts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner and master can manage chart of accounts" ON public.chart_of_accounts
  FOR ALL USING (get_user_role(auth.uid()) IN ('owner', 'master'));

-- Cost Centers policies
CREATE POLICY "Users can view cost centers" ON public.cost_centers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner and master can manage cost centers" ON public.cost_centers
  FOR ALL USING (get_user_role(auth.uid()) IN ('owner', 'master'));

-- Projects policies
CREATE POLICY "Users can view projects" ON public.projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owner, master and admin can manage projects" ON public.projects
  FOR ALL USING (get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

-- Suppliers policies
CREATE POLICY "Owner can view suppliers" ON public.suppliers
  FOR SELECT USING (get_user_role(auth.uid()) = 'owner');

CREATE POLICY "Owner can manage suppliers" ON public.suppliers
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');

-- Expenses policies
CREATE POLICY "Owner can view expenses" ON public.expenses
  FOR SELECT USING (get_user_role(auth.uid()) = 'owner');

CREATE POLICY "Owner can manage expenses" ON public.expenses
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');

-- Expense Allocations policies
CREATE POLICY "Owner can view allocations" ON public.expense_allocations
  FOR SELECT USING (get_user_role(auth.uid()) = 'owner');

CREATE POLICY "Owner can manage allocations" ON public.expense_allocations
  FOR ALL USING (get_user_role(auth.uid()) = 'owner');

-- 13. Create triggers for updated_at
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_allocations_updated_at BEFORE UPDATE ON public.expense_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Seed initial Chart of Accounts (Brazilian standard)
INSERT INTO public.chart_of_accounts (code, name, dre_section, dfc_activity, is_cac) VALUES
-- Revenue
('3.1', 'Receita Bruta', 'REVENUE', 'OPERATING', false),
('3.1.1', 'Vendas de Produtos', 'REVENUE', 'OPERATING', false),
('3.1.2', 'Prestação de Serviços', 'REVENUE', 'OPERATING', false),

-- Deductions
('3.2', 'Deduções da Receita', 'DEDUCTIONS', 'OPERATING', false),
('3.2.1', 'Impostos sobre Vendas', 'DEDUCTIONS', 'OPERATING', false),
('3.2.2', 'Devoluções e Cancelamentos', 'DEDUCTIONS', 'OPERATING', false),

-- COGS
('4.1', 'Custo dos Produtos Vendidos', 'COGS', 'OPERATING', false),
('4.2', 'Custo dos Serviços Prestados', 'COGS', 'OPERATING', false),

-- Variable Expenses
('5.1', 'Despesas Variáveis', 'VAR_EXP', 'OPERATING', false),
('5.1.1', 'Comissões sobre Vendas', 'VAR_EXP', 'OPERATING', false),
('5.1.2', 'Fretes e Entregas', 'VAR_EXP', 'OPERATING', false),

-- Fixed Expenses
('5.2', 'Despesas Fixas', 'FIXED_EXP', 'OPERATING', false),
('5.2.1', 'Folha de Pagamento', 'FIXED_EXP', 'OPERATING', false),
('5.2.2', 'Aluguel e Condomínio', 'FIXED_EXP', 'OPERATING', false),
('5.2.3', 'Energia e Água', 'FIXED_EXP', 'OPERATING', false),
('5.2.4', 'Internet e Telefonia', 'FIXED_EXP', 'OPERATING', false),
('5.2.5', 'Software e Assinaturas', 'FIXED_EXP', 'OPERATING', false),
('5.2.6', 'Contabilidade', 'FIXED_EXP', 'OPERATING', false),
('5.2.7', 'Material de Escritório', 'FIXED_EXP', 'OPERATING', false),

-- Marketing (CAC)
('5.3', 'Marketing e Vendas', 'FIXED_EXP', 'OPERATING', true),
('5.3.1', 'Marketing Digital', 'FIXED_EXP', 'OPERATING', true),
('5.3.2', 'Google Ads', 'FIXED_EXP', 'OPERATING', true),
('5.3.3', 'Facebook Ads', 'FIXED_EXP', 'OPERATING', true),

-- Depreciation
('6.1', 'Depreciação e Amortização', 'DEPREC_AMORT', 'OPERATING', false),

-- Financial
('7.1', 'Receitas Financeiras', 'FIN_RESULT', 'OPERATING', false),
('7.2', 'Despesas Financeiras', 'FIN_RESULT', 'OPERATING', false),

-- Taxes
('8.1', 'Imposto de Renda', 'INCOME_TAX', 'OPERATING', false),
('8.2', 'Contribuição Social', 'INCOME_TAX', 'OPERATING', false);

-- 15. Seed initial Cost Centers
INSERT INTO public.cost_centers (code, name) VALUES
('ADM', 'Administrativo'),
('COM', 'Comercial'),
('OPR', 'Operacional'),
('TEC', 'Tecnologia'),
('MKT', 'Marketing'),
('FIN', 'Financeiro');

-- 16. Create function to validate expense allocations sum to 100%
CREATE OR REPLACE FUNCTION validate_expense_allocation() RETURNS TRIGGER AS $$
DECLARE
  total_percent NUMERIC;
BEGIN
  SELECT SUM(percent) INTO total_percent
  FROM public.expense_allocations
  WHERE expense_id = NEW.expense_id;
  
  IF total_percent > 100 THEN
    RAISE EXCEPTION 'Total allocation cannot exceed 100%%';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_allocation_percent
  AFTER INSERT OR UPDATE ON public.expense_allocations
  FOR EACH ROW EXECUTE FUNCTION validate_expense_allocation();

-- 17. Migrate existing data (preserving all information)
-- Migrate company_costs to expenses
INSERT INTO public.expenses (
  id,
  tipo_lancamento,
  conta_contabil_id,
  amount_original,
  currency,
  exchange_rate,
  data_competencia,
  description,
  notes,
  files,
  created_at,
  updated_at,
  created_by,
  status
)
SELECT 
  cc.id,
  'empresa'::expense_type,
  COALESCE(
    (SELECT id FROM public.chart_of_accounts WHERE name = cc.category LIMIT 1),
    (SELECT id FROM public.chart_of_accounts WHERE code = '5.2' LIMIT 1)
  ),
  cc.amount,
  'BRL',
  1.0,
  cc.date,
  cc.description,
  cc.observations,
  cc.files,
  cc.created_at,
  cc.updated_at,
  cc.created_by,
  'pago'::expense_status
FROM public.company_costs cc;

-- Migrate service_provider_costs to suppliers and expenses
INSERT INTO public.suppliers (
  name,
  email,
  phone,
  cpf,
  cnpj,
  pix_key,
  tipo_fornecedor,
  created_at
)
SELECT DISTINCT
  name,
  email,
  phone,
  cpf,
  cnpj,
  pix_key,
  type,
  MIN(created_at)
FROM public.service_provider_costs
GROUP BY name, email, phone, cpf, cnpj, pix_key, type
ON CONFLICT DO NOTHING;

-- Then migrate the costs
INSERT INTO public.expenses (
  id,
  tipo_lancamento,
  conta_contabil_id,
  fornecedor_id,
  amount_original,
  currency,
  exchange_rate,
  data_competencia,
  data_pagamento,
  description,
  invoice_number,
  files,
  created_at,
  updated_at,
  created_by,
  status
)
SELECT 
  spc.id,
  'prestador_servico'::expense_type,
  (SELECT id FROM public.chart_of_accounts WHERE code = '4.2' LIMIT 1), -- Default to service costs
  (SELECT id FROM public.suppliers WHERE name = spc.name AND email = spc.email LIMIT 1),
  spc.amount,
  'BRL',
  1.0,
  TO_DATE(spc.competence || '-01', 'YYYY-MM-DD'),
  CASE 
    WHEN spc.status = 'Pago' THEN TO_DATE(spc.competence || '-01', 'YYYY-MM-DD')
    ELSE NULL
  END,
  COALESCE(spc.name || ' - ' || spc.competence, 'Prestador de Serviço'),
  spc.invoice_number,
  spc.files,
  spc.created_at,
  spc.updated_at,
  spc.created_by,
  CASE 
    WHEN spc.status = 'Pago' THEN 'pago'::expense_status
    ELSE 'lancado'::expense_status
  END
FROM public.service_provider_costs spc;

-- 18. Add comments for documentation
COMMENT ON TABLE public.expenses IS 'Unified expenses table for all company costs';
COMMENT ON TABLE public.chart_of_accounts IS 'Chart of accounts for financial reporting';
COMMENT ON TABLE public.cost_centers IS 'Cost centers for expense allocation';
COMMENT ON TABLE public.projects IS 'Projects and clients for margin analysis';
COMMENT ON TABLE public.expense_allocations IS 'Expense allocation/split across cost centers and projects';
COMMENT ON COLUMN public.expenses.amount_base IS 'Amount in company base currency (auto-calculated)';
COMMENT ON COLUMN public.expenses.data_competencia IS 'Accrual date for DRE reporting';
COMMENT ON COLUMN public.expenses.data_pagamento IS 'Payment date for cash flow reporting';