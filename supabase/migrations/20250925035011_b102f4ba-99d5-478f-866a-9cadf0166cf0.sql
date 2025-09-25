-- Fix function search path warnings
ALTER FUNCTION public.cleanup_expired_reset_tokens() SET search_path = public;
ALTER FUNCTION public.generate_sms_code() SET search_path = public;