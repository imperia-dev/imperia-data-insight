-- Add customer column to pendencies table
ALTER TABLE public.pendencies 
ADD COLUMN customer text NOT NULL DEFAULT 'Cidadania4y' 
CHECK (customer IN ('Cidadania4y', 'Yellowling'));

-- Update existing records to have Cidadania4y as customer
UPDATE public.pendencies 
SET customer = 'Cidadania4y' 
WHERE customer IS NULL OR customer = '';