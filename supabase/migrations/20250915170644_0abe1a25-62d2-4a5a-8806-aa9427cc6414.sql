-- Fix remaining security issues

-- 1. Fix mask_sensitive_string function - add search path
CREATE OR REPLACE FUNCTION public.mask_sensitive_string(input_text text, mask_type text DEFAULT 'partial'::text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;
  
  CASE mask_type
    WHEN 'cpf' THEN
      -- Format: XXX.XXX.XXX-XX -> ***.***.***-XX
      IF length(input_text) >= 11 THEN
        RETURN '***.***.***-' || right(input_text, 2);
      END IF;
    WHEN 'cnpj' THEN
      -- Format: XX.XXX.XXX/XXXX-XX -> **.***.***/****-XX
      IF length(input_text) >= 14 THEN
        RETURN '**.***.***/****-' || right(input_text, 2);
      END IF;
    WHEN 'pix' THEN
      -- Show only first 3 and last 2 characters
      IF length(input_text) > 5 THEN
        RETURN left(input_text, 3) || repeat('*', length(input_text) - 5) || right(input_text, 2);
      END IF;
    WHEN 'email' THEN
      -- Show first 2 chars and domain
      IF position('@' in input_text) > 2 THEN
        RETURN left(split_part(input_text, '@', 1), 2) || 
               repeat('*', length(split_part(input_text, '@', 1)) - 2) || 
               '@' || split_part(input_text, '@', 2);
      END IF;
    WHEN 'phone' THEN
      -- Show area code and last 2 digits
      IF length(input_text) >= 10 THEN
        RETURN left(input_text, 2) || repeat('*', length(input_text) - 4) || right(input_text, 2);
      END IF;
    ELSE
      -- Default partial masking
      IF length(input_text) > 4 THEN
        RETURN left(input_text, 2) || repeat('*', length(input_text) - 4) || right(input_text, 2);
      ELSE
        RETURN repeat('*', length(input_text));
      END IF;
  END CASE;
  
  -- Fallback to full masking if pattern doesn't match
  RETURN repeat('*', length(input_text));
END;
$function$;

-- 2. Fix track_sensitive_access function - add search path
CREATE OR REPLACE FUNCTION public.track_sensitive_access()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Update access tracking when sensitive fields are accessed
  IF TG_OP = 'SELECT' AND (OLD.cpf IS NOT NULL OR OLD.cnpj IS NOT NULL OR OLD.pix_key IS NOT NULL) THEN
    UPDATE public.service_provider_costs
    SET 
      last_sensitive_access = now(),
      sensitive_access_count = COALESCE(sensitive_access_count, 0) + 1
    WHERE id = OLD.id;
  END IF;
  
  RETURN OLD;
END;
$function$;

-- 3. Ensure update_updated_at_column has search path (even though it shows as SET, let's be explicit)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- 4. Drop and recreate views explicitly with SECURITY INVOKER to be absolutely certain
DROP VIEW IF EXISTS public.service_provider_costs_masked CASCADE;
DROP VIEW IF EXISTS public.security_monitoring_dashboard CASCADE;

-- Recreate service_provider_costs_masked with explicit SECURITY INVOKER
CREATE VIEW public.service_provider_costs_masked 
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  email,
  phone,
  type,
  competence,
  amount,
  status,
  days_worked,
  invoice_number,
  files,
  created_at,
  updated_at,
  created_by,
  public.mask_sensitive_string(cpf, 'cpf') as cpf_masked,
  public.mask_sensitive_string(cnpj, 'cnpj') as cnpj_masked,
  public.mask_sensitive_string(pix_key, 'pix') as pix_key_masked
FROM public.service_provider_costs;

-- Recreate security_monitoring_dashboard with explicit SECURITY INVOKER
CREATE VIEW public.security_monitoring_dashboard 
WITH (security_invoker = true) AS
SELECT 
  al.user_id,
  p.full_name as user_name,
  p.role as user_role,
  al.table_name,
  al.operation,
  COUNT(*) as access_count,
  MIN(al.created_at) as first_access,
  MAX(al.created_at) as last_access
FROM public.audit_logs al
LEFT JOIN public.profiles p ON al.user_id = p.id
GROUP BY al.user_id, p.full_name, p.role, al.table_name, al.operation;

-- 5. Grant appropriate permissions on the views
GRANT SELECT ON public.service_provider_costs_masked TO authenticated;
GRANT SELECT ON public.security_monitoring_dashboard TO authenticated;

-- 6. Add comment to document the security model
COMMENT ON VIEW public.service_provider_costs_masked IS 'Masked view of service provider costs - uses SECURITY INVOKER to respect RLS policies';
COMMENT ON VIEW public.security_monitoring_dashboard IS 'Security monitoring dashboard - uses SECURITY INVOKER to respect RLS policies';