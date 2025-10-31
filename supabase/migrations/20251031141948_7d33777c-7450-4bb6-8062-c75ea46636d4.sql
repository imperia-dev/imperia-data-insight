-- Habilitar RLS na tabela de backup
ALTER TABLE public.orders_backup_correction_20251031 ENABLE ROW LEVEL SECURITY;

-- Policy: Apenas owner pode visualizar o backup
CREATE POLICY "Only owner can view backup"
  ON public.orders_backup_correction_20251031
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'owner'::user_role);