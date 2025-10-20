-- Add column for generated PDF
ALTER TABLE public.closing_protocols 
ADD COLUMN IF NOT EXISTS generated_pdf_url text;