-- Add stage and probability columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS stage text DEFAULT 'lead',
ADD COLUMN IF NOT EXISTS probability integer DEFAULT 20;

-- Add check constraint for valid stages
ALTER TABLE public.leads 
ADD CONSTRAINT valid_stage CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'));