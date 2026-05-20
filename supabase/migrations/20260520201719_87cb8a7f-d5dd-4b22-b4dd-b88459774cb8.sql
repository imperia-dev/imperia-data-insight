CREATE POLICY "trial_uploads_select_translations_owner"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'trial-uploads'
  AND (storage.foldername(name))[1] = 'translations'
  AND EXISTS (
    SELECT 1 FROM public.trial_orders o
    JOIN public.trial_customers c ON c.id = o.customer_id
    WHERE c.user_id = auth.uid()
      AND o.id::text = (storage.foldername(name))[2]
  )
);