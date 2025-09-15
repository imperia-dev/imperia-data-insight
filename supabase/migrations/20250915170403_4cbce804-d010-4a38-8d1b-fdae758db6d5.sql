-- PHASE 1: CRITICAL SECURITY FIXES

-- 1. Drop the insecure SECURITY DEFINER views
DROP VIEW IF EXISTS public.security_monitoring_dashboard;
DROP VIEW IF EXISTS public.service_provider_costs_masked;

-- 2. Recreate service_provider_costs_masked as a regular view without SECURITY DEFINER
CREATE OR REPLACE VIEW public.service_provider_costs_masked AS
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
  -- Use masking functions for sensitive data
  public.mask_sensitive_string(cpf, 'cpf') as cpf_masked,
  public.mask_sensitive_string(cnpj, 'cnpj') as cnpj_masked,
  public.mask_sensitive_string(pix_key, 'pix') as pix_key_masked
FROM public.service_provider_costs;

-- 3. Create security_monitoring_dashboard as a regular view
CREATE OR REPLACE VIEW public.security_monitoring_dashboard AS
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

-- 4. Fix search path in all SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'operation'::user_role
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role FROM public.profiles WHERE id = user_id;
$function$;

CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  p_table_name text, 
  p_operation text, 
  p_record_id uuid DEFAULT NULL::uuid, 
  p_fields text[] DEFAULT NULL::text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.check_sensitive_data_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_service_provider_sensitive_data(p_id uuid)
RETURNS TABLE(cpf text, cnpj text, pix_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 5. Fix public table policies - Restrict cash_flow_categories
DROP POLICY IF EXISTS "Anyone can view categories" ON public.cash_flow_categories;

CREATE POLICY "Authenticated users can view categories" 
ON public.cash_flow_categories 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 6. Restrict system_settings to proper roles only
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;

CREATE POLICY "Authenticated users can view system settings" 
ON public.system_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 7. Add additional security layer for sensitive data access
-- Create a function to validate sensitive data access with extra checks
CREATE OR REPLACE FUNCTION public.validate_sensitive_access(
  p_table_name text,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_role user_role;
  recent_access_count integer;
BEGIN
  -- Get user role
  SELECT role INTO user_role 
  FROM public.profiles 
  WHERE id = p_user_id;
  
  -- Only owner role can access sensitive data
  IF user_role != 'owner' THEN
    RETURN false;
  END IF;
  
  -- Check for suspicious access patterns (too many accesses in short time)
  SELECT COUNT(*) INTO recent_access_count
  FROM public.audit_logs
  WHERE user_id = p_user_id
    AND table_name = p_table_name
    AND created_at > now() - interval '5 minutes';
  
  -- If more than 10 accesses in 5 minutes, flag as suspicious
  IF recent_access_count > 10 THEN
    -- Log suspicious activity
    INSERT INTO public.audit_logs (
      table_name,
      operation,
      user_id,
      ip_address
    ) VALUES (
      p_table_name,
      'suspicious_activity_detected',
      p_user_id,
      inet_client_addr()
    );
    
    RETURN false;
  END IF;
  
  RETURN true;
END;
$function$;

-- 8. Create index for better audit log performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created 
ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_operation 
ON public.audit_logs(table_name, operation, created_at DESC);

-- 9. Add column to track failed access attempts
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS failed_access_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failed_access timestamp with time zone;

-- 10. Create function to track failed access attempts
CREATE OR REPLACE FUNCTION public.track_failed_access(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles
  SET 
    failed_access_attempts = COALESCE(failed_access_attempts, 0) + 1,
    last_failed_access = now()
  WHERE id = p_user_id;
  
  -- If too many failed attempts, log it
  IF (SELECT failed_access_attempts FROM public.profiles WHERE id = p_user_id) > 5 THEN
    INSERT INTO public.audit_logs (
      table_name,
      operation,
      user_id,
      ip_address
    ) VALUES (
      'profiles',
      'excessive_failed_attempts',
      p_user_id,
      inet_client_addr()
    );
  END IF;
END;
$function$;

-- 11. Reset failed attempts on successful access
CREATE OR REPLACE FUNCTION public.reset_failed_attempts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles
  SET failed_access_attempts = 0
  WHERE id = p_user_id;
END;
$function$;

-- 12. Create enhanced monitoring table with proper security
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  user_id uuid,
  ip_address inet,
  user_agent text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only owner can view security events
CREATE POLICY "Only owner can view security events" 
ON public.security_events 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- 13. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_severity text,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.security_events (
    event_type,
    severity,
    user_id,
    ip_address,
    details
  ) VALUES (
    p_event_type,
    p_severity,
    auth.uid(),
    inet_client_addr(),
    p_details
  );
END;
$function$;