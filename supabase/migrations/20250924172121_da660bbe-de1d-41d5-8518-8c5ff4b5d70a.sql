-- Fix Function Search Path Security Issues
-- Setting search_path to prevent SQL injection attacks through search path manipulation

-- Fix existing functions
ALTER FUNCTION public.check_sensitive_data_rate_limit() 
SET search_path = public;

ALTER FUNCTION public.get_service_provider_sensitive_data(uuid) 
SET search_path = public;

ALTER FUNCTION public.log_protocol_history() 
SET search_path = public;

ALTER FUNCTION public.log_security_event(text, text, jsonb) 
SET search_path = public;

ALTER FUNCTION public.log_sensitive_data_access(text, text, uuid, text[]) 
SET search_path = public;

ALTER FUNCTION public.prevent_closed_expense_edit() 
SET search_path = public;

ALTER FUNCTION public.reset_failed_attempts(uuid) 
SET search_path = public;

ALTER FUNCTION public.track_failed_access(uuid) 
SET search_path = public;

ALTER FUNCTION public.track_sensitive_access() 
SET search_path = public;

ALTER FUNCTION public.update_protocol_payment_status() 
SET search_path = public;

ALTER FUNCTION public.validate_expense_allocation() 
SET search_path = public;

ALTER FUNCTION public.validate_sensitive_access(text, uuid) 
SET search_path = public;

-- Log the security fix
INSERT INTO public.audit_logs (
  table_name,
  operation,
  user_id,
  user_agent
) VALUES (
  'database_functions',
  'search_path_security_fix',
  auth.uid(),
  'Security Migration: Fixed function search_path vulnerabilities'
);