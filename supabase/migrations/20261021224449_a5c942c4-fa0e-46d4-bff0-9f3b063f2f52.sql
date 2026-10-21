DO $hardening$
DECLARE r record; d text;
BEGIN
  FOR r IN SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('get_company_costs_view','get_service_provider_sensitive_data','get_active_secrets_summary','log_secret_rotation','approve_user','reject_user') LOOP
    d := pg_get_functiondef(r.oid);
    IF r.proname IN ('approve_user','reject_user') THEN
      d := replace(d, 'IF get_user_role(auth.uid()) NOT IN (''owner'', ''master'') THEN', 'IF auth.uid() IS NULL OR COALESCE(public.get_user_role(auth.uid())::text, '''') NOT IN (''owner'', ''master'') THEN');
    ELSE
      d := replace(d, 'IF public.get_user_role(auth.uid()) != ''owner''::user_role THEN', 'IF auth.uid() IS NULL OR public.get_user_role(auth.uid()) IS DISTINCT FROM ''owner''::public.user_role THEN');
      d := replace(d, 'IF get_user_role(auth.uid()) != ''owner''::user_role THEN', 'IF auth.uid() IS NULL OR public.get_user_role(auth.uid()) IS DISTINCT FROM ''owner''::public.user_role THEN');
    END IF;
    IF d = pg_get_functiondef(r.oid) THEN RAISE EXCEPTION 'Expected authorization guard missing: %', r.proname; END IF;
    EXECUTE d;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon',r.oid::regprocedure);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',r.oid::regprocedure);
  END LOOP;
  FOR r IN SELECT p.oid, p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('revoke_user_sessions','reset_failed_attempts','track_failed_access') LOOP
    d := pg_get_functiondef(r.oid);
    d := replace(d, E'BEGIN\n', E'BEGIN\n  IF COALESCE(auth.role(), '''') <> ''service_role'' AND (auth.uid() IS NULL OR p_user_id IS NULL OR (p_user_id IS DISTINCT FROM auth.uid() AND COALESCE(public.get_user_role(auth.uid())::text, '''') NOT IN (''owner'', ''master''))) THEN\n    RAISE EXCEPTION ''Forbidden'' USING ERRCODE = ''42501'';\n  END IF;\n');
    EXECUTE d;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon',r.oid::regprocedure);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',r.oid::regprocedure);
  END LOOP;
  d := pg_get_functiondef('public.sync_protocol_workflow_steps(uuid)'::regprocedure);
  d := replace(d, E'BEGIN\n', E'BEGIN\n  IF pg_trigger_depth() = 0 AND COALESCE(auth.role(), '''') <> ''service_role'' AND (auth.uid() IS NULL OR COALESCE(public.get_user_role(auth.uid())::text, '''') NOT IN (''owner'', ''master'', ''admin'')) THEN\n    RAISE EXCEPTION ''Forbidden'' USING ERRCODE = ''42501'';\n  END IF;\n');
  EXECUTE d;
  REVOKE EXECUTE ON FUNCTION public.sync_protocol_workflow_steps(uuid) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION public.sync_protocol_workflow_steps(uuid) TO authenticated, service_role;
  d := pg_get_functiondef('public.prevent_profile_privilege_escalation()'::regprocedure);
  d := replace(d, 'IF NEW.role IS DISTINCT FROM OLD.role', 'IF NEW.operation_account_id IS DISTINCT FROM OLD.operation_account_id OR NEW.role IS DISTINCT FROM OLD.role');
  EXECUTE d;
END;
$hardening$;
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT email::text FROM auth.users WHERE id = user_id AND (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR COALESCE(public.get_user_role(auth.uid())::text, '') IN ('owner','master','admin')))); $$;
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.validate_sensitive_access(p_table_name text, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() OR public.get_user_role(auth.uid()) IS DISTINCT FROM 'owner'::public.user_role THEN RETURN false; END IF;
  RETURN (SELECT count(*) <= 10 FROM public.audit_logs WHERE user_id = auth.uid() AND table_name=p_table_name AND created_at > now() - interval '5 minutes');
END; $$;
REVOKE EXECUTE ON FUNCTION public.validate_sensitive_access(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_sensitive_access(text,uuid) TO authenticated, service_role;
DO $history$
DECLARE t text; r record;
BEGIN
  FOREACH t IN ARRAY ARRAY['protocol_history','sms_verification_logs','login_attempts','login_notifications','mfa_audit_logs','security_events'] LOOP
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd='INSERT' LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',r.policyname,t);
    END LOOP;
    EXECUTE format('REVOKE INSERT ON public.%I FROM PUBLIC, anon, authenticated',t);
    EXECUTE format('GRANT INSERT ON public.%I TO service_role',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['lead_conversions','lead_events','lead_sessions','lead_pricing_analysis'] LOOP
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd='INSERT' AND with_check='true' LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',r.policyname,t);
    END LOOP;
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM PUBLIC, anon',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END; $history$;
CREATE POLICY "Privileged pricing analysis creation" ON public.lead_pricing_analysis FOR INSERT TO authenticated WITH CHECK (COALESCE(public.get_user_role(auth.uid())::text,'') IN ('owner','master','admin'));
-- Internal trigger functions continue running under their existing definer owner.
-- Logging is not callable anonymously. Login-attempt claims and lockouts must be server-observed.
REVOKE EXECUTE ON FUNCTION public.log_login_attempt(text,text,boolean,text,inet,text,jsonb), public.check_and_apply_lockout(text,text), public.trigger_security_alert(text,text,text,text,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_login_attempt(text,text,boolean,text,inet,text,jsonb), public.check_and_apply_lockout(text,text), public.trigger_security_alert(text,text,text,text,uuid,jsonb) TO service_role;
REVOKE EXECUTE ON FUNCTION public.log_security_event(text,text,jsonb), public.log_mfa_event(text,jsonb), public.log_sensitive_data_access(text,text,uuid,text[]), public.check_sensitive_data_rate_limit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_security_event(text,text,jsonb), public.log_mfa_event(text,jsonb), public.log_sensitive_data_access(text,text,uuid,text[]), public.check_sensitive_data_rate_limit() TO authenticated, service_role;
-- Deployment-time privilege assertions, no production records read or mutated.
DO $assertions$
DECLARE r record;
BEGIN
  FOR r IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('get_company_costs_view','get_service_provider_sensitive_data','get_active_secrets_summary','log_secret_rotation','approve_user','reject_user','revoke_user_sessions','reset_failed_attempts','track_failed_access','sync_protocol_workflow_steps','get_user_email','log_login_attempt','check_and_apply_lockout','trigger_security_alert') LOOP
    IF has_function_privilege('anon',r.oid,'EXECUTE') THEN RAISE EXCEPTION 'Anonymous execution remains enabled for %',r.oid::regprocedure; END IF;
  END LOOP;
END; $assertions$;