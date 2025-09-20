-- Fix the policy creation syntax
DROP POLICY IF EXISTS "Admin and master can view suppliers" ON public.suppliers;

CREATE POLICY "Admin and master can view suppliers"
ON public.suppliers
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'master'::user_role]));