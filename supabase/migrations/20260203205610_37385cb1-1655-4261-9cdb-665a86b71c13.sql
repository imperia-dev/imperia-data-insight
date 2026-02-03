-- Drop existing SELECT policy that's too restrictive
DROP POLICY IF EXISTS "Owner and master can view limits" ON public.user_document_limits;

-- Create policy allowing users to view their own limits
CREATE POLICY "Users can view own limits"
  ON public.user_document_limits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create policy for owner and master to view all limits (for management)
CREATE POLICY "Owner and master can view all limits"
  ON public.user_document_limits
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'master')
  );