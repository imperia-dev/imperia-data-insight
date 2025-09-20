-- Create enum for expense closing status
CREATE TYPE expense_closing_status AS ENUM ('draft', 'under_review', 'approved', 'closed');

-- Create expense closing protocols table
CREATE TABLE public.expense_closing_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_number TEXT NOT NULL UNIQUE,
  competence_month DATE NOT NULL,
  total_company_expenses NUMERIC NOT NULL DEFAULT 0,
  total_service_provider_expenses NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  expense_count INTEGER NOT NULL DEFAULT 0,
  status expense_closing_status NOT NULL DEFAULT 'draft',
  closing_data JSONB,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add closing protocol reference to expenses table
ALTER TABLE public.expenses 
ADD COLUMN closing_protocol_id UUID REFERENCES public.expense_closing_protocols(id);

-- Create index for faster queries
CREATE INDEX idx_expense_closing_protocols_competence ON public.expense_closing_protocols(competence_month);
CREATE INDEX idx_expense_closing_protocols_status ON public.expense_closing_protocols(status);
CREATE INDEX idx_expenses_closing_protocol ON public.expenses(closing_protocol_id);

-- Enable RLS
ALTER TABLE public.expense_closing_protocols ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_closing_protocols
CREATE POLICY "Owner can manage expense closing protocols" 
ON public.expense_closing_protocols 
FOR ALL 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Master and admin can view expense closing protocols" 
ON public.expense_closing_protocols 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['master'::user_role, 'admin'::user_role]));

-- Update trigger for updated_at
CREATE TRIGGER update_expense_closing_protocols_updated_at
BEFORE UPDATE ON public.expense_closing_protocols
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to prevent editing closed expenses
CREATE OR REPLACE FUNCTION public.prevent_closed_expense_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.closing_protocol_id IS NOT NULL THEN
    -- Check if protocol is closed
    IF EXISTS (
      SELECT 1 FROM public.expense_closing_protocols 
      WHERE id = OLD.closing_protocol_id 
      AND status = 'closed'
    ) THEN
      RAISE EXCEPTION 'Cannot modify expense that is part of a closed protocol';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to prevent editing closed expenses
CREATE TRIGGER prevent_expense_edit_if_closed
BEFORE UPDATE OR DELETE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_expense_edit();