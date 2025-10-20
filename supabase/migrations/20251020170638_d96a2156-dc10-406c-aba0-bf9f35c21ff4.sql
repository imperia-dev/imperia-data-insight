-- Ajustar RLS policies para permitir que role financeiro veja todos os protocolos

-- Policies para expense_closing_protocols
DROP POLICY IF EXISTS "Users can view own expense closing protocols" ON expense_closing_protocols;
DROP POLICY IF EXISTS "Financial users can view all expense protocols" ON expense_closing_protocols;
DROP POLICY IF EXISTS "Master and admin can view expense closing protocols" ON expense_closing_protocols;
DROP POLICY IF EXISTS "Financeiro can view all expense protocols" ON expense_closing_protocols;

CREATE POLICY "Financeiro can view all expense protocols" 
ON expense_closing_protocols 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'financeiro'::app_role) 
  OR get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])
);

-- Policies para service_provider_protocols  
DROP POLICY IF EXISTS "Users can view own service provider protocols" ON service_provider_protocols;
DROP POLICY IF EXISTS "Financial users can view all provider protocols" ON service_provider_protocols;
DROP POLICY IF EXISTS "Provider and financial users can view protocols" ON service_provider_protocols;
DROP POLICY IF EXISTS "Providers can view their own protocols" ON service_provider_protocols;
DROP POLICY IF EXISTS "Financeiro can view all provider protocols" ON service_provider_protocols;

CREATE POLICY "Financeiro can view all provider protocols" 
ON service_provider_protocols 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'financeiro'::app_role)
  OR get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])
  OR supplier_id = auth.uid()
);

-- Policies para reviewer_protocols (reviewer_id é TEXT, precisa cast)
DROP POLICY IF EXISTS "Users can view own reviewer protocols" ON reviewer_protocols;
DROP POLICY IF EXISTS "Financial users can view all reviewer protocols" ON reviewer_protocols;
DROP POLICY IF EXISTS "Reviewer and financial users can view protocols" ON reviewer_protocols;
DROP POLICY IF EXISTS "Reviewers can view their own protocols" ON reviewer_protocols;
DROP POLICY IF EXISTS "Financeiro can view all reviewer protocols" ON reviewer_protocols;

CREATE POLICY "Financeiro can view all reviewer protocols" 
ON reviewer_protocols 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'financeiro'::app_role)
  OR get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role])
  OR reviewer_id = auth.uid()::text
);