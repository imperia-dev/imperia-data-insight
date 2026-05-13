CREATE POLICY "to_update_admin"
ON public.trial_orders FOR UPDATE
TO authenticated
USING (has_role(auth.uid(),'owner'::app_role) OR has_role(auth.uid(),'master'::app_role))
WITH CHECK (has_role(auth.uid(),'owner'::app_role) OR has_role(auth.uid(),'master'::app_role));