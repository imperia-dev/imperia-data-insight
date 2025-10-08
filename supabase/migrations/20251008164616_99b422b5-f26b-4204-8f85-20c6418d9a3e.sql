-- Add customer and service_type columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer text,
ADD COLUMN IF NOT EXISTS service_type text;

-- Update all existing orders with default values
UPDATE public.orders
SET 
  customer = 'Cidadania4y',
  service_type = 'Drive'
WHERE customer IS NULL OR service_type IS NULL;