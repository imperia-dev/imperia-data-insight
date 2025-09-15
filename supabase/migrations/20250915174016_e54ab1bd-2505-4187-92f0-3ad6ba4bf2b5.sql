-- Drop and recreate get_backup_stats without SECURITY DEFINER
-- The function will rely on existing RLS policies on backup_logs table
DROP FUNCTION IF EXISTS public.get_backup_stats();

CREATE OR REPLACE FUNCTION public.get_backup_stats()
RETURNS TABLE(
  total_backups bigint, 
  successful_backups bigint, 
  failed_backups bigint, 
  total_size_gb numeric, 
  avg_duration_minutes numeric, 
  last_backup_date date, 
  last_successful_backup date
)
LANGUAGE plpgsql
STABLE
-- Removed SECURITY DEFINER - will use caller's permissions
SET search_path = public
AS $$
BEGIN
  -- Check if user has permission (owner or master role)
  IF get_user_role(auth.uid()) NOT IN ('owner', 'master') THEN
    -- Return empty result set for unauthorized users
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_backups,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_backups,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_backups,
    ROUND(COALESCE(SUM(size_mb) / 1024, 0), 2) as total_size_gb,
    ROUND(COALESCE(AVG(duration_seconds) / 60, 0), 2) as avg_duration_minutes,
    MAX(backup_date) as last_backup_date,
    MAX(backup_date) FILTER (WHERE status = 'success') as last_successful_backup
  FROM public.backup_logs
  WHERE status != 'deleted';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_backup_stats() TO authenticated;

-- Update comment
COMMENT ON FUNCTION public.get_backup_stats() IS 'Get backup statistics - only accessible to owner and master roles';

-- For get_service_provider_sensitive_data, we need to keep SECURITY DEFINER 
-- because it's specifically designed to control access to sensitive data
-- However, we can add a comment explaining why it's necessary
COMMENT ON FUNCTION public.get_service_provider_sensitive_data(uuid) IS 'SECURITY DEFINER required: This function provides controlled access to sensitive data (CPF, CNPJ, PIX) with rate limiting and audit logging. Only owners can access this data, and all access is tracked for security compliance.';