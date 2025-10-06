-- Drop existing restrictive policy
DROP POLICY IF EXISTS "owner_only_consolidated" ON consolidated_protocols;

-- Create new policies with proper role access
CREATE POLICY "Owner, master and admin can manage consolidated protocols"
  ON consolidated_protocols
  FOR ALL
  USING (get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

CREATE POLICY "Operation users can view consolidated protocols"
  ON consolidated_protocols
  FOR SELECT
  USING (get_user_role(auth.uid()) = 'operation');