-- Add payment_receipt_url column to service_provider_protocols table
ALTER TABLE public.service_provider_protocols
ADD COLUMN IF NOT EXISTS payment_receipt_url text;