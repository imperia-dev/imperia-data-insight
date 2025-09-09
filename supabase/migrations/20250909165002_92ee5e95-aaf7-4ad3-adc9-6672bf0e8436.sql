-- Add urgent_document_count column to documents table
ALTER TABLE public.documents 
ADD COLUMN urgent_document_count INTEGER DEFAULT 0;

-- Update the column to be nullable
ALTER TABLE public.documents 
ALTER COLUMN urgent_document_count DROP NOT NULL;