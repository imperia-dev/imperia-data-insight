-- Allow financeiro role to view closing protocols (revenue protocols)
CREATE POLICY "Financeiro can view closing protocols"
ON public.closing_protocols
FOR SELECT
USING (has_role(auth.uid(), 'financeiro'::app_role) OR get_user_role(auth.uid()) = 'owner'::user_role);