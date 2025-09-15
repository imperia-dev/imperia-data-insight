-- Document why certain functions require SECURITY DEFINER for compliance and security
-- These functions are intentionally using SECURITY DEFINER for critical security features

-- 1. get_service_provider_sensitive_data: MUST use SECURITY DEFINER
--    Reason: Controls access to highly sensitive PII data (CPF, CNPJ, PIX)
--    Security features: Role checking, rate limiting, audit logging
COMMENT ON FUNCTION public.get_service_provider_sensitive_data(uuid) IS 
'CRITICAL SECURITY FUNCTION - SECURITY DEFINER REQUIRED
This function provides controlled access to sensitive PII data (CPF, CNPJ, PIX keys).
Security features implemented:
1. Role-based access control (owner-only)
2. Rate limiting (max 100 accesses per hour)
3. Comprehensive audit logging
4. Exception handling for unauthorized access
DO NOT REMOVE SECURITY DEFINER - it is essential for data protection compliance.';

-- 2. Other legitimate SECURITY DEFINER functions for security operations
COMMENT ON FUNCTION public.log_sensitive_data_access(text, text, uuid, text[]) IS 
'Security audit function - SECURITY DEFINER required for logging operations regardless of caller permissions';

COMMENT ON FUNCTION public.check_sensitive_data_rate_limit() IS 
'Rate limiting function - SECURITY DEFINER required to check rate limits across all users';

COMMENT ON FUNCTION public.validate_sensitive_access(text, uuid) IS 
'Access validation function - SECURITY DEFINER required for security checks';

COMMENT ON FUNCTION public.track_failed_access(uuid) IS 
'Failed access tracking - SECURITY DEFINER required for security monitoring';

COMMENT ON FUNCTION public.reset_failed_attempts(uuid) IS 
'Failed attempts reset - SECURITY DEFINER required for security operations';

COMMENT ON FUNCTION public.log_security_event(text, text, jsonb) IS 
'Security event logging - SECURITY DEFINER required for audit trail';

COMMENT ON FUNCTION public.cleanup_old_backups() IS 
'Backup cleanup function - SECURITY DEFINER required for maintenance operations';

COMMENT ON FUNCTION public.get_user_role(uuid) IS 
'Role retrieval function - SECURITY DEFINER required to check roles in RLS policies';

COMMENT ON FUNCTION public.handle_new_user() IS 
'User creation trigger - SECURITY DEFINER required for profile creation on signup';