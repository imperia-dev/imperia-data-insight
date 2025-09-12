-- Add has_delay column to orders table
ALTER TABLE public.orders 
ADD COLUMN has_delay boolean DEFAULT false;

-- Create index for better query performance
CREATE INDEX idx_orders_has_delay ON public.orders(has_delay);

-- Update existing records that have has_attention to also have has_delay (for backward compatibility)
-- This assumes current "attention" records are actually delays
UPDATE public.orders 
SET has_delay = true 
WHERE has_attention = true;