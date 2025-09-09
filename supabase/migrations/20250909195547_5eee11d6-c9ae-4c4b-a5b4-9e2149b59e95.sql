-- Add treatment column to pendencies table
ALTER TABLE public.pendencies 
ADD COLUMN treatment text DEFAULT NULL;