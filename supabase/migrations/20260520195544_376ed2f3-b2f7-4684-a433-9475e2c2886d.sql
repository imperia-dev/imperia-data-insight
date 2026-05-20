ALTER TABLE public.trial_order_files
  ADD COLUMN IF NOT EXISTS source_file_id uuid REFERENCES public.trial_order_files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trial_order_files_source_file_id ON public.trial_order_files(source_file_id);