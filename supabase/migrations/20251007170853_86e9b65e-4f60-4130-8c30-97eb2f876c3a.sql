-- Add payment and invoice columns to reviewer_protocols table
ALTER TABLE public.reviewer_protocols
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_agency TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS account_type TEXT,
ADD COLUMN IF NOT EXISTS invoice_amount NUMERIC,
ADD COLUMN IF NOT EXISTS invoice_url TEXT,
ADD COLUMN IF NOT EXISTS assigned_operation_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS operation_data_filled_at TIMESTAMPTZ;

-- Add index for operation user assignment
CREATE INDEX IF NOT EXISTS idx_reviewer_protocols_operation_user 
ON public.reviewer_protocols(assigned_operation_user_id);

-- Add RLS policy for operation users to view and update their assigned protocols
CREATE POLICY "Operation users can view assigned protocols"
ON public.reviewer_protocols FOR SELECT
USING (
  assigned_operation_user_id = auth.uid() OR
  get_user_role(auth.uid()) IN ('owner', 'master', 'admin')
);

CREATE POLICY "Operation users can update assigned protocols"
ON public.reviewer_protocols FOR UPDATE
USING (
  assigned_operation_user_id = auth.uid() AND
  status IN ('master_initial', 'operation_data_filled')
);