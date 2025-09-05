-- Update RLS policies for company_costs table to include owner and exclude master
DROP POLICY IF EXISTS "Only master can view company costs" ON public.company_costs;
CREATE POLICY "Only owner can view company costs" 
ON public.company_costs 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only master can insert company costs" ON public.company_costs;
CREATE POLICY "Only owner can insert company costs" 
ON public.company_costs 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only master can update company costs" ON public.company_costs;
CREATE POLICY "Only owner can update company costs" 
ON public.company_costs 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only master can delete company costs" ON public.company_costs;
CREATE POLICY "Only owner can delete company costs" 
ON public.company_costs 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Update RLS policies for service_provider_costs table to include owner and exclude master
DROP POLICY IF EXISTS "Only master can view service provider costs" ON public.service_provider_costs;
CREATE POLICY "Only owner can view service provider costs" 
ON public.service_provider_costs 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only master can insert service provider costs" ON public.service_provider_costs;
CREATE POLICY "Only owner can insert service provider costs" 
ON public.service_provider_costs 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only master can update service provider costs" ON public.service_provider_costs;
CREATE POLICY "Only owner can update service provider costs" 
ON public.service_provider_costs 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

DROP POLICY IF EXISTS "Only master can delete service provider costs" ON public.service_provider_costs;
CREATE POLICY "Only owner can delete service provider costs" 
ON public.service_provider_costs 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Update other table policies to include owner with full access
-- Documents table
DROP POLICY IF EXISTS "Master and admin can insert documents" ON public.documents;
CREATE POLICY "Owner, master and admin can insert documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

DROP POLICY IF EXISTS "Master and admin can update documents" ON public.documents;
CREATE POLICY "Owner, master and admin can update documents" 
ON public.documents 
FOR UPDATE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

DROP POLICY IF EXISTS "Master can delete documents" ON public.documents;
CREATE POLICY "Owner and master can delete documents" 
ON public.documents 
FOR DELETE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

DROP POLICY IF EXISTS "Users can view assigned documents" ON public.documents;
CREATE POLICY "Users can view assigned documents" 
ON public.documents 
FOR SELECT 
USING ((assigned_to = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])));

-- Financial records table
DROP POLICY IF EXISTS "Master can manage financial records" ON public.financial_records;
CREATE POLICY "Owner and master can manage financial records" 
ON public.financial_records 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

DROP POLICY IF EXISTS "Master and admin can view all financial records" ON public.financial_records;
CREATE POLICY "Owner, master and admin can view all financial records" 
ON public.financial_records 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

-- Orders table
DROP POLICY IF EXISTS "Admin and master can create orders" ON public.orders;
CREATE POLICY "Owner, admin and master can create orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'master'::user_role]));

DROP POLICY IF EXISTS "Admin and master can update orders" ON public.orders;
CREATE POLICY "Owner, admin and master can update orders" 
ON public.orders 
FOR UPDATE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

DROP POLICY IF EXISTS "Master can delete orders" ON public.orders;
CREATE POLICY "Owner and master can delete orders" 
ON public.orders 
FOR DELETE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

DROP POLICY IF EXISTS "Admin and master can view all orders" ON public.orders;
CREATE POLICY "Owner, admin and master can view all orders" 
ON public.orders 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

-- Productivity table
DROP POLICY IF EXISTS "Master can delete productivity" ON public.productivity;
CREATE POLICY "Owner and master can delete productivity" 
ON public.productivity 
FOR DELETE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

DROP POLICY IF EXISTS "Users can insert own productivity" ON public.productivity;
CREATE POLICY "Users can insert own productivity" 
ON public.productivity 
FOR INSERT 
WITH CHECK ((user_id = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])));

DROP POLICY IF EXISTS "Users can update own productivity" ON public.productivity;
CREATE POLICY "Users can update own productivity" 
ON public.productivity 
FOR UPDATE 
USING ((user_id = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])));

DROP POLICY IF EXISTS "Users can view own productivity" ON public.productivity;
CREATE POLICY "Users can view own productivity" 
ON public.productivity 
FOR SELECT 
USING ((user_id = auth.uid()) OR (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])));

-- Profiles table
DROP POLICY IF EXISTS "Master and admin can view all profiles" ON public.profiles;
CREATE POLICY "Owner, master and admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

DROP POLICY IF EXISTS "Master can insert profiles" ON public.profiles;
CREATE POLICY "Owner and master can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

DROP POLICY IF EXISTS "Master can update all profiles" ON public.profiles;
CREATE POLICY "Owner and master can update all profiles" 
ON public.profiles 
FOR UPDATE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));