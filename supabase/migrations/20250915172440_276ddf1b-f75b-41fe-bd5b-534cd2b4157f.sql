-- Enable RLS on security_monitoring_dashboard view
ALTER VIEW public.security_monitoring_dashboard SET (security_barrier = true);

-- Enable RLS on the view
ALTER TABLE public.security_monitoring_dashboard ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access to owner and master roles only
CREATE POLICY "Only owner and master can view security monitoring" 
ON public.security_monitoring_dashboard 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

-- Add comment for documentation
COMMENT ON VIEW public.security_monitoring_dashboard IS 'Security monitoring dashboard with restricted access - only owner and master roles can view this data';