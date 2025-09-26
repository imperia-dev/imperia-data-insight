-- Step 1: Create a default accounting account if not exists
INSERT INTO public.chart_of_accounts (code, name, dre_section, is_active)
SELECT '3.0.00', 'Despesas Gerais', 'FIXED_EXP', true
WHERE NOT EXISTS (SELECT 1 FROM public.chart_of_accounts WHERE code = '3.0.00');

-- Step 2: Add missing fields to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS tipo_despesa text DEFAULT 'empresa',
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS pix_key text,
ADD COLUMN IF NOT EXISTS days_worked integer,
ADD COLUMN IF NOT EXISTS competence text,
ADD COLUMN IF NOT EXISTS sub_category text,
ADD COLUMN IF NOT EXISTS observations text;

-- Step 3: Migrate data from company_costs to expenses
INSERT INTO public.expenses (
  org_id,
  tipo_lancamento,
  conta_contabil_id,
  centro_custo_id,
  amount_original,
  exchange_rate,
  data_competencia,
  status,
  created_by,
  created_at,
  updated_at,
  currency,
  description,
  notes,
  files,
  tipo_despesa,
  sub_category,
  observations
)
SELECT 
  created_by as org_id,
  'empresa'::expense_type as tipo_lancamento,
  COALESCE(
    (SELECT id FROM public.chart_of_accounts WHERE name = cc.category LIMIT 1),
    (SELECT id FROM public.chart_of_accounts WHERE code = '3.0.00' LIMIT 1)
  ) as conta_contabil_id,
  NULL as centro_custo_id,
  cc.amount as amount_original,
  1.0 as exchange_rate,
  cc.date as data_competencia,
  'lancado'::expense_status as status,
  cc.created_by,
  cc.created_at,
  cc.updated_at,
  'BRL' as currency,
  cc.description,
  cc.observations as notes,
  cc.files,
  'empresa' as tipo_despesa,
  cc.sub_category,
  cc.observations
FROM public.company_costs cc
WHERE NOT EXISTS (
  SELECT 1 FROM public.expenses e 
  WHERE e.description = cc.description 
  AND e.data_competencia = cc.date 
  AND e.amount_original = cc.amount
  AND e.tipo_despesa = 'empresa'
);

-- Step 4: Migrate data from service_provider_costs to expenses
INSERT INTO public.expenses (
  org_id,
  tipo_lancamento,
  conta_contabil_id,
  centro_custo_id,
  fornecedor_id,
  amount_original,
  exchange_rate,
  data_competencia,
  status,
  created_by,
  created_at,
  updated_at,
  currency,
  description,
  invoice_number,
  files,
  tipo_despesa,
  tipo_fornecedor,
  cpf,
  cnpj,
  email,
  phone,
  pix_key,
  days_worked,
  competence
)
SELECT 
  created_by as org_id,
  'prestador_servico'::expense_type as tipo_lancamento,
  COALESCE(
    (SELECT id FROM public.chart_of_accounts WHERE code = '3.1.01' LIMIT 1),
    (SELECT id FROM public.chart_of_accounts WHERE code = '3.0.00' LIMIT 1)
  ) as conta_contabil_id,
  NULL as centro_custo_id,
  (SELECT id FROM public.suppliers WHERE email = spc.email LIMIT 1) as fornecedor_id,
  spc.amount as amount_original,
  1.0 as exchange_rate,
  to_date(spc.competence || '-01', 'YYYY-MM-DD') as data_competencia,
  CASE 
    WHEN spc.status = 'Pago' THEN 'pago'::expense_status
    ELSE 'lancado'::expense_status
  END as status,
  spc.created_by,
  spc.created_at,
  spc.updated_at,
  'BRL' as currency,
  'Pagamento para ' || spc.name as description,
  spc.invoice_number,
  spc.files,
  'prestador' as tipo_despesa,
  spc.type as tipo_fornecedor,
  spc.cpf,
  spc.cnpj,
  spc.email,
  spc.phone,
  spc.pix_key,
  spc.days_worked,
  spc.competence
FROM public.service_provider_costs spc
WHERE NOT EXISTS (
  SELECT 1 FROM public.expenses e 
  WHERE e.email = spc.email 
  AND e.competence = spc.competence 
  AND e.amount_original = spc.amount
  AND e.tipo_despesa = 'prestador'
);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_tipo_despesa ON public.expenses(tipo_despesa);
CREATE INDEX IF NOT EXISTS idx_expenses_competence ON public.expenses(competence);
CREATE INDEX IF NOT EXISTS idx_expenses_email ON public.expenses(email);