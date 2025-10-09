-- Create security alerts configuration table
CREATE TABLE IF NOT EXISTS public.security_alert_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  threshold integer NOT NULL DEFAULT 5,
  time_window_minutes integer NOT NULL DEFAULT 15,
  notify_roles text[] NOT NULL DEFAULT ARRAY['owner'],
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_alert_config ENABLE ROW LEVEL SECURITY;

-- Only owner can manage alert configurations
CREATE POLICY "Only owner can manage alert config"
ON public.security_alert_config
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Create security alerts log table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  triggered_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb,
  notified_at timestamp with time zone,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Owner and master can view all alerts
CREATE POLICY "Owner and master can view alerts"
ON public.security_alerts
FOR SELECT
USING (get_user_role(auth.uid()) IN ('owner'::user_role, 'master'::user_role));

-- Owner can manage alerts
CREATE POLICY "Owner can manage alerts"
ON public.security_alerts
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Insert default alert configurations
INSERT INTO public.security_alert_config (alert_type, threshold, time_window_minutes, notify_roles) VALUES
  ('failed_login', 5, 15, ARRAY['owner', 'master']),
  ('suspicious_activity', 3, 10, ARRAY['owner']),
  ('unauthorized_access', 1, 5, ARRAY['owner']),
  ('rate_limit_exceeded', 10, 30, ARRAY['owner']),
  ('mfa_disabled', 1, 1, ARRAY['owner'])
ON CONFLICT DO NOTHING;

-- Function to trigger security alerts
CREATE OR REPLACE FUNCTION public.trigger_security_alert(
  p_alert_type text,
  p_severity text,
  p_title text,
  p_message text,
  p_triggered_by uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id uuid;
BEGIN
  -- Insert alert
  INSERT INTO public.security_alerts (
    alert_type,
    severity,
    title,
    message,
    triggered_by,
    metadata
  ) VALUES (
    p_alert_type,
    p_severity,
    p_title,
    p_message,
    COALESCE(p_triggered_by, auth.uid()),
    p_metadata
  ) RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$;

-- Create privacy policy acceptance table
CREATE TABLE IF NOT EXISTS public.privacy_policy_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  policy_version text NOT NULL DEFAULT '1.0',
  accepted_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  UNIQUE(user_id, policy_version)
);

-- Enable RLS
ALTER TABLE public.privacy_policy_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can view their own acceptances
CREATE POLICY "Users can view own acceptances"
ON public.privacy_policy_acceptances
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own acceptances
CREATE POLICY "Users can insert own acceptances"
ON public.privacy_policy_acceptances
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Owner can view all acceptances
CREATE POLICY "Owner can view all acceptances"
ON public.privacy_policy_acceptances
FOR SELECT
USING (get_user_role(auth.uid()) = 'owner'::user_role);