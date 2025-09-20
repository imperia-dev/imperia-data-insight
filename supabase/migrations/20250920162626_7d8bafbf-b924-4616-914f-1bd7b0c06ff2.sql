-- Ajustar políticas RLS existentes para suppliers (caso já existam)
DROP POLICY IF EXISTS "Owner can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admin and master can view suppliers" ON public.suppliers;

-- Recriar políticas RLS para suppliers
CREATE POLICY "Owner can manage suppliers"
ON public.suppliers
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Admin and master can view suppliers"
ON public.suppliers
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'master'::user_role]));