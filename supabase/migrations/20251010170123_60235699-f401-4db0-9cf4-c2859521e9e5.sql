-- Add payment_receipt_url column to reviewer_protocols table
ALTER TABLE public.reviewer_protocols
ADD COLUMN IF NOT EXISTS payment_receipt_url text;

-- Add paid_at column to reviewer_protocols table if it doesn't exist
ALTER TABLE public.reviewer_protocols
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

-- Add comment to document the columns
COMMENT ON COLUMN public.reviewer_protocols.payment_receipt_url IS 'URL do comprovante de pagamento enviado';
COMMENT ON COLUMN public.reviewer_protocols.paid_at IS 'Data e hora em que o pagamento foi efetuado';