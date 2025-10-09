-- ============================================
-- SEMANA 2: Rate Limiting, Brute Force Protection & Session Management
-- ============================================

-- ============================================
-- PARTE 1: Rate Limiting em Produção
-- ============================================

-- Tabela para armazenar entradas de rate limiting
CREATE TABLE public.rate_limit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  window_end timestamptz NOT NULL,
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_limit_identifier_endpoint ON public.rate_limit_entries(identifier, endpoint);
CREATE INDEX idx_rate_limit_window_end ON public.rate_limit_entries(window_end);
CREATE INDEX idx_rate_limit_blocked ON public.rate_limit_entries(blocked_until);

-- RLS: Apenas owners e sistema podem acessar
ALTER TABLE public.rate_limit_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage rate limit entries"
  ON public.rate_limit_entries
  FOR ALL
  USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Função para verificar rate limit (substitui Map em memória)
CREATE OR REPLACE FUNCTION public.check_rate_limit_v2(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry record;
  v_now timestamptz := now();
  v_window_end timestamptz;
  v_allowed boolean;
  v_remaining integer;
BEGIN
  -- Buscar entrada ativa
  SELECT * INTO v_entry
  FROM public.rate_limit_entries
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_end > v_now
  ORDER BY window_end DESC
  LIMIT 1;
  
  -- Se bloqueado, retornar negado
  IF v_entry.blocked_until IS NOT NULL AND v_entry.blocked_until > v_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_entry.blocked_until,
      'reason', 'temporarily_blocked'
    );
  END IF;
  
  -- Se não existe ou janela expirou, criar nova
  IF v_entry IS NULL OR v_entry.window_end <= v_now THEN
    v_window_end := v_now + (p_window_seconds || ' seconds')::interval;
    
    INSERT INTO public.rate_limit_entries (
      identifier, endpoint, request_count, window_start, window_end
    ) VALUES (
      p_identifier, p_endpoint, 1, v_now, v_window_end
    );
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_requests - 1,
      'reset_at', v_window_end
    );
  END IF;
  
  -- Incrementar contador
  UPDATE public.rate_limit_entries
  SET request_count = request_count + 1,
      updated_at = v_now
  WHERE id = v_entry.id;
  
  v_remaining := p_max_requests - (v_entry.request_count + 1);
  v_allowed := v_remaining >= 0;
  
  -- Se excedeu, bloquear por tempo adicional
  IF NOT v_allowed THEN
    UPDATE public.rate_limit_entries
    SET blocked_until = v_now + (p_window_seconds * 2 || ' seconds')::interval
    WHERE id = v_entry.id;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining', GREATEST(v_remaining, 0),
    'reset_at', v_entry.window_end,
    'blocked_until', CASE WHEN NOT v_allowed THEN v_now + (p_window_seconds * 2 || ' seconds')::interval ELSE NULL END
  );
END;
$$;

-- Função de limpeza automática de entradas antigas
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_entries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_entries
  WHERE window_end < (now() - interval '1 hour')
    AND (blocked_until IS NULL OR blocked_until < now());
END;
$$;

-- ============================================
-- PARTE 2: Proteção Contra Brute Force
-- ============================================

-- Tabela para armazenar todas as tentativas de login
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  attempt_type text NOT NULL,
  success boolean NOT NULL,
  failure_reason text,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_login_attempts_identifier ON public.login_attempts(identifier);
CREATE INDEX idx_login_attempts_created_at ON public.login_attempts(created_at);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_success ON public.login_attempts(success, created_at);

-- RLS: Usuários veem apenas suas tentativas
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login attempts"
  ON public.login_attempts
  FOR SELECT
  USING (
    identifier = get_user_email(auth.uid()) OR
    get_user_role(auth.uid()) = 'owner'::user_role
  );

CREATE POLICY "System can insert login attempts"
  ON public.login_attempts
  FOR INSERT
  WITH CHECK (true);

-- Tabela para gerenciar bloqueios de conta
CREATE TABLE public.account_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  identifier text NOT NULL,
  lockout_type text NOT NULL,
  locked_at timestamptz DEFAULT now(),
  locked_until timestamptz,
  reason text NOT NULL,
  failed_attempts integer NOT NULL,
  unlocked_at timestamptz,
  unlocked_by uuid,
  metadata jsonb
);

CREATE INDEX idx_account_lockouts_user_id ON public.account_lockouts(user_id);
CREATE INDEX idx_account_lockouts_identifier ON public.account_lockouts(identifier);
CREATE INDEX idx_account_lockouts_locked_until ON public.account_lockouts(locked_until);
CREATE INDEX idx_account_lockouts_active ON public.account_lockouts(unlocked_at) WHERE unlocked_at IS NULL;

-- RLS: Usuários veem apenas seus bloqueios
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lockouts"
  ON public.account_lockouts
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    get_user_role(auth.uid()) = 'owner'::user_role
  );

CREATE POLICY "Owners can manage lockouts"
  ON public.account_lockouts
  FOR ALL
  USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Função para verificar e aplicar bloqueio progressivo
CREATE OR REPLACE FUNCTION public.check_and_apply_lockout(
  p_identifier text,
  p_attempt_type text DEFAULT 'login'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_failures integer;
  v_lockout record;
  v_now timestamptz := now();
  v_lockout_duration interval;
  v_lockout_type text;
BEGIN
  -- Verificar se já está bloqueado
  SELECT * INTO v_lockout
  FROM public.account_lockouts
  WHERE identifier = p_identifier
    AND unlocked_at IS NULL
    AND (locked_until IS NULL OR locked_until > v_now)
  ORDER BY locked_at DESC
  LIMIT 1;
  
  IF v_lockout IS NOT NULL THEN
    RETURN jsonb_build_object(
      'locked', true,
      'locked_until', v_lockout.locked_until,
      'reason', v_lockout.reason,
      'type', v_lockout.lockout_type
    );
  END IF;
  
  -- Contar falhas recentes (últimos 30 minutos)
  SELECT COUNT(*) INTO v_recent_failures
  FROM public.login_attempts
  WHERE identifier = p_identifier
    AND attempt_type = p_attempt_type
    AND success = false
    AND created_at > (v_now - interval '30 minutes');
  
  -- Aplicar bloqueio progressivo
  IF v_recent_failures >= 10 THEN
    v_lockout_duration := interval '24 hours';
    v_lockout_type := 'extended';
  ELSIF v_recent_failures >= 5 THEN
    v_lockout_duration := interval '1 hour';
    v_lockout_type := 'temporary';
  ELSE
    RETURN jsonb_build_object('locked', false);
  END IF;
  
  -- Criar bloqueio
  INSERT INTO public.account_lockouts (
    identifier,
    lockout_type,
    locked_until,
    reason,
    failed_attempts
  ) VALUES (
    p_identifier,
    v_lockout_type,
    v_now + v_lockout_duration,
    'Too many failed ' || p_attempt_type || ' attempts',
    v_recent_failures
  );
  
  -- Disparar alerta de segurança
  PERFORM public.trigger_security_alert(
    'account_lockout',
    CASE v_lockout_type
      WHEN 'extended' THEN 'high'
      ELSE 'medium'
    END,
    'Account Locked: ' || p_identifier,
    format('Account locked for %s after %s failed attempts', 
           v_lockout_duration, v_recent_failures),
    NULL,
    jsonb_build_object(
      'identifier', p_identifier,
      'failed_attempts', v_recent_failures,
      'lockout_type', v_lockout_type
    )
  );
  
  RETURN jsonb_build_object(
    'locked', true,
    'locked_until', v_now + v_lockout_duration,
    'reason', 'Too many failed attempts',
    'type', v_lockout_type
  );
END;
$$;

-- Função para registrar tentativa de login
CREATE OR REPLACE FUNCTION public.log_login_attempt(
  p_identifier text,
  p_attempt_type text,
  p_success boolean,
  p_failure_reason text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_id uuid;
BEGIN
  INSERT INTO public.login_attempts (
    identifier,
    attempt_type,
    success,
    failure_reason,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_identifier,
    p_attempt_type,
    p_success,
    p_failure_reason,
    p_ip_address,
    p_user_agent,
    p_metadata
  ) RETURNING id INTO v_attempt_id;
  
  -- Se falhou, verificar se deve bloquear
  IF NOT p_success THEN
    PERFORM public.check_and_apply_lockout(p_identifier, p_attempt_type);
  END IF;
  
  RETURN v_attempt_id;
END;
$$;

-- ============================================
-- PARTE 3: Gestão de Sessões JWT
-- ============================================

-- Tabela para rastrear sessões ativas
CREATE TABLE public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  refresh_token_hash text,
  ip_address inet,
  user_agent text,
  device_fingerprint text,
  last_activity timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX idx_active_sessions_token ON public.active_sessions(session_token);
CREATE INDEX idx_active_sessions_expires ON public.active_sessions(expires_at);
CREATE INDEX idx_active_sessions_active ON public.active_sessions(revoked_at) WHERE revoked_at IS NULL;

-- RLS: Usuários gerenciam apenas suas sessões
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.active_sessions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own sessions"
  ON public.active_sessions
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Owners can view all sessions"
  ON public.active_sessions
  FOR SELECT
  USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Função para validar sessão
CREATE OR REPLACE FUNCTION public.validate_session(
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session record;
  v_now timestamptz := now();
BEGIN
  SELECT * INTO v_session
  FROM public.active_sessions
  WHERE session_token = p_session_token
    AND revoked_at IS NULL
    AND expires_at > v_now;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'session_not_found_or_expired'
    );
  END IF;
  
  -- Atualizar última atividade
  UPDATE public.active_sessions
  SET last_activity = v_now
  WHERE id = v_session.id;
  
  RETURN jsonb_build_object(
    'valid', true,
    'user_id', v_session.user_id,
    'expires_at', v_session.expires_at,
    'last_activity', v_now
  );
END;
$$;

-- Função para revogar sessões
CREATE OR REPLACE FUNCTION public.revoke_user_sessions(
  p_user_id uuid,
  p_reason text DEFAULT 'user_initiated',
  p_keep_current boolean DEFAULT false,
  p_current_session_token text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revoked_count integer;
BEGIN
  UPDATE public.active_sessions
  SET 
    revoked_at = now(),
    revoke_reason = p_reason
  WHERE user_id = p_user_id
    AND revoked_at IS NULL
    AND (NOT p_keep_current OR session_token != p_current_session_token);
  
  GET DIAGNOSTICS v_revoked_count = ROW_COUNT;
  
  -- Log evento de segurança
  IF v_revoked_count > 0 THEN
    PERFORM public.log_security_event(
      'sessions_revoked',
      'info',
      jsonb_build_object(
        'user_id', p_user_id,
        'sessions_revoked', v_revoked_count,
        'reason', p_reason
      )
    );
  END IF;
  
  RETURN v_revoked_count;
END;
$$;

-- ============================================
-- PARTE 4: Notificações de Login Suspeito
-- ============================================

-- Tabela para rastrear notificações de login
CREATE TABLE public.login_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  login_attempt_id uuid REFERENCES public.login_attempts(id),
  sent_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  metadata jsonb
);

CREATE INDEX idx_login_notifications_user_id ON public.login_notifications(user_id);
CREATE INDEX idx_login_notifications_sent_at ON public.login_notifications(sent_at);

-- RLS: Usuários veem apenas suas notificações
ALTER TABLE public.login_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.login_notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.login_notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON public.login_notifications
  FOR UPDATE
  USING (user_id = auth.uid());