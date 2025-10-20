-- Add 'completed' status to service_provider_protocols valid statuses
ALTER TABLE public.service_provider_protocols 
DROP CONSTRAINT IF EXISTS valid_spp_status;

ALTER TABLE public.service_provider_protocols 
ADD CONSTRAINT valid_spp_status 
CHECK (status = ANY (ARRAY[
  'draft'::text, 
  'awaiting_provider'::text, 
  'awaiting_master_initial'::text, 
  'awaiting_provider_data'::text, 
  'returned_for_adjustment'::text, 
  'awaiting_master_final'::text, 
  'awaiting_owner_approval'::text, 
  'provider_approved'::text, 
  'awaiting_final'::text, 
  'approved'::text, 
  'paid'::text, 
  'delayed'::text, 
  'cancelled'::text,
  'completed'::text
]));