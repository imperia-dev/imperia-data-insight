-- Permitir que usuários financeiros atualizem protocolos de revisores
CREATE POLICY "Financeiro can update reviewer protocols"
ON reviewer_protocols
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'financeiro'::app_role)
  OR get_user_role(auth.uid()) = ANY(ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])
)
WITH CHECK (
  has_role(auth.uid(), 'financeiro'::app_role)
  OR get_user_role(auth.uid()) = ANY(ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])
);