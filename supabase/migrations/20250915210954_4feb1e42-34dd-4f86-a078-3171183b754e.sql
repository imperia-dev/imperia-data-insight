-- Ajustar política para permitir que operation, master e owner vejam todas as ordens delivered
-- para fins de cálculo de produtividade/ranking

-- Primeiro, remover a política existente de visualização para operation
DROP POLICY IF EXISTS "Operation can view available and own orders" ON public.orders;

-- Criar nova política que permite operation ver ordens available, suas próprias ordens, e todas as ordens delivered
CREATE POLICY "Operation can view orders for productivity" 
ON public.orders 
FOR SELECT 
USING (
  (get_user_role(auth.uid()) = 'operation'::user_role) 
  AND (
    (status_order = 'available'::text) 
    OR ((assigned_to = auth.uid()) AND (status_order = ANY (ARRAY['in_progress'::text, 'delivered'::text])))
    OR (status_order = 'delivered'::text) -- Permite ver todas as ordens delivered para cálculo de ranking
  )
);