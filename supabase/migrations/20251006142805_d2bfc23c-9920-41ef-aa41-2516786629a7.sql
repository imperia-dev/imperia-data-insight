-- Drop any existing policies on protocol_workflow_steps that might be causing issues
DROP POLICY IF EXISTS "Users can view workflow steps" ON protocol_workflow_steps;
DROP POLICY IF EXISTS "Owner can manage workflow steps" ON protocol_workflow_steps;

-- Create proper RLS policies using the security definer function
CREATE POLICY "Owner, master and admin can view workflow steps"
  ON protocol_workflow_steps
  FOR SELECT
  USING (get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

CREATE POLICY "Owner, master and admin can manage workflow steps"
  ON protocol_workflow_steps
  FOR ALL
  USING (get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));