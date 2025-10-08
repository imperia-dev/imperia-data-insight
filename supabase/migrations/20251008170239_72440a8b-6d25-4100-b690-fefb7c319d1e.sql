-- Add tags column to orders table
ALTER TABLE public.orders 
ADD COLUMN tags text[] DEFAULT '{}';

-- Add comment to the column
COMMENT ON COLUMN public.orders.tags IS 'Tags for the order: Carimbos, Assinaturas, etc.';