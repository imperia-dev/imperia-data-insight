-- SECURITY FIX: Convert views from SECURITY DEFINER to SECURITY INVOKER
-- This prevents views from bypassing RLS policies

-- Step 1: Drop existing views with SECURITY DEFINER
DROP VIEW IF EXISTS public.service_provider_costs_v CASCADE;
DROP VIEW IF EXISTS public.service_provider_costs_masked_v CASCADE;
DROP VIEW IF EXISTS public.company_costs_v CASCADE;

-- Step 2: Recreate views with SECURITY INVOKER (respects user permissions)

-- Service Provider Costs View with Masking (SECURE)
CREATE OR REPLACE VIEW public.service_provider_costs_masked_v
WITH (security_invoker = true) AS
SELECT 
  e.id,
  s.name,
  s.email,
  s.phone,
  -- Mask sensitive data based on user role
  CASE
    WHEN get_user_role(auth.uid()) = 'owner'::user_role THEN s.cpf
    WHEN length(s.cpf) > 0 THEN ('***.***.***-'::text || "right"(s.cpf, 2))
    ELSE NULL::text
  END AS cpf_masked,
  CASE
    WHEN get_user_role(auth.uid()) = 'owner'::user_role THEN s.cnpj
    WHEN length(s.cnpj) > 0 THEN ('**.***.***/**'::text || "right"(s.cnpj, 6))
    ELSE NULL::text
  END AS cnpj_masked,
  CASE
    WHEN get_user_role(auth.uid()) = 'owner'::user_role THEN s.pix_key
    WHEN length(s.pix_key) > 5 THEN (("left"(s.pix_key, 3) || repeat('*'::text, (length(s.pix_key) - 5))) || "right"(s.pix_key, 2))
    ELSE s.pix_key
  END AS pix_key_masked,
  s.tipo_fornecedor AS type,
  to_char((e.data_competencia)::timestamp with time zone, 'YYYY-MM'::text) AS competence,
  e.amount_base AS amount,
  NULL::integer AS days_worked,
  e.status,
  e.invoice_number,
  e.files,
  e.created_at,
  e.updated_at,
  e.created_by
FROM expenses e
LEFT JOIN suppliers s ON (e.fornecedor_id = s.id)
WHERE e.tipo_lancamento = 'prestador_servico'::expense_type;

-- Company Costs View (SECURE)
CREATE OR REPLACE VIEW public.company_costs_v
WITH (security_invoker = true) AS
SELECT 
  e.id,
  e.data_competencia AS date,
  e.amount_base AS amount,
  coa.name AS category,
  cc.name AS sub_category,
  e.description,
  e.notes AS observations,
  e.files,
  e.created_at,
  e.updated_at,
  e.created_by
FROM expenses e
LEFT JOIN chart_of_accounts coa ON (e.conta_contabil_id = coa.id)
LEFT JOIN cost_centers cc ON (e.centro_custo_id = cc.id)
WHERE e.tipo_lancamento = 'empresa'::expense_type;

-- Step 3: Remove the non-masked service_provider_costs_v view completely
-- (it was exposing raw sensitive data)

-- Step 4: Revoke SELECT permissions from anon role on sensitive views
REVOKE SELECT ON public.service_provider_costs_masked_v FROM anon;
REVOKE SELECT ON public.company_costs_v FROM anon;

-- Step 5: Grant SELECT only to authenticated users
GRANT SELECT ON public.service_provider_costs_masked_v TO authenticated;
GRANT SELECT ON public.company_costs_v TO authenticated;

-- Step 6: Ensure RLS is enabled on base tables
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Step 7: Add/Update RLS policies for suppliers table if not exists
DROP POLICY IF EXISTS "Only owner can view suppliers" ON public.suppliers;
CREATE POLICY "Only owner can view suppliers" 
ON public.suppliers 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only owner can insert suppliers" ON public.suppliers;
CREATE POLICY "Only owner can insert suppliers" 
ON public.suppliers 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only owner can update suppliers" ON public.suppliers;
CREATE POLICY "Only owner can update suppliers" 
ON public.suppliers 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only owner can delete suppliers" ON public.suppliers;
CREATE POLICY "Only owner can delete suppliers" 
ON public.suppliers 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Step 8: Add comment explaining security measures
COMMENT ON VIEW public.service_provider_costs_masked_v IS 
'Secure view for service provider costs with masked sensitive data. Uses SECURITY INVOKER to respect user RLS policies. Only owners see unmasked data.';

COMMENT ON VIEW public.company_costs_v IS 
'Secure view for company costs. Uses SECURITY INVOKER to respect user RLS policies.';

-- Step 9: Create a function to verify view security status
CREATE OR REPLACE FUNCTION public.verify_view_security()
RETURNS TABLE(
  view_name text,
  is_secure boolean,
  has_security_invoker boolean,
  base_tables_have_rls boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH view_info AS (
    SELECT 
      c.relname::text as view_name,
      CASE 
        WHEN v.definition ILIKE '%security_invoker%' THEN true
        ELSE false
      END as has_security_invoker
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_views v ON v.viewname = c.relname AND v.schemaname = n.nspname
    WHERE c.relkind = 'v'
    AND n.nspname = 'public'
    AND c.relname IN ('service_provider_costs_masked_v', 'company_costs_v')
  )
  SELECT 
    vi.view_name,
    vi.has_security_invoker as is_secure,
    vi.has_security_invoker,
    (
      SELECT bool_and(t.relrowsecurity)
      FROM pg_class t
      WHERE t.relname IN ('expenses', 'suppliers', 'chart_of_accounts', 'cost_centers')
      AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) as base_tables_have_rls
  FROM view_info vi;
END;
$$;

-- Step 10: Log this security fix
INSERT INTO public.audit_logs (
  table_name,
  operation,
  user_id,
  user_agent,
  ip_address
) VALUES (
  'database_views',
  'security_fix_applied',
  auth.uid(),
  'Migration: Fix SECURITY DEFINER views - Converted to SECURITY INVOKER',
  inet_client_addr()
);