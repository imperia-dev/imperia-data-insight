-- Create reviewer_protocols table
CREATE TABLE public.reviewer_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_number TEXT NOT NULL UNIQUE,
  competence_month DATE NOT NULL,
  
  -- Reviewer data
  reviewer_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  
  -- Totals
  total_amount NUMERIC NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  document_count INTEGER NOT NULL DEFAULT 0,
  
  -- Compiled data (JSONB with all orders)
  orders_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Status and Approvals
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Reviewer Approval
  reviewer_approved_at TIMESTAMPTZ,
  reviewer_approved_by UUID REFERENCES auth.users(id),
  reviewer_approval_notes TEXT,
  
  -- Master Initial Approval
  master_initial_approved_at TIMESTAMPTZ,
  master_initial_approved_by UUID REFERENCES auth.users(id),
  master_initial_notes TEXT,
  
  -- Master Final Approval
  master_final_approved_at TIMESTAMPTZ,
  master_final_approved_by UUID REFERENCES auth.users(id),
  master_final_notes TEXT,
  
  -- Owner Approval
  owner_approved_at TIMESTAMPTZ,
  owner_approved_by UUID REFERENCES auth.users(id),
  owner_approval_notes TEXT,
  
  -- Payment
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  payment_metadata JSONB,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_reviewer_protocols_competence ON public.reviewer_protocols(competence_month);
CREATE INDEX idx_reviewer_protocols_reviewer ON public.reviewer_protocols(reviewer_id);
CREATE INDEX idx_reviewer_protocols_status ON public.reviewer_protocols(status);

-- Add column to translation_orders
ALTER TABLE public.translation_orders
ADD COLUMN reviewer_protocol_id UUID REFERENCES public.reviewer_protocols(id) ON DELETE SET NULL;

CREATE INDEX idx_translation_orders_protocol ON public.translation_orders(reviewer_protocol_id);

-- Update trigger for updated_at
CREATE TRIGGER update_reviewer_protocols_updated_at
  BEFORE UPDATE ON public.reviewer_protocols
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.reviewer_protocols ENABLE ROW LEVEL SECURITY;

-- Reviewers can view own protocols
CREATE POLICY "Reviewers can view own protocols"
ON public.reviewer_protocols FOR SELECT
USING (
  reviewer_id = auth.uid()::text OR
  get_user_role(auth.uid()) IN ('owner', 'master', 'admin')
);

-- Owner can manage all protocols
CREATE POLICY "Owner can manage all protocols"
ON public.reviewer_protocols FOR ALL
USING (get_user_role(auth.uid()) = 'owner');

-- Master can view and update protocols
CREATE POLICY "Master can view and update protocols"
ON public.reviewer_protocols FOR SELECT
USING (get_user_role(auth.uid()) = 'master');

CREATE POLICY "Master can update protocols"
ON public.reviewer_protocols FOR UPDATE
USING (get_user_role(auth.uid()) = 'master');

-- Admin can view protocols
CREATE POLICY "Admin can view protocols"
ON public.reviewer_protocols FOR SELECT
USING (get_user_role(auth.uid()) = 'admin');

-- Update generate_protocol_number function to support reviewer type
CREATE OR REPLACE FUNCTION public.generate_protocol_number(p_type text, p_competence_month date, p_supplier_name text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_year_month text;
  v_sequence integer;
  v_supplier_suffix text;
  v_protocol_number text;
BEGIN
  -- Define prefix based on type
  IF p_type = 'service_provider' THEN
    v_prefix := 'PREST-DIAG';
  ELSIF p_type = 'consolidated' THEN
    v_prefix := 'CONS-DIAG';
  ELSIF p_type = 'reviewer' THEN
    v_prefix := 'PREST-REV';
  ELSE
    RAISE EXCEPTION 'Invalid protocol type: %', p_type;
  END IF;
  
  -- Year-month format
  v_year_month := to_char(p_competence_month, 'YYYYMM');
  
  -- Calculate monthly sequence
  IF p_type = 'service_provider' THEN
    SELECT COALESCE(MAX(CAST(split_part(protocol_number, '-', 4) AS integer)), 0) + 1
    INTO v_sequence
    FROM public.service_provider_protocols
    WHERE protocol_number LIKE 'PREST-DIAG-' || v_year_month || '-%';
    
    -- Add supplier name suffix (first 3 letters, uppercase)
    IF p_supplier_name IS NOT NULL THEN
      v_supplier_suffix := upper(substring(regexp_replace(p_supplier_name, '[^a-zA-Z]', '', 'g'), 1, 3));
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || 
                          lpad(v_sequence::text, 3, '0') || '-' || v_supplier_suffix;
    ELSE
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || lpad(v_sequence::text, 3, '0');
    END IF;
  ELSIF p_type = 'reviewer' THEN
    SELECT COALESCE(MAX(CAST(split_part(protocol_number, '-', 4) AS integer)), 0) + 1
    INTO v_sequence
    FROM public.reviewer_protocols
    WHERE protocol_number LIKE 'PREST-REV-' || v_year_month || '-%';
    
    -- Add reviewer name suffix (first 3 letters, uppercase)
    IF p_supplier_name IS NOT NULL THEN
      v_supplier_suffix := upper(substring(regexp_replace(p_supplier_name, '[^a-zA-Z]', '', 'g'), 1, 3));
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || 
                          lpad(v_sequence::text, 3, '0') || '-' || v_supplier_suffix;
    ELSE
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || lpad(v_sequence::text, 3, '0');
    END IF;
  ELSE
    -- For consolidated protocol, no sequence (unique per month)
    v_protocol_number := v_prefix || '-' || v_year_month;
  END IF;
  
  RETURN v_protocol_number;
END;
$function$;