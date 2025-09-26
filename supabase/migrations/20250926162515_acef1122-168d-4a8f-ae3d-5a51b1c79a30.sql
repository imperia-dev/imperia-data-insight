-- First, add unique constraints to enable ON CONFLICT (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_centers_code_key') THEN
    ALTER TABLE cost_centers ADD CONSTRAINT cost_centers_code_key UNIQUE (code);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chart_of_accounts_code_key') THEN
    ALTER TABLE chart_of_accounts ADD CONSTRAINT chart_of_accounts_code_key UNIQUE (code);
  END IF;
END $$;

-- Now, ensure we have the OPR cost center
INSERT INTO cost_centers (code, name, is_active)
VALUES ('OPR', 'Operacional', true)
ON CONFLICT (code) DO NOTHING;

-- Create the 4.01 chart of account for Service Provider Costs
INSERT INTO chart_of_accounts (code, name, dre_section, dfc_activity, is_active)
VALUES ('4.01', 'Custos de Tradução - Prestadores', 'COGS', 'OPERATING', true)
ON CONFLICT (code) DO NOTHING;

-- Update all existing service provider expenses to use the correct classifications
UPDATE expenses 
SET 
  conta_contabil_id = (SELECT id FROM chart_of_accounts WHERE code = '4.01' LIMIT 1),
  centro_custo_id = (SELECT id FROM cost_centers WHERE code = 'OPR' LIMIT 1),
  updated_at = NOW()
WHERE tipo_despesa = 'prestador'
  AND (conta_contabil_id IS NULL OR conta_contabil_id != (SELECT id FROM chart_of_accounts WHERE code = '4.01' LIMIT 1));

-- Add documentation comments
COMMENT ON COLUMN expenses.conta_contabil_id IS 'For service providers (tipo_despesa = prestador), should always reference chart_of_accounts code 4.01';
COMMENT ON COLUMN expenses.centro_custo_id IS 'For service providers (tipo_despesa = prestador), should always reference cost_center code OPR';