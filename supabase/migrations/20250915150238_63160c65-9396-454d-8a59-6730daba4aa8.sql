-- Create extension for encryption if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a secure key storage table for encryption keys (only accessible by database functions)
CREATE TABLE IF NOT EXISTS private.encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  key_value text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Ensure private schema exists
CREATE SCHEMA IF NOT EXISTS private;

-- Revoke all permissions on private schema from public
REVOKE ALL ON SCHEMA private FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM public;

-- Insert encryption key for service provider data (using a generated key)
INSERT INTO private.encryption_keys (key_name, key_value)
VALUES ('service_provider_key', encode(gen_random_bytes(32), 'base64'))
ON CONFLICT (key_name) DO NOTHING;

-- Create audit log table for sensitive data access
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  user_id uuid,
  record_id uuid,
  accessed_fields text[],
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only owner can view audit logs
CREATE POLICY "Only owner can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Create function to encrypt sensitive data
CREATE OR REPLACE FUNCTION private.encrypt_sensitive_data(data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get the encryption key
  SELECT key_value INTO encryption_key 
  FROM private.encryption_keys 
  WHERE key_name = 'service_provider_key';
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;
  
  -- Return encrypted data
  RETURN encode(pgp_sym_encrypt(data, encryption_key), 'base64');
END;
$$;

-- Create function to decrypt sensitive data
CREATE OR REPLACE FUNCTION private.decrypt_sensitive_data(encrypted_data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Only allow owner role to decrypt
  IF get_user_role(auth.uid()) != 'owner'::user_role THEN
    RAISE EXCEPTION 'Unauthorized access to sensitive data';
  END IF;
  
  -- Get the encryption key
  SELECT key_value INTO encryption_key 
  FROM private.encryption_keys 
  WHERE key_name = 'service_provider_key';
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;
  
  -- Log the access
  INSERT INTO public.audit_logs (
    table_name, 
    operation, 
    user_id,
    ip_address,
    accessed_fields
  ) VALUES (
    'service_provider_costs',
    'decrypt',
    auth.uid(),
    inet_client_addr(),
    ARRAY['sensitive_data']
  );
  
  -- Return decrypted data
  RETURN pgp_sym_decrypt(decode(encrypted_data, 'base64'), encryption_key);
END;
$$;

-- Add encrypted columns to service_provider_costs
ALTER TABLE public.service_provider_costs 
ADD COLUMN IF NOT EXISTS cpf_encrypted text,
ADD COLUMN IF NOT EXISTS cnpj_encrypted text,
ADD COLUMN IF NOT EXISTS pix_key_encrypted text;

-- Migrate existing data to encrypted columns
UPDATE public.service_provider_costs
SET 
  cpf_encrypted = CASE 
    WHEN cpf IS NOT NULL AND cpf != '' 
    THEN private.encrypt_sensitive_data(cpf) 
    ELSE NULL 
  END,
  cnpj_encrypted = CASE 
    WHEN cnpj IS NOT NULL AND cnpj != '' 
    THEN private.encrypt_sensitive_data(cnpj) 
    ELSE NULL 
  END,
  pix_key_encrypted = CASE 
    WHEN pix_key IS NOT NULL AND pix_key != '' 
    THEN private.encrypt_sensitive_data(pix_key) 
    ELSE NULL 
  END
WHERE cpf_encrypted IS NULL OR cnpj_encrypted IS NULL OR pix_key_encrypted IS NULL;

-- Drop original unencrypted columns
ALTER TABLE public.service_provider_costs 
DROP COLUMN IF EXISTS cpf,
DROP COLUMN IF EXISTS cnpj,
DROP COLUMN IF EXISTS pix_key;

-- Create view for decrypted data (only accessible by owner)
CREATE OR REPLACE VIEW public.service_provider_costs_decrypted AS
SELECT 
  id,
  name,
  email,
  phone,
  type,
  competence,
  amount,
  invoice_number,
  days_worked,
  status,
  files,
  created_at,
  updated_at,
  created_by,
  CASE 
    WHEN cpf_encrypted IS NOT NULL 
    THEN private.decrypt_sensitive_data(cpf_encrypted)
    ELSE NULL
  END as cpf,
  CASE 
    WHEN cnpj_encrypted IS NOT NULL 
    THEN private.decrypt_sensitive_data(cnpj_encrypted)
    ELSE NULL
  END as cnpj,
  CASE 
    WHEN pix_key_encrypted IS NOT NULL 
    THEN private.decrypt_sensitive_data(pix_key_encrypted)
    ELSE NULL
  END as pix_key
FROM public.service_provider_costs;

-- Grant access to the view only for owner role
CREATE OR REPLACE FUNCTION public.can_access_decrypted_data()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_user_role(auth.uid()) = 'owner'::user_role;
$$;

-- Create trigger to log access to service provider costs
CREATE OR REPLACE FUNCTION public.log_service_provider_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    table_name,
    operation,
    user_id,
    record_id,
    ip_address
  ) VALUES (
    'service_provider_costs',
    TG_OP,
    auth.uid(),
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    inet_client_addr()
  );
  
  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_service_provider_access ON public.service_provider_costs;
CREATE TRIGGER audit_service_provider_access
AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.service_provider_costs
FOR EACH ROW
EXECUTE FUNCTION public.log_service_provider_access();

-- Create function to mask sensitive data for display
CREATE OR REPLACE FUNCTION public.mask_sensitive_string(input_text text, mask_type text DEFAULT 'partial')
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;
  
  CASE mask_type
    WHEN 'cpf' THEN
      -- Format: XXX.XXX.XXX-XX -> ***.***.***-XX
      IF length(input_text) >= 11 THEN
        RETURN '***.***.***-' || right(input_text, 2);
      END IF;
    WHEN 'cnpj' THEN
      -- Format: XX.XXX.XXX/XXXX-XX -> **.***.***/****-XX
      IF length(input_text) >= 14 THEN
        RETURN '**.***.***/****-' || right(input_text, 2);
      END IF;
    WHEN 'pix' THEN
      -- Show only first 3 and last 2 characters
      IF length(input_text) > 5 THEN
        RETURN left(input_text, 3) || repeat('*', length(input_text) - 5) || right(input_text, 2);
      END IF;
    WHEN 'email' THEN
      -- Show first 2 chars and domain
      IF position('@' in input_text) > 2 THEN
        RETURN left(split_part(input_text, '@', 1), 2) || 
               repeat('*', length(split_part(input_text, '@', 1)) - 2) || 
               '@' || split_part(input_text, '@', 2);
      END IF;
    WHEN 'phone' THEN
      -- Show area code and last 2 digits
      IF length(input_text) >= 10 THEN
        RETURN left(input_text, 2) || repeat('*', length(input_text) - 4) || right(input_text, 2);
      END IF;
    ELSE
      -- Default partial masking
      IF length(input_text) > 4 THEN
        RETURN left(input_text, 2) || repeat('*', length(input_text) - 4) || right(input_text, 2);
      ELSE
        RETURN repeat('*', length(input_text));
      END IF;
  END CASE;
  
  -- Fallback to full masking if pattern doesn't match
  RETURN repeat('*', length(input_text));
END;
$$;

-- Create view for masked data (for general viewing)
CREATE OR REPLACE VIEW public.service_provider_costs_masked AS
SELECT 
  id,
  name,
  public.mask_sensitive_string(email, 'email') as email,
  public.mask_sensitive_string(phone, 'phone') as phone,
  type,
  competence,
  amount,
  invoice_number,
  days_worked,
  status,
  files,
  created_at,
  updated_at,
  created_by,
  CASE 
    WHEN cpf_encrypted IS NOT NULL 
    THEN '***.***.***-**'
    ELSE NULL
  END as cpf_masked,
  CASE 
    WHEN cnpj_encrypted IS NOT NULL 
    THEN '**.***.***/****-**'
    ELSE NULL
  END as cnpj_masked,
  CASE 
    WHEN pix_key_encrypted IS NOT NULL 
    THEN '***************'
    ELSE NULL
  END as pix_key_masked
FROM public.service_provider_costs;

-- Add rate limiting function for sensitive data access
CREATE OR REPLACE FUNCTION public.check_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  access_count integer;
BEGIN
  -- Count accesses in the last hour
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND table_name = 'service_provider_costs'
    AND operation = 'decrypt'
    AND created_at > now() - interval '1 hour';
  
  -- Allow max 100 decryption operations per hour
  IF access_count > 100 THEN
    INSERT INTO public.audit_logs (
      table_name,
      operation,
      user_id,
      ip_address,
      accessed_fields
    ) VALUES (
      'service_provider_costs',
      'rate_limit_exceeded',
      auth.uid(),
      inet_client_addr(),
      ARRAY['blocked']
    );
    
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Update the decrypt function to include rate limiting
CREATE OR REPLACE FUNCTION private.decrypt_sensitive_data(encrypted_data text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Only allow owner role to decrypt
  IF get_user_role(auth.uid()) != 'owner'::user_role THEN
    RAISE EXCEPTION 'Unauthorized access to sensitive data';
  END IF;
  
  -- Check rate limit
  IF NOT public.check_rate_limit() THEN
    RAISE EXCEPTION 'Rate limit exceeded for sensitive data access';
  END IF;
  
  -- Get the encryption key
  SELECT key_value INTO encryption_key 
  FROM private.encryption_keys 
  WHERE key_name = 'service_provider_key';
  
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found';
  END IF;
  
  -- Log the access
  INSERT INTO public.audit_logs (
    table_name, 
    operation, 
    user_id,
    ip_address,
    accessed_fields
  ) VALUES (
    'service_provider_costs',
    'decrypt',
    auth.uid(),
    inet_client_addr(),
    ARRAY['sensitive_data']
  );
  
  -- Return decrypted data
  RETURN pgp_sym_decrypt(decode(encrypted_data, 'base64'), encryption_key);
END;
$$;