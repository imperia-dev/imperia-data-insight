-- Phase 1: Database Structure Updates

-- 1. Create enum for protocol types
CREATE TYPE protocol_type AS ENUM ('receita', 'despesa_fixa', 'despesa_variavel', 'folha');

-- 2. Create enum for batch and payment statuses
CREATE TYPE batch_status AS ENUM ('draft', 'sent', 'processing', 'completed', 'failed');
CREATE TYPE payment_status_enum AS ENUM ('pending', 'sent', 'paid', 'failed');

-- 3. Update closing_protocols table
ALTER TABLE public.closing_protocols 
ADD COLUMN IF NOT EXISTS protocol_type protocol_type DEFAULT 'receita',
ADD COLUMN IF NOT EXISTS bank_batch_id uuid,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approval_notes text,
ADD COLUMN IF NOT EXISTS workflow_steps jsonb DEFAULT '[]'::jsonb;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_closing_protocols_type ON public.closing_protocols(protocol_type);
CREATE INDEX IF NOT EXISTS idx_closing_protocols_status ON public.closing_protocols(payment_status);

-- 4. Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text UNIQUE, -- CPF/CNPJ
  document_type text CHECK (document_type IN ('cpf', 'cnpj')),
  bank_data jsonb, -- Encrypted bank details
  email text,
  phone text,
  pix_key text,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. Create bank_batches table
CREATE TABLE IF NOT EXISTS public.bank_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id text UNIQUE, -- BTG batch ID
  agreement_id text, -- BTG agreement ID
  total_amount numeric(15,2) NOT NULL,
  payments_count integer DEFAULT 0,
  status batch_status DEFAULT 'draft',
  btg_response jsonb, -- Complete API response
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  completed_at timestamp with time zone
);

-- 6. Create bank_payments table
CREATE TABLE IF NOT EXISTS public.bank_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.bank_batches(id) ON DELETE CASCADE,
  protocol_id uuid REFERENCES public.closing_protocols(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  payment_data jsonb NOT NULL, -- Payment details
  btg_payment_id text,
  status payment_status_enum DEFAULT 'pending',
  error_message text,
  amount numeric(15,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 7. Create protocol_history table for audit trail
CREATE TABLE IF NOT EXISTS public.protocol_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid REFERENCES public.closing_protocols(id) ON DELETE CASCADE,
  action text NOT NULL,
  old_status text,
  new_status text,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb
);

-- 8. Create protocol_steps table for workflow tracking
CREATE TABLE IF NOT EXISTS public.protocol_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id uuid REFERENCES public.closing_protocols(id) ON DELETE CASCADE,
  step_name text NOT NULL,
  step_order integer NOT NULL,
  status text CHECK (status IN ('pending', 'in_progress', 'completed', 'error')),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  completed_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- 9. Update payment_requests table
ALTER TABLE public.payment_requests
ADD COLUMN IF NOT EXISTS bank_batch_id uuid REFERENCES public.bank_batches(id),
ADD COLUMN IF NOT EXISTS request_type text DEFAULT 'email';

-- 10. Add supplier_id to financial_entries for linkage
ALTER TABLE public.financial_entries
ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);

-- 11. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bank_batches_status ON public.bank_batches(status);
CREATE INDEX IF NOT EXISTS idx_bank_payments_batch ON public.bank_payments(batch_id);
CREATE INDEX IF NOT EXISTS idx_bank_payments_protocol ON public.bank_payments(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_history_protocol ON public.protocol_history(protocol_id);
CREATE INDEX IF NOT EXISTS idx_protocol_steps_protocol ON public.protocol_steps(protocol_id);

-- 12. Enable RLS on new tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_steps ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies for suppliers
CREATE POLICY "Owner can manage suppliers"
ON public.suppliers
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Admin and master can view suppliers"
ON public.suppliers
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'master'::user_role]));

-- 14. Create RLS policies for bank_batches
CREATE POLICY "Owner can manage bank batches"
ON public.bank_batches
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Admin and master can view bank batches"
ON public.bank_batches
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'master'::user_role]));

-- 15. Create RLS policies for bank_payments
CREATE POLICY "Owner can manage bank payments"
ON public.bank_payments
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Admin and master can view bank payments"
ON public.bank_payments
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'master'::user_role]));

-- 16. Create RLS policies for protocol_history
CREATE POLICY "Owner, admin and master can view protocol history"
ON public.protocol_history
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'master'::user_role]));

CREATE POLICY "System can insert protocol history"
ON public.protocol_history
FOR INSERT
WITH CHECK (true);

-- 17. Create RLS policies for protocol_steps
CREATE POLICY "Owner, admin and master can manage protocol steps"
ON public.protocol_steps
FOR ALL
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'master'::user_role]));

-- 18. Create function to log protocol history
CREATE OR REPLACE FUNCTION log_protocol_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.protocol_history (
      protocol_id,
      action,
      old_status,
      new_status,
      user_id,
      metadata
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.payment_status,
      NEW.payment_status,
      auth.uid(),
      jsonb_build_object(
        'timestamp', now(),
        'protocol_type', NEW.protocol_type
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Create trigger for protocol history
CREATE TRIGGER protocol_status_history
AFTER UPDATE ON public.closing_protocols
FOR EACH ROW
EXECUTE FUNCTION log_protocol_history();

-- 20. Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 21. Add update triggers for new tables
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_payments_updated_at
BEFORE UPDATE ON public.bank_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();