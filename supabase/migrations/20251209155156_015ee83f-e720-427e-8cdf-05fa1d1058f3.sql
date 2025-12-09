-- Permitir que a equipe interna (owner, master, admin, operation) insira no histórico
CREATE POLICY "Internal team can insert request history" 
ON public.customer_pendency_status_history
FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role_new(auth.uid()) = ANY (ARRAY['owner'::app_role, 'master'::app_role, 'admin'::app_role, 'operation'::app_role])
);

-- Permitir inserção para customers quando criam suas próprias solicitações
CREATE POLICY "Customers can insert own request history" 
ON public.customer_pendency_status_history
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'customer'::app_role) AND
  EXISTS (
    SELECT 1 FROM customer_pendency_requests cpr
    WHERE cpr.id = request_id
    AND cpr.customer_name = get_user_customer(auth.uid())
  )
);