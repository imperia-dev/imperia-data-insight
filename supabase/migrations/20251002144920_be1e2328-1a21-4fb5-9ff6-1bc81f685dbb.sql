-- Security Fix 1: Secure company_costs_v by creating a security definer function
-- Drop the existing view
DROP VIEW IF EXISTS public.company_costs_v;

-- Create a security definer function to safely access company costs
CREATE OR REPLACE FUNCTION public.get_company_costs_view()
RETURNS TABLE (
  id uuid,
  date date,
  amount numeric,
  category text,
  sub_category text,
  description text,
  observations text,
  files text[],
  created_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only owner role can access
  IF public.get_user_role(auth.uid()) != 'owner'::user_role THEN
    RAISE EXCEPTION 'Unauthorized access to company costs';
  END IF;

  RETURN QUERY
  SELECT 
    cc.id,
    cc.date,
    cc.amount,
    cc.category,
    cc.sub_category,
    cc.description,
    cc.observations,
    cc.files,
    cc.created_by,
    cc.created_at,
    cc.updated_at
  FROM public.company_costs cc;
END;
$$;

-- Security Fix 2: Secure chat_reactions - require authentication
DROP POLICY IF EXISTS "Users can view reactions" ON public.chat_reactions;

CREATE POLICY "Authenticated users can view reactions"
ON public.chat_reactions
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
);