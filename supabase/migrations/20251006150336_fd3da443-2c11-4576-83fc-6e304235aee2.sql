-- Drop the existing check constraint
ALTER TABLE public.service_provider_protocols
DROP CONSTRAINT IF EXISTS valid_spp_status;

-- Add updated check constraint with new workflow statuses
ALTER TABLE public.service_provider_protocols
ADD CONSTRAINT valid_spp_status CHECK (status IN (
  'draft',
  'awaiting_provider',
  'awaiting_master_initial',
  'awaiting_provider_data',
  'returned_for_adjustment',
  'awaiting_master_final',
  'awaiting_owner_approval',
  'provider_approved',
  'awaiting_final',
  'approved',
  'paid',
  'delayed',
  'cancelled'
));