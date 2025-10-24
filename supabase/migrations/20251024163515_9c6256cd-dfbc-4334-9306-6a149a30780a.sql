-- Add new fields to orders table for separate Drive and Diagramação tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS drive_document_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS diagramming_document_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS diagramming_pages_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS diagramming_details JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS drive_value NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS diagramming_value NUMERIC(10,2) DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.orders.drive_document_count IS 'Quantidade exclusiva de documentos Drive';
COMMENT ON COLUMN public.orders.diagramming_document_count IS 'Quantidade exclusiva de documentos Diagramação';
COMMENT ON COLUMN public.orders.diagramming_pages_total IS 'Total de páginas (soma de todos os docs de Diagramação)';
COMMENT ON COLUMN public.orders.diagramming_details IS 'Array JSON com detalhes de cada documento de Diagramação: [{"quantity": 1, "pages": 10}]';
COMMENT ON COLUMN public.orders.drive_value IS 'Valor calculado exclusivo do Drive';
COMMENT ON COLUMN public.orders.diagramming_value IS 'Valor calculado exclusivo da Diagramação';