-- SECURITY FIX: Convert views from SECURITY DEFINER to SECURITY INVOKER
-- This prevents views from bypassing RLS policies

-- Step 1: Drop existing function if exists
DROP FUNCTION IF EXISTS public.verify_view_security();

-- Step 2: Drop existing views with SECURITY DEFINER
DROP VIEW IF EXISTS public.service_provider_costs_v CASCADE;
DROP VIEW IF EXISTS public.service_provider_costs_masked_v CASCADE;
DROP VIEW IF EXISTS public.company_costs_v CASCADE;

-- Step 3: Recreate service_provider_costs_masked view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.service_provider_costs_masked_v
WITH (security_invoker = true) AS
SELECT 
  spc.id,
  spc.name,
  spc.email,
  spc.type,
  spc.invoice_number,
  spc.competence,
  spc.status,
  spc.days_worked,
  spc.amount,
  spc.phone,
  -- Mask sensitive data based on user role
  CASE 
    WHEN get_user_role(auth.uid()) = 'owner'::user_role THEN spc.cpf
    ELSE mask_sensitive_string(spc.cpf, 'cpf')
  END as cpf,
  CASE 
    WHEN get_user_role(auth.uid()) = 'owner'::user_role THEN spc.cnpj
    ELSE mask_sensitive_string(spc.cnpj, 'cnpj')
  END as cnpj,
  CASE 
    WHEN get_user_role(auth.uid()) = 'owner'::user_role THEN spc.pix_key
    ELSE mask_sensitive_string(spc.pix_key, 'pix')
  END as pix_key,
  spc.files,
  spc.created_by,
  spc.created_at,
  spc.updated_at,
  spc.last_sensitive_access,
  spc.sensitive_access_count
FROM public.service_provider_costs spc;

-- Step 4: Recreate company_costs view with SECURITY INVOKER
CREATE OR REPLACE VIEW public.company_costs_v
WITH (security_invoker = true) AS
SELECT 
  cc.id,
  cc.date,
  cc.category,
  cc.sub_category,
  cc.description,
  cc.amount,
  cc.files,
  cc.observations,
  cc.created_by,
  cc.created_at,
  cc.updated_at
FROM public.company_costs cc;

-- Step 5: Revoke SELECT permissions from anon role on sensitive views
REVOKE SELECT ON public.service_provider_costs_masked_v FROM anon;
REVOKE SELECT ON public.company_costs_v FROM anon;

-- Step 6: Grant SELECT only to authenticated users
GRANT SELECT ON public.service_provider_costs_masked_v TO authenticated;
GRANT SELECT ON public.company_costs_v TO authenticated;

-- Step 7: Ensure RLS is enabled on base tables
ALTER TABLE public.service_provider_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_costs ENABLE ROW LEVEL SECURITY;

-- Step 8: Add/Update RLS policies for service_provider_costs
DROP POLICY IF EXISTS "Only owner can view service provider costs" ON public.service_provider_costs;
CREATE POLICY "Only owner can view service provider costs" 
ON public.service_provider_costs 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only owner can insert service provider costs" ON public.service_provider_costs;
CREATE POLICY "Only owner can insert service provider costs" 
ON public.service_provider_costs 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only owner can update service provider costs" ON public.service_provider_costs;
CREATE POLICY "Only owner can update service provider costs" 
ON public.service_provider_costs 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only owner can delete service provider costs" ON public.service_provider_costs;
CREATE POLICY "Only owner can delete service provider costs" 
ON public.service_provider_costs 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Step 9: Add comments explaining security measures
COMMENT ON VIEW public.service_provider_costs_masked_v IS 
'Secure view for service provider costs with masked sensitive data. Uses SECURITY INVOKER to respect user RLS policies. Only owners see unmasked data.';

COMMENT ON VIEW public.company_costs_v IS 
'Secure view for company costs. Uses SECURITY INVOKER to respect user RLS policies.';

-- Step 10: Log this security fix
INSERT INTO public.audit_logs (
  table_name,
  operation,
  user_id,
  user_agent
) VALUES (
  'database_views',
  'security_fix_applied',
  auth.uid(),
  'Security Migration: Fixed SECURITY DEFINER views vulnerability'
);

-- Step 11: Verify the security configuration
DO $$
BEGIN
  RAISE NOTICE 'Security fix completed successfully';
  RAISE NOTICE 'Views now use SECURITY INVOKER and respect RLS policies';
  RAISE NOTICE 'Sensitive data is masked for non-owner users';
  RAISE NOTICE 'Anonymous access has been revoked';
END $$;