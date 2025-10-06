-- Add master role access to service_provider_protocols
CREATE POLICY "master_full_access_spp" 
ON public.service_provider_protocols
FOR ALL 
USING (get_user_role(auth.uid()) = 'master'::user_role);