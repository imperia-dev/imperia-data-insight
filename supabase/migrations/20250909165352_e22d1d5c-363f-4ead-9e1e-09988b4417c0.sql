-- Add urgent_document_count column to orders table
ALTER TABLE public.orders 
ADD COLUMN urgent_document_count INTEGER DEFAULT 0;