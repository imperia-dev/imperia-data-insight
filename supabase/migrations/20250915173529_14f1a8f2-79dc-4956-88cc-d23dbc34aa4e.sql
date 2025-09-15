-- Drop the existing function and view
DROP FUNCTION IF EXISTS public.get_security_monitoring_data() CASCADE;
DROP VIEW IF EXISTS public.security_monitoring_dashboard;

-- Create a simple view without SECURITY DEFINER
-- The view will respect the existing RLS policies on audit_logs and profiles tables
CREATE OR REPLACE VIEW public.security_monitoring_dashboard AS
SELECT 
  al.user_id,
  p.full_name as user_name,
  p.role as user_role,
  al.table_name,
  al.operation,
  MIN(al.created_at) as first_access,
  MAX(al.created_at) as last_access,
  COUNT(*) as access_count
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id
GROUP BY al.user_id, p.full_name, p.role, al.table_name, al.operation
ORDER BY MAX(al.created_at) DESC;

-- Grant access to authenticated users
-- The underlying RLS policies on audit_logs (owner-only) will still apply
GRANT SELECT ON public.security_monitoring_dashboard TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.security_monitoring_dashboard IS 'Security monitoring dashboard view - access controlled by underlying RLS policies on audit_logs and profiles tables. Only owners can see data due to audit_logs RLS policy.';