-- Add has_delay column to pendencies table
ALTER TABLE public.pendencies 
ADD COLUMN has_delay boolean DEFAULT false;

-- Add index for better performance
CREATE INDEX idx_pendencies_has_delay ON public.pendencies(has_delay) WHERE has_delay = true;
CREATE INDEX idx_pendencies_status ON public.pendencies(status);