-- Permitir que master também possa criar pedidos
DROP POLICY IF EXISTS "Admin can create orders" ON public.orders;

CREATE POLICY "Admin and master can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) IN ('admin'::user_role, 'master'::user_role));

-- Adicionar campo para data de atribuição inicial (quando o pedido é criado)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS attribution_date timestamp with time zone DEFAULT now();