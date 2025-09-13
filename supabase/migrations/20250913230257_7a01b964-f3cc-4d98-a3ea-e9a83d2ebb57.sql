-- Create enum for financial entry types
CREATE TYPE financial_entry_type AS ENUM ('revenue', 'expense', 'tax', 'deduction');

-- Create enum for balance sheet item types
CREATE TYPE balance_sheet_type AS ENUM (
  'current_asset',
  'non_current_asset', 
  'current_liability',
  'non_current_liability',
  'equity'
);

-- Create enum for cash flow methods
CREATE TYPE cash_flow_method AS ENUM ('direct', 'indirect');

-- Create enum for scenario types
CREATE TYPE scenario_type AS ENUM ('pessimistic', 'realistic', 'optimistic');

-- Create financial_entries table
CREATE TABLE public.financial_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  type financial_entry_type NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  is_fixed BOOLEAN DEFAULT false,
  is_variable BOOLEAN DEFAULT false,
  payment_method TEXT,
  document_ref TEXT,
  accounting_method TEXT DEFAULT 'accrual', -- 'accrual' or 'cash'
  status TEXT DEFAULT 'confirmed',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create balance_sheet_items table
CREATE TABLE public.balance_sheet_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  type balance_sheet_type NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unit_economics table
CREATE TABLE public.unit_economics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month DATE NOT NULL,
  cac DECIMAL(10,2), -- Customer Acquisition Cost
  ltv DECIMAL(10,2), -- Lifetime Value
  arpu DECIMAL(10,2), -- Average Revenue Per User
  churn_rate DECIMAL(5,2), -- Percentage
  customer_count INTEGER,
  new_customers INTEGER,
  marketing_spend DECIMAL(15,2),
  sales_spend DECIMAL(15,2),
  avg_ticket DECIMAL(10,2),
  purchase_frequency DECIMAL(5,2),
  retention_months DECIMAL(5,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial_projections table
CREATE TABLE public.financial_projections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  projection_date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- 'revenue', 'expense', 'ebitda', etc
  scenario scenario_type NOT NULL,
  projected_value DECIMAL(15,2) NOT NULL,
  actual_value DECIMAL(15,2),
  variance DECIMAL(15,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cash_flow_categories table
CREATE TABLE public.cash_flow_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('inflow', 'outflow')),
  is_operational BOOLEAN DEFAULT false,
  is_investment BOOLEAN DEFAULT false,
  is_financing BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create financial_indicators table for storing calculated metrics
CREATE TABLE public.financial_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  indicator_name TEXT NOT NULL,
  value DECIMAL(15,4),
  category TEXT, -- 'liquidity', 'profitability', 'leverage', etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_sheet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_economics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_indicators ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for financial_entries
CREATE POLICY "Owner, master and admin can manage financial entries"
ON public.financial_entries
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

-- Create RLS policies for balance_sheet_items
CREATE POLICY "Owner, master and admin can manage balance sheet"
ON public.balance_sheet_items
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

-- Create RLS policies for unit_economics
CREATE POLICY "Owner, master and admin can manage unit economics"
ON public.unit_economics
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

-- Create RLS policies for financial_projections
CREATE POLICY "Owner, master and admin can manage projections"
ON public.financial_projections
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

-- Create RLS policies for cash_flow_categories
CREATE POLICY "Anyone can view categories"
ON public.cash_flow_categories
FOR SELECT
USING (true);

CREATE POLICY "Owner and master can manage categories"
ON public.cash_flow_categories
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

-- Create RLS policies for financial_indicators
CREATE POLICY "Owner, master and admin can manage indicators"
ON public.financial_indicators
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

-- Create updated_at triggers
CREATE TRIGGER update_financial_entries_updated_at
BEFORE UPDATE ON public.financial_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_balance_sheet_items_updated_at
BEFORE UPDATE ON public.balance_sheet_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_unit_economics_updated_at
BEFORE UPDATE ON public.unit_economics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_projections_updated_at
BEFORE UPDATE ON public.financial_projections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_indicators_updated_at
BEFORE UPDATE ON public.financial_indicators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default cash flow categories
INSERT INTO public.cash_flow_categories (name, type, is_operational) VALUES
  ('Vendas', 'inflow', true),
  ('Prestação de Serviços', 'inflow', true),
  ('Juros Recebidos', 'inflow', false),
  ('Fornecedores', 'outflow', true),
  ('Salários', 'outflow', true),
  ('Impostos', 'outflow', true),
  ('Aluguel', 'outflow', true),
  ('Marketing', 'outflow', true),
  ('Despesas Administrativas', 'outflow', true),
  ('Compra de Equipamentos', 'outflow', false),
  ('Empréstimos Recebidos', 'inflow', false),
  ('Pagamento de Empréstimos', 'outflow', false),
  ('Dividendos Pagos', 'outflow', false);

UPDATE public.cash_flow_categories SET is_investment = true 
WHERE name = 'Compra de Equipamentos';

UPDATE public.cash_flow_categories SET is_financing = true 
WHERE name IN ('Empréstimos Recebidos', 'Pagamento de Empréstimos', 'Dividendos Pagos');