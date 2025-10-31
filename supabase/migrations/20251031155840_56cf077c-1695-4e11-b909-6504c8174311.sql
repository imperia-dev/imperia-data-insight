-- Add yellowling_status and yellowling_id columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS yellowling_status TEXT CHECK (yellowling_status IN ('Finalizado', 'Em Andamento')),
ADD COLUMN IF NOT EXISTS yellowling_id TEXT;