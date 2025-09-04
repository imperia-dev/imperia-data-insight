-- Add is_urgent column to orders table
ALTER TABLE public.orders 
ADD COLUMN is_urgent BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.orders.is_urgent IS 'Flag to mark orders as urgent by master role';