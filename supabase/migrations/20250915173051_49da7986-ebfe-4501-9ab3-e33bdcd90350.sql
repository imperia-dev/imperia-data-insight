-- Drop the existing view if it exists
DROP VIEW IF EXISTS public.security_monitoring_dashboard;

-- Recreate as a secure view using a function
CREATE OR REPLACE FUNCTION public.get_security_monitoring_data()
RETURNS TABLE (
  user_id uuid,
  user_name text,
  user_role user_role,
  table_name text,
  operation text,
  first_access timestamp with time zone,
  last_access timestamp with time zone,
  access_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only owner and master roles can access this data
  IF get_user_role(auth.uid()) NOT IN ('owner', 'master') THEN
    RAISE EXCEPTION 'Unauthorized access to security monitoring data';
  END IF;

  RETURN QUERY
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
  ORDER BY last_access DESC;
END;
$$;

-- Create a view that uses the secure function (optional, for convenience)
CREATE OR REPLACE VIEW public.security_monitoring_dashboard AS
  SELECT * FROM public.get_security_monitoring_data();

-- Grant access to authenticated users (the function will check permissions)
GRANT EXECUTE ON FUNCTION public.get_security_monitoring_data() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_security_monitoring_data() IS 'Secure function to access security monitoring data - restricted to owner and master roles only';
COMMENT ON VIEW public.security_monitoring_dashboard IS 'Security monitoring dashboard view - access controlled via get_security_monitoring_data() function';