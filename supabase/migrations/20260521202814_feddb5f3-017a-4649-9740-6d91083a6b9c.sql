
-- Extend enum
ALTER TYPE public.trial_order_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE public.trial_order_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE public.trial_order_status ADD VALUE IF NOT EXISTS 'received';
