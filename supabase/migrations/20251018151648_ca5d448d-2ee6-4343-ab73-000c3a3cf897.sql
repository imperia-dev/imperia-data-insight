-- Drop the previous policy if it exists
DROP POLICY IF EXISTS "Financeiro can view closing protocols" ON public.closing_protocols;

-- Create a comprehensive view policy for closing protocols
CREATE POLICY "Financeiro and owner can view closing protocols"
ON public.closing_protocols
FOR SELECT
USING (
  -- Check if user has financeiro role in user_roles table
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'financeiro'::app_role
  )
  OR
  -- Check if user has owner role in profiles table  
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'owner'::user_role
  )
);