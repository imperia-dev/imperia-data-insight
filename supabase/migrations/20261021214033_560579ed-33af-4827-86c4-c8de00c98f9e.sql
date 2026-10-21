ALTER FUNCTION public.accept_confidentiality_policy(uuid,text,boolean,text) SECURITY INVOKER;
GRANT INSERT ON public.confidentiality_acceptances TO authenticated;
CREATE POLICY "Create own confidentiality evidence" ON public.confidentiality_acceptances FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE FUNCTION public.validate_confidentiality_acceptance() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_policy public.confidentiality_policies%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Authenticated account must match acceptance' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_policy FROM public.confidentiality_policies WHERE published_at<=now() ORDER BY published_at DESC,created_at DESC,version DESC LIMIT 1;
 IF v_policy.id IS NULL OR NEW.policy_id IS DISTINCT FROM v_policy.id OR NEW.policy_sha256 IS DISTINCT FROM v_policy.body_sha256 THEN RAISE EXCEPTION 'Current policy and hash required' USING ERRCODE='22023'; END IF;
 IF NEW.declaration IS DISTINCT FROM 'Li, compreendi e assumo os deveres de confidencialidade e uso autorizado descritos nesta versão.' THEN RAISE EXCEPTION 'Explicit declaration required' USING ERRCODE='22023'; END IF;
 NEW.id := gen_random_uuid();
 NEW.accepted_at := now(); NEW.created_at := now(); NEW.updated_at := now();
 NEW.account_email := auth.jwt()->>'email'; NEW.authentication_method := auth.jwt()->'amr';
 NEW.user_agent := left(regexp_replace(regexp_replace(coalesce(NEW.user_agent,''),'<[^>]*>','','g'),'[[:cntrl:]]','','g'),500);
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_confidentiality_acceptance BEFORE INSERT ON public.confidentiality_acceptances FOR EACH ROW EXECUTE FUNCTION public.validate_confidentiality_acceptance();
REVOKE ALL ON FUNCTION public.validate_confidentiality_acceptance() FROM PUBLIC,anon,authenticated;