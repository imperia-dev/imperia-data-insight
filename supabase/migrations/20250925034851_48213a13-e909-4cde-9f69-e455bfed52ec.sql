-- Add phone fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_token UUID NOT NULL DEFAULT gen_random_uuid(),
  sms_token TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  sms_verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create SMS verification logs table
CREATE TABLE IF NOT EXISTS public.sms_verification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('password_reset', 'phone_verification')),
  status TEXT NOT NULL CHECK (status IN ('sent', 'verified', 'failed')),
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_verification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for password_reset_tokens (only edge functions can access)
CREATE POLICY "System can manage password reset tokens" 
ON public.password_reset_tokens 
FOR ALL 
USING (false) 
WITH CHECK (false);

-- RLS Policies for sms_verification_logs
CREATE POLICY "Owner can view SMS logs" 
ON public.sms_verification_logs 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "System can insert SMS logs" 
ON public.sms_verification_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_tokens
  WHERE expires_at < NOW() OR used = true;
END;
$$;

-- Create function to generate 6-digit SMS code
CREATE OR REPLACE FUNCTION public.generate_sms_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$;

-- Create index for faster lookups
CREATE INDEX idx_password_reset_tokens_email_token ON public.password_reset_tokens(email_token);
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_sms_verification_logs_user_id ON public.sms_verification_logs(user_id);
CREATE INDEX idx_profiles_phone_number ON public.profiles(phone_number);