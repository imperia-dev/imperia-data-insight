CREATE OR REPLACE FUNCTION public.create_company(p_name text, p_description text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.companies (name, description, created_by)
  VALUES (p_name, p_description, auth.uid())
  RETURNING id INTO v_company_id;

  INSERT INTO public.company_memberships (company_id, user_id, role)
  VALUES (v_company_id, auth.uid(), 'admin');

  RETURN v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_company(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company(text, text) TO authenticated;