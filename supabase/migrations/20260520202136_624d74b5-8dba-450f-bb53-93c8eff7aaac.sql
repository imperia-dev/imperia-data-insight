ALTER TABLE public.trial_orders
  ADD COLUMN IF NOT EXISTS external_link text,
  ADD COLUMN IF NOT EXISTS external_id text;