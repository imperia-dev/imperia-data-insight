-- Add RLS policy to allow financeiro role to view expenses
CREATE POLICY "Financeiro can view expenses"
ON public.expenses
FOR SELECT
USING (
  has_role(auth.uid(), 'financeiro'::app_role) 
  OR get_user_role(auth.uid()) = 'owner'::user_role
);