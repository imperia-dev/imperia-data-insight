-- Update RLS policies for leads table to allow master and admin to view leads
DROP POLICY IF EXISTS "Owner can view leads" ON public.leads;
DROP POLICY IF EXISTS "Owner can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Owner can update leads" ON public.leads;
DROP POLICY IF EXISTS "Owner can delete leads" ON public.leads;

-- Create new policies with expanded access
CREATE POLICY "Owner, master and admin can view leads" 
ON public.leads 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

CREATE POLICY "Owner can insert leads" 
ON public.leads 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owner can update leads" 
ON public.leads 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owner can delete leads" 
ON public.leads 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);