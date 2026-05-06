
-- 1. Remove token-based bypass on service_provider_protocols SELECT
DROP POLICY IF EXISTS "provider_view_own_spp" ON public.service_provider_protocols;
CREATE POLICY "provider_view_own_spp"
ON public.service_provider_protocols
FOR SELECT
USING (provider_email = public.get_user_email(auth.uid()));

-- 2. Remove overly broad documents bucket policies
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;

-- 3. Remove overly broad payment-receipts SELECT
DROP POLICY IF EXISTS "Authenticated users can view payment receipts" ON storage.objects;

-- 4. Replace pendency-attachments broad SELECT/INSERT with path-ownership rules
DROP POLICY IF EXISTS "Allow authenticated users to view pendency attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload pendency attachments" ON storage.objects;

CREATE POLICY "Users can view own pendency attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pendency-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload own pendency attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pendency-attachments'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. Tighten invoice upload: require user to own a protocol
DROP POLICY IF EXISTS "spf_provider_upload_invoice" ON storage.objects;

CREATE POLICY "spf_provider_upload_invoice"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-provider-files'
  AND (storage.foldername(name))[1] = 'invoices'
  AND (
    EXISTS (
      SELECT 1 FROM public.service_provider_protocols
      WHERE supplier_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.reviewer_protocols
      WHERE assigned_operation_user_id = auth.uid()
    )
  )
);
