-- Add columns for Diagramação service type custom calculation
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS pages_count_diagramming integer,
ADD COLUMN IF NOT EXISTS custom_value_diagramming numeric(10, 2);

-- Add comments for documentation
COMMENT ON COLUMN public.orders.pages_count_diagramming IS 'Número de páginas específico para serviços de Diagramação';
COMMENT ON COLUMN public.orders.custom_value_diagramming IS 'Valor customizado calculado automaticamente para Diagramação (páginas × R$ 3,00)';