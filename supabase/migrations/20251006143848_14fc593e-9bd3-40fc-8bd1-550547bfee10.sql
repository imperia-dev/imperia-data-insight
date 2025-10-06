-- Add new fields to service_provider_protocols table
ALTER TABLE public.service_provider_protocols
ADD COLUMN IF NOT EXISTS invoice_file_url text,
ADD COLUMN IF NOT EXISTS invoice_amount numeric,
ADD COLUMN IF NOT EXISTS master_initial_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS master_initial_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS master_final_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS master_final_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS owner_approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS owner_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS returned_to_provider_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS return_reason text;

-- Update status field to support new workflow statuses
-- Note: We'll handle status updates through application code to maintain existing data