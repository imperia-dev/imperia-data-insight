-- Allow service providers to update their own protocols (payment info and approval)
CREATE POLICY "provider_update_own_payment_info"
ON public.service_provider_protocols
FOR UPDATE
TO public
USING (
  provider_email = public.get_user_email(auth.uid())
)
WITH CHECK (
  provider_email = public.get_user_email(auth.uid())
);