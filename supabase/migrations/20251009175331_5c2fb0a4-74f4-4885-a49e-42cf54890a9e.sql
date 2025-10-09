-- Week 4: Idempotency Keys + Secret Rotation
-- Creating tables, functions, and policies for idempotent operations and secret management

-- 1. IDEMPOTENCY KEYS TABLE
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  operation_type text NOT NULL,
  request_hash text NOT NULL,
  response_data jsonb,
  status text NOT NULL DEFAULT 'processing', -- processing, completed, failed
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key ON public.idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON public.idempotency_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user ON public.idempotency_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_status ON public.idempotency_keys(status);

COMMENT ON TABLE public.idempotency_keys IS 'Stores idempotency keys to prevent duplicate operations';
COMMENT ON COLUMN public.idempotency_keys.key IS 'Unique idempotency key provided by client';
COMMENT ON COLUMN public.idempotency_keys.request_hash IS 'Hash of request parameters for validation';
COMMENT ON COLUMN public.idempotency_keys.response_data IS 'Cached response for completed operations';

-- 2. SECRET ROTATION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.secret_rotation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_name text NOT NULL,
  rotation_type text NOT NULL, -- manual, scheduled, compromised
  old_secret_hash text,
  new_secret_hash text,
  rotated_by uuid REFERENCES auth.users(id),
  rotated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active', -- active, expired, revoked
  metadata jsonb DEFAULT '{}'::jsonb,
  next_rotation_due timestamptz
);

CREATE INDEX IF NOT EXISTS idx_secret_rotation_logs_name ON public.secret_rotation_logs(secret_name);
CREATE INDEX IF NOT EXISTS idx_secret_rotation_logs_status ON public.secret_rotation_logs(status);
CREATE INDEX IF NOT EXISTS idx_secret_rotation_logs_expires ON public.secret_rotation_logs(expires_at);
CREATE INDEX IF NOT EXISTS idx_secret_rotation_logs_next_rotation ON public.secret_rotation_logs(next_rotation_due);

COMMENT ON TABLE public.secret_rotation_logs IS 'Tracks all secret rotation events and expiration dates';
COMMENT ON COLUMN public.secret_rotation_logs.rotation_type IS 'Type of rotation: manual, scheduled, or compromised';
COMMENT ON COLUMN public.secret_rotation_logs.next_rotation_due IS 'When the next rotation should occur';

-- 3. FUNCTION: Cleanup expired idempotency keys
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE expires_at < now();
  
  -- Log cleanup activity
  INSERT INTO public.audit_logs (
    table_name,
    operation,
    user_id,
    record_id
  ) VALUES (
    'idempotency_keys',
    'cleanup_expired',
    NULL,
    NULL
  );
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_idempotency_keys IS 'Removes expired idempotency keys (run daily via cron)';

-- 4. FUNCTION: Check secret expiration status
CREATE OR REPLACE FUNCTION public.check_secret_expiration()
RETURNS TABLE(
  secret_name text,
  days_until_expiration integer,
  last_rotation_date timestamptz,
  rotation_type text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    srl.secret_name,
    EXTRACT(days FROM (srl.expires_at - now()))::integer as days_until_expiration,
    srl.rotated_at as last_rotation_date,
    srl.rotation_type,
    srl.status
  FROM (
    SELECT DISTINCT ON (secret_name) *
    FROM public.secret_rotation_logs
    WHERE status = 'active'
    ORDER BY secret_name, rotated_at DESC
  ) srl
  WHERE srl.expires_at < (now() + interval '30 days')
  ORDER BY days_until_expiration ASC;
END;
$$;

COMMENT ON FUNCTION public.check_secret_expiration IS 'Returns secrets expiring within 30 days';

-- 5. FUNCTION: Get active secrets summary
CREATE OR REPLACE FUNCTION public.get_active_secrets_summary()
RETURNS TABLE(
  secret_name text,
  last_rotated timestamptz,
  expires_at timestamptz,
  days_until_expiration integer,
  rotation_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is owner
  IF get_user_role(auth.uid()) != 'owner'::user_role THEN
    RAISE EXCEPTION 'Unauthorized: Only owners can view secret information';
  END IF;

  RETURN QUERY
  SELECT 
    latest.secret_name,
    latest.rotated_at as last_rotated,
    latest.expires_at,
    EXTRACT(days FROM (latest.expires_at - now()))::integer as days_until_expiration,
    counts.rotation_count
  FROM (
    SELECT DISTINCT ON (secret_name) 
      secret_name,
      rotated_at,
      expires_at,
      status
    FROM public.secret_rotation_logs
    WHERE status = 'active'
    ORDER BY secret_name, rotated_at DESC
  ) latest
  LEFT JOIN (
    SELECT secret_name, COUNT(*) as rotation_count
    FROM public.secret_rotation_logs
    GROUP BY secret_name
  ) counts ON latest.secret_name = counts.secret_name
  ORDER BY latest.expires_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_active_secrets_summary IS 'Returns summary of all active secrets (owner only)';

-- 6. FUNCTION: Log secret rotation
CREATE OR REPLACE FUNCTION public.log_secret_rotation(
  p_secret_name text,
  p_rotation_type text,
  p_old_hash text,
  p_new_hash text,
  p_expires_in_days integer DEFAULT 90
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rotation_id uuid;
BEGIN
  -- Check if user is owner
  IF get_user_role(auth.uid()) != 'owner'::user_role THEN
    RAISE EXCEPTION 'Unauthorized: Only owners can rotate secrets';
  END IF;

  -- Mark old secrets as expired
  UPDATE public.secret_rotation_logs
  SET status = 'expired'
  WHERE secret_name = p_secret_name
    AND status = 'active';

  -- Insert new rotation log
  INSERT INTO public.secret_rotation_logs (
    secret_name,
    rotation_type,
    old_secret_hash,
    new_secret_hash,
    rotated_by,
    expires_at,
    next_rotation_due,
    status
  ) VALUES (
    p_secret_name,
    p_rotation_type,
    p_old_hash,
    p_new_hash,
    auth.uid(),
    now() + (p_expires_in_days || ' days')::interval,
    now() + ((p_expires_in_days - 7) || ' days')::interval, -- Remind 7 days before
    'active'
  ) RETURNING id INTO v_rotation_id;

  -- Log security event
  PERFORM public.log_security_event(
    'secret_rotation',
    'info',
    jsonb_build_object(
      'secret_name', p_secret_name,
      'rotation_type', p_rotation_type,
      'rotation_id', v_rotation_id
    )
  );

  RETURN v_rotation_id;
END;
$$;

COMMENT ON FUNCTION public.log_secret_rotation IS 'Logs a secret rotation event and expires old secrets';

-- 7. RLS POLICIES for idempotency_keys
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own idempotency keys"
ON public.idempotency_keys
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR get_user_role(auth.uid()) = ANY(ARRAY['owner'::user_role, 'master'::user_role]));

CREATE POLICY "Users can insert their own idempotency keys"
ON public.idempotency_keys
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own idempotency keys"
ON public.idempotency_keys
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only owners can delete idempotency keys"
ON public.idempotency_keys
FOR DELETE
TO authenticated
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- 8. RLS POLICIES for secret_rotation_logs
ALTER TABLE public.secret_rotation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only owners can view secret rotation logs"
ON public.secret_rotation_logs
FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Only owners can insert secret rotation logs"
ON public.secret_rotation_logs
FOR INSERT
TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Only owners can update secret rotation logs"
ON public.secret_rotation_logs
FOR UPDATE
TO authenticated
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- 9. TRIGGER: Update security_events on critical secret operations
CREATE OR REPLACE FUNCTION public.notify_secret_rotation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log to security events for monitoring
  INSERT INTO public.security_events (
    event_type,
    severity,
    user_id,
    details
  ) VALUES (
    'secret_rotation',
    CASE 
      WHEN NEW.rotation_type = 'compromised' THEN 'high'
      WHEN NEW.rotation_type = 'scheduled' THEN 'low'
      ELSE 'medium'
    END,
    NEW.rotated_by,
    jsonb_build_object(
      'secret_name', NEW.secret_name,
      'rotation_type', NEW.rotation_type,
      'expires_at', NEW.expires_at
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_secret_rotation
AFTER INSERT ON public.secret_rotation_logs
FOR EACH ROW
EXECUTE FUNCTION public.notify_secret_rotation();

COMMENT ON TRIGGER trigger_notify_secret_rotation ON public.secret_rotation_logs IS 'Logs secret rotations to security_events table';