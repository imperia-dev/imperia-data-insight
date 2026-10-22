DO $$ DECLARE r record; q text; c text; BEGIN
FOR r IN SELECT * FROM pg_policies WHERE schemaname='public' AND (qual LIKE '%get_user_email(auth.uid())%' OR with_check LIKE '%get_user_email(auth.uid())%') LOOP
q := replace(r.qual,'get_user_email(auth.uid())','(CASE WHEN auth.uid() IS NULL THEN NULL::text ELSE public.get_user_email(auth.uid()) END)');
c := replace(r.with_check,'get_user_email(auth.uid())','(CASE WHEN auth.uid() IS NULL THEN NULL::text ELSE public.get_user_email(auth.uid()) END)');
EXECUTE format('ALTER POLICY %I ON public.%I%s%s',r.policyname,r.tablename,CASE WHEN q IS NULL THEN '' ELSE ' USING ('||q||')' END,CASE WHEN c IS NULL THEN '' ELSE ' WITH CHECK ('||c||')' END);
END LOOP; END; $$;
REVOKE EXECUTE ON FUNCTION public.get_user_email(uuid) FROM PUBLIC, anon;