-- Fix the duplicate policy issue and complete the migration

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Owner can manage suppliers" ON public.suppliers;

-- 13. Recreate RLS policies for suppliers
CREATE POLICY "Owner can manage suppliers"
ON public.suppliers
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Ensure other policies are created
CREATE POLICY IF NOT EXISTS "Admin and master can view suppliers"
ON public.suppliers
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'master'::user_role]));