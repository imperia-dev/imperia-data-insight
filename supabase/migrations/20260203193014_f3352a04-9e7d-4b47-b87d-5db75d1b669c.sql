
-- Drop existing restrictive policies on user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners can manage all user roles" ON public.user_roles;

-- Create new policies that allow both owner and master to view all roles
CREATE POLICY "Owner and master can view all user roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'master')
  );

-- Allow users to view their own role (for other roles like operation, admin, etc.)
CREATE POLICY "Users can view own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owner can manage all user roles (insert, update, delete)
CREATE POLICY "Owner can manage all user roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'))
  WITH CHECK (has_role(auth.uid(), 'owner'));
