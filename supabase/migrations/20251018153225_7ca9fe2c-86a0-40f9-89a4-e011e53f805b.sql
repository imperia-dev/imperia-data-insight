-- Allow financeiro users to update closing protocols for payment workflow
CREATE POLICY "Financeiro can update closing protocols for payments"
ON public.closing_protocols
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'::user_role))
)
WITH CHECK (
  has_role(auth.uid(), 'financeiro'::app_role) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'::user_role))
);