-- Add MFA fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_enrollment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS mfa_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_backup_codes_generated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS trusted_devices jsonb DEFAULT '[]'::jsonb;

-- Create table for MFA backup codes (encrypted)
CREATE TABLE IF NOT EXISTS public.mfa_backup_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used boolean DEFAULT false,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, code_hash)
);

-- Create table for MFA audit logs
CREATE TABLE IF NOT EXISTS public.mfa_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event_type text NOT NULL, -- 'enrollment', 'challenge_success', 'challenge_failed', 'disabled', 'backup_used'
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for backup codes
CREATE POLICY "Users can view own backup codes" 
ON public.mfa_backup_codes 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can manage own backup codes" 
ON public.mfa_backup_codes 
FOR ALL 
USING (user_id = auth.uid());

-- RLS Policies for MFA audit logs
CREATE POLICY "Users can view own MFA logs" 
ON public.mfa_audit_logs 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can insert MFA logs" 
ON public.mfa_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- Function to log MFA events
CREATE OR REPLACE FUNCTION public.log_mfa_event(
  p_event_type text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.mfa_audit_logs (
    user_id,
    event_type,
    ip_address,
    metadata
  ) VALUES (
    auth.uid(),
    p_event_type,
    inet_client_addr(),
    p_metadata
  );
END;
$$;

-- Function to generate backup codes
CREATE OR REPLACE FUNCTION public.generate_mfa_backup_codes()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  codes text[] := '{}';
  new_code text;
  i integer;
BEGIN
  -- Delete existing unused codes
  DELETE FROM public.mfa_backup_codes 
  WHERE user_id = auth.uid() AND used = false;
  
  -- Generate 10 new codes
  FOR i IN 1..10 LOOP
    -- Generate a random 8-character alphanumeric code
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) for 8));
    codes := array_append(codes, new_code);
    
    -- Store hashed version
    INSERT INTO public.mfa_backup_codes (user_id, code_hash)
    VALUES (auth.uid(), crypt(new_code, gen_salt('bf')));
  END LOOP;
  
  -- Update profile
  UPDATE public.profiles 
  SET mfa_backup_codes_generated_at = now()
  WHERE id = auth.uid();
  
  PERFORM public.log_mfa_event('backup_codes_generated');
  
  RETURN codes;
END;
$$;

-- Function to verify backup code
CREATE OR REPLACE FUNCTION public.verify_mfa_backup_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_valid boolean := false;
BEGIN
  -- Check if code exists and is unused
  UPDATE public.mfa_backup_codes
  SET used = true, used_at = now()
  WHERE user_id = auth.uid()
    AND used = false
    AND code_hash = crypt(upper(p_code), code_hash);
  
  GET DIAGNOSTICS is_valid = ROW_COUNT > 0;
  
  IF is_valid THEN
    PERFORM public.log_mfa_event('backup_code_used', jsonb_build_object('code_used', true));
  END IF;
  
  RETURN is_valid;
END;
$$;