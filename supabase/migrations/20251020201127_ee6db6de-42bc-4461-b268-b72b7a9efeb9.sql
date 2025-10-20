-- Add policy to allow financeiro role to update service_provider_protocols status
CREATE POLICY "financeiro_update_payment_status_spp"
ON public.service_provider_protocols
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'financeiro'::app_role) OR
  get_user_role(auth.uid()) = ANY(ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])
)
WITH CHECK (
  has_role(auth.uid(), 'financeiro'::app_role) OR
  get_user_role(auth.uid()) = ANY(ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])
);

-- Add same policy for reviewer_protocols
CREATE POLICY "financeiro_update_payment_status_rp"
ON public.reviewer_protocols
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'financeiro'::app_role) OR
  get_user_role(auth.uid()) = ANY(ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])
)
WITH CHECK (
  has_role(auth.uid(), 'financeiro'::app_role) OR
  get_user_role(auth.uid()) = ANY(ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])
);