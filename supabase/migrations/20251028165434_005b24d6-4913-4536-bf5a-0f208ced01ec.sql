-- Add RLS policies for master role to view and update registration requests
-- Masters should be able to view and process registration requests

-- Drop existing policies to recreate with master support
DROP POLICY IF EXISTS "Owners can view all registration requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Owners can update registration requests" ON public.registration_requests;

-- Create new policy for owners and masters to view registration requests
CREATE POLICY "Owners and masters can view all registration requests"
ON public.registration_requests
FOR SELECT
TO public
USING (
  get_user_role(auth.uid()) IN ('owner', 'master')
);

-- Create new policy for owners and masters to update registration requests
CREATE POLICY "Owners and masters can update registration requests"
ON public.registration_requests
FOR UPDATE
TO public
USING (
  get_user_role(auth.uid()) IN ('owner', 'master')
);