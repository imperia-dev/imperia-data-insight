-- Create audit log table for sensitive data access
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  user_id uuid,
  record_id uuid,
  accessed_fields text[],
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only owner can view audit logs
CREATE POLICY "Only owner can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Create function to mask sensitive data for display
CREATE OR REPLACE FUNCTION public.mask_sensitive_string(input_text text, mask_type text DEFAULT 'partial')
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
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
$$;

-- Create view for masked data (for general viewing with masked sensitive fields)
CREATE OR REPLACE VIEW public.service_provider_costs_masked AS
SELECT 
  id,
  name,
  public.mask_sensitive_string(email, 'email') as email,
  public.mask_sensitive_string(phone, 'phone') as phone,
  type,
  competence,
  amount,
  invoice_number,
  days_worked,
  status,
  files,
  created_at,
  updated_at,
  created_by,
  public.mask_sensitive_string(cpf, 'cpf') as cpf_masked,
  public.mask_sensitive_string(cnpj, 'cnpj') as cnpj_masked,
  public.mask_sensitive_string(pix_key, 'pix') as pix_key_masked
FROM public.service_provider_costs;

-- Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  p_table_name text,
  p_operation text,
  p_record_id uuid DEFAULT NULL,
  p_fields text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    table_name,
    operation,
    user_id,
    record_id,
    accessed_fields,
    ip_address
  ) VALUES (
    p_table_name,
    p_operation,
    auth.uid(),
    p_record_id,
    p_fields,
    inet_client_addr()
  );
END;
$$;

-- Create function to check rate limit for sensitive data access
CREATE OR REPLACE FUNCTION public.check_sensitive_data_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  access_count integer;
BEGIN
  -- Count accesses in the last hour
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND table_name = 'service_provider_costs'
    AND operation IN ('view_sensitive', 'export_sensitive')
    AND created_at > now() - interval '1 hour';
  
  -- Allow max 100 sensitive data operations per hour
  IF access_count > 100 THEN
    -- Log the rate limit violation
    PERFORM public.log_sensitive_data_access(
      'service_provider_costs',
      'rate_limit_exceeded'
    );
    
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create secure function to access sensitive service provider data
CREATE OR REPLACE FUNCTION public.get_service_provider_sensitive_data(p_id uuid)
RETURNS TABLE (
  cpf text,
  cnpj text,
  pix_key text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is owner
  IF get_user_role(auth.uid()) != 'owner'::user_role THEN
    RAISE EXCEPTION 'Unauthorized access to sensitive data';
  END IF;
  
  -- Check rate limit
  IF NOT public.check_sensitive_data_rate_limit() THEN
    RAISE EXCEPTION 'Rate limit exceeded for sensitive data access';
  END IF;
  
  -- Log the access
  PERFORM public.log_sensitive_data_access(
    'service_provider_costs',
    'view_sensitive',
    p_id,
    ARRAY['cpf', 'cnpj', 'pix_key']
  );
  
  -- Return the sensitive data
  RETURN QUERY
  SELECT 
    spc.cpf,
    spc.cnpj,
    spc.pix_key
  FROM public.service_provider_costs spc
  WHERE spc.id = p_id;
END;
$$;

-- Add column to track last sensitive data access
ALTER TABLE public.service_provider_costs
ADD COLUMN IF NOT EXISTS last_sensitive_access timestamp with time zone,
ADD COLUMN IF NOT EXISTS sensitive_access_count integer DEFAULT 0;

-- Create trigger to update access tracking
CREATE OR REPLACE FUNCTION public.track_sensitive_access()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
$$;

-- Update RLS policies to add extra security for sensitive fields
DROP POLICY IF EXISTS "Only owner can view service provider costs" ON public.service_provider_costs;
DROP POLICY IF EXISTS "Only owner can insert service provider costs" ON public.service_provider_costs;
DROP POLICY IF EXISTS "Only owner can update service provider costs" ON public.service_provider_costs;
DROP POLICY IF EXISTS "Only owner can delete service provider costs" ON public.service_provider_costs;

-- Create more granular RLS policies
CREATE POLICY "Owner can view all service provider costs" 
ON public.service_provider_costs 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owner can insert service provider costs" 
ON public.service_provider_costs 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owner can update service provider costs" 
ON public.service_provider_costs 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'owner'::user_role)
WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owner can delete service provider costs" 
ON public.service_provider_costs 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Create index for better performance on audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_table 
ON public.audit_logs(user_id, table_name, created_at DESC);

-- Create a summary view for security monitoring
CREATE OR REPLACE VIEW public.security_monitoring_dashboard AS
SELECT 
  al.user_id,
  p.full_name as user_name,
  p.role as user_role,
  al.table_name,
  al.operation,
  COUNT(*) as access_count,
  MAX(al.created_at) as last_access,
  MIN(al.created_at) as first_access
FROM public.audit_logs al
LEFT JOIN public.profiles p ON p.id = al.user_id
WHERE al.created_at > now() - interval '7 days'
GROUP BY al.user_id, p.full_name, p.role, al.table_name, al.operation
ORDER BY access_count DESC;