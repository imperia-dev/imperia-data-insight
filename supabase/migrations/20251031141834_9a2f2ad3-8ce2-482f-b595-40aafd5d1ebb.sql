-- ============================================
-- CORREÇÃO MASSIVA DE VALORES ZERADOS
-- Data: 31/10/2025
-- Pedidos afetados: 276 (274 Drive + 2 Diagramação)
-- Período: 06/10/2025 a 24/10/2025
-- ============================================

-- ETAPA 1: Criar tabela de backup
CREATE TABLE IF NOT EXISTS public.orders_backup_correction_20251031 (
  id uuid PRIMARY KEY,
  service_type text,
  document_count integer,
  drive_document_count integer,
  drive_value numeric,
  diagramming_pages_total integer,
  diagramming_document_count integer,
  diagramming_value numeric,
  created_at timestamptz,
  backed_up_at timestamptz DEFAULT now()
);

-- ETAPA 2: Fazer backup dos pedidos de Drive
INSERT INTO public.orders_backup_correction_20251031 (
  id, service_type, document_count, drive_document_count, drive_value,
  diagramming_pages_total, diagramming_document_count, diagramming_value, created_at
)
SELECT 
  id, service_type, document_count, drive_document_count, drive_value,
  diagramming_pages_total, diagramming_document_count, diagramming_value, created_at
FROM public.orders
WHERE service_type = 'Drive'
  AND drive_value = 0
  AND created_at BETWEEN '2025-10-06' AND '2025-10-24 23:59:59';

-- ETAPA 3: Fazer backup dos pedidos de Diagramação
INSERT INTO public.orders_backup_correction_20251031 (
  id, service_type, document_count, drive_document_count, drive_value,
  diagramming_pages_total, diagramming_document_count, diagramming_value, created_at
)
SELECT 
  id, service_type, document_count, drive_document_count, drive_value,
  diagramming_pages_total, diagramming_document_count, diagramming_value, created_at
FROM public.orders
WHERE service_type = 'Diagramação'
  AND diagramming_value = 0
  AND created_at BETWEEN '2025-10-06' AND '2025-10-24 23:59:59';

-- ETAPA 4: CORREÇÃO - Pedidos de Drive (274 pedidos)
UPDATE public.orders
SET 
  drive_value = document_count * 1.30,
  drive_document_count = document_count
WHERE service_type = 'Drive'
  AND drive_value = 0
  AND created_at BETWEEN '2025-10-06' AND '2025-10-24 23:59:59';

-- ETAPA 5: CORREÇÃO - Pedidos de Diagramação (2 pedidos)
UPDATE public.orders
SET 
  diagramming_value = diagramming_pages_total * 3.00,
  diagramming_document_count = document_count
WHERE service_type = 'Diagramação'
  AND diagramming_value = 0
  AND created_at BETWEEN '2025-10-06' AND '2025-10-24 23:59:59';