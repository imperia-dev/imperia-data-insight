
ALTER TABLE public.trial_order_files
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'source';

ALTER TABLE public.trial_order_files
  DROP CONSTRAINT IF EXISTS trial_order_files_kind_check;
ALTER TABLE public.trial_order_files
  ADD CONSTRAINT trial_order_files_kind_check CHECK (kind IN ('source','translation'));

DROP POLICY IF EXISTS tof_insert_admin_translation ON public.trial_order_files;
CREATE POLICY tof_insert_admin_translation ON public.trial_order_files
  FOR INSERT TO authenticated
  WITH CHECK (
    kind = 'translation'
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master'))
  );

DROP POLICY IF EXISTS tof_delete_admin_translation ON public.trial_order_files;
CREATE POLICY tof_delete_admin_translation ON public.trial_order_files
  FOR DELETE TO authenticated
  USING (
    kind = 'translation'
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master'))
  );

DROP POLICY IF EXISTS "trial-uploads admin insert translations" ON storage.objects;
CREATE POLICY "trial-uploads admin insert translations" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'trial-uploads'
    AND (storage.foldername(name))[1] = 'translations'
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master'))
  );

DROP POLICY IF EXISTS "trial-uploads admin delete translations" ON storage.objects;
CREATE POLICY "trial-uploads admin delete translations" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'trial-uploads'
    AND (storage.foldername(name))[1] = 'translations'
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master'))
  );
