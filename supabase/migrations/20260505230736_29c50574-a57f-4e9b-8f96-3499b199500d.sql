
-- 1) Re-link orders from duplicates to the kept protocols
UPDATE public.orders SET service_provider_protocol_id = 'de1b8cd2-b0d8-43ef-808e-b860a3093698'
  WHERE service_provider_protocol_id = '695663f8-796a-4ed2-a045-2bf8f7239394';
UPDATE public.orders SET service_provider_protocol_id = '567d4d27-87c5-4eb7-becb-8a0990b6b1bd'
  WHERE service_provider_protocol_id = 'bd05cc07-55ef-4e43-877f-8e0921033cfd';
UPDATE public.orders SET service_provider_protocol_id = 'd47785aa-3774-4e0a-a539-b3c64bec8998'
  WHERE service_provider_protocol_id = '2e8767ad-e98b-4451-8b3e-7256a16573ad';

-- 2) Delete duplicate protocols
DELETE FROM public.service_provider_protocols
  WHERE id IN (
    '695663f8-796a-4ed2-a045-2bf8f7239394',
    'bd05cc07-55ef-4e43-877f-8e0921033cfd',
    '2e8767ad-e98b-4451-8b3e-7256a16573ad'
  );

-- 3) Anti-race unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS uniq_provider_protocol_per_month
  ON public.service_provider_protocols (supplier_id, competence_month)
  WHERE status <> 'cancelled';
