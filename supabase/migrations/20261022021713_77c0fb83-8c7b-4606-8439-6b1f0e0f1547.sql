-- Email helper participates in anonymous token-based provider RLS; return NULL, never reveal data, for no actor.
GRANT EXECUTE ON FUNCTION public.get_user_email(uuid) TO anon;
REVOKE EXECUTE ON FUNCTION public.reset_failed_attempts(uuid), public.track_failed_access(uuid) FROM authenticated;
CREATE OR REPLACE FUNCTION public.protect_order_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE actor uuid := auth.uid(); role_name text := public.get_user_role(auth.uid())::text; mapping text;
BEGIN
  IF auth.role() = 'service_role' OR role_name IN ('owner','master','admin') THEN RETURN NEW; END IF;
  IF NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to AND NEW."account_ID" IS NOT DISTINCT FROM OLD."account_ID" AND NEW.order_number IS NOT DISTINCT FROM OLD.order_number THEN RETURN NEW; END IF;
  IF actor IS NULL OR role_name IS DISTINCT FROM 'operation' OR NEW.order_number IS DISTINCT FROM OLD.order_number THEN RAISE EXCEPTION 'Forbidden assignment change' USING ERRCODE='42501'; END IF;
  SELECT operation_account_id::text INTO mapping FROM public.profiles WHERE id=actor;
  IF OLD.status_order IS DISTINCT FROM 'available' OR OLD.assigned_to IS NOT NULL OR NEW.assigned_to IS DISTINCT FROM actor OR NEW.status_order IS DISTINCT FROM 'in_progress' OR mapping IS NULL OR NEW."account_ID"::text IS DISTINCT FROM mapping THEN RAISE EXCEPTION 'Invalid order claim' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.protect_order_assignment() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.protect_order_assignment() TO service_role;
CREATE TRIGGER protect_order_assignment_before_update BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.protect_order_assignment();
CREATE OR REPLACE FUNCTION public.validate_session(p_session_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_session record; v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('valid',false,'reason','unauthenticated'); END IF;
  SELECT * INTO v_session FROM public.active_sessions WHERE session_token=p_session_token AND user_id=auth.uid() AND revoked_at IS NULL AND expires_at>v_now;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid',false,'reason','session_not_found_or_expired'); END IF;
  UPDATE public.active_sessions SET last_activity=v_now WHERE id=v_session.id;
  RETURN jsonb_build_object('valid',true,'user_id',v_session.user_id,'expires_at',v_session.expires_at,'last_activity',v_now);
END; $$;
REVOKE EXECUTE ON FUNCTION public.validate_session(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_session(text) TO authenticated, service_role;