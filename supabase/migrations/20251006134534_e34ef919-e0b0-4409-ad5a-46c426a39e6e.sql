-- Remove a constraint antiga que referencia suppliers
ALTER TABLE public.service_provider_protocols
DROP CONSTRAINT IF EXISTS service_provider_protocols_supplier_id_fkey;

-- Adiciona nova constraint referenciando profiles
ALTER TABLE public.service_provider_protocols
ADD CONSTRAINT service_provider_protocols_supplier_id_fkey 
FOREIGN KEY (supplier_id) REFERENCES public.profiles(id) ON DELETE CASCADE;