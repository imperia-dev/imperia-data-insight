-- Migrar o registro faltante do dia 18/09/2025
INSERT INTO public.expenses (
  tipo_lancamento,
  conta_contabil_id,
  amount_original,
  currency,
  exchange_rate,
  data_competencia,
  description,
  created_at,
  updated_at,
  created_by,
  status
)
SELECT 
  'empresa'::expense_type,
  (SELECT id FROM public.chart_of_accounts WHERE code = '5.2' LIMIT 1),
  cc.amount,
  'BRL',
  1.0,
  cc.date,
  cc.description,
  cc.created_at,
  cc.updated_at,
  cc.created_by,
  'pago'::expense_status
FROM public.company_costs cc
WHERE cc.date = '2025-09-18'
  AND cc.description = 'Lovable'
  AND NOT EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.data_competencia = cc.date
    AND e.description = cc.description
    AND e.amount_original = cc.amount
  );