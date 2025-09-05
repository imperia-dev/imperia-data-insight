-- Criar tabela para custos da empresa
CREATE TABLE public.company_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT,
  description TEXT NOT NULL,
  observations TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.company_costs ENABLE ROW LEVEL SECURITY;

-- Policies for company_costs
CREATE POLICY "Only master can view company costs" 
ON public.company_costs 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'master'::user_role);

CREATE POLICY "Only master can insert company costs" 
ON public.company_costs 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'master'::user_role);

CREATE POLICY "Only master can update company costs" 
ON public.company_costs 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'master'::user_role);

CREATE POLICY "Only master can delete company costs" 
ON public.company_costs 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'master'::user_role);

-- Criar tabela para custos de prestadores de serviço
CREATE TABLE public.service_provider_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT,
  cnpj TEXT,
  phone TEXT,
  days_worked INTEGER,
  amount NUMERIC(10, 2) NOT NULL,
  pix_key TEXT,
  type TEXT NOT NULL CHECK (type IN ('CLT', 'Freelance')),
  invoice_number TEXT,
  competence TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Não Pago' CHECK (status IN ('Pago', 'Não Pago', 'Pendente')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.service_provider_costs ENABLE ROW LEVEL SECURITY;

-- Policies for service_provider_costs
CREATE POLICY "Only master can view service provider costs" 
ON public.service_provider_costs 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'master'::user_role);

CREATE POLICY "Only master can insert service provider costs" 
ON public.service_provider_costs 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'master'::user_role);

CREATE POLICY "Only master can update service provider costs" 
ON public.service_provider_costs 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'master'::user_role);

CREATE POLICY "Only master can delete service provider costs" 
ON public.service_provider_costs 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'master'::user_role);

-- Create triggers for updated_at
CREATE TRIGGER update_company_costs_updated_at
BEFORE UPDATE ON public.company_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_provider_costs_updated_at
BEFORE UPDATE ON public.service_provider_costs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();