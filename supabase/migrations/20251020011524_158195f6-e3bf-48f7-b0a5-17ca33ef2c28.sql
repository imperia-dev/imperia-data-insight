-- Add attachment_url column to closing_protocols table
ALTER TABLE public.closing_protocols
ADD COLUMN IF NOT EXISTS attachment_url text;