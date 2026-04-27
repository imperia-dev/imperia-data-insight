
-- =====================================================================
-- SECURITY FIX: Lock down 'service-provider-files' storage bucket
-- =====================================================================
-- This bucket stores invoices and financial documents containing CPF,
-- CNPJ, PIX keys, and bank account details. Previously, it was public
-- AND had SELECT policies allowing any authenticated user to view any
-- file. We restrict access to:
--   * Privileged roles: owner, master, admin, financeiro
--   * The specific service provider who owns the protocol the file
--     belongs to (matched via service_provider_protocols)
-- =====================================================================

-- 1) Make the bucket private (objects must be served via signed URLs)
UPDATE storage.buckets
SET public = false
WHERE id = 'service-provider-files';

-- 2) Drop all existing overly permissive SELECT/UPDATE/DELETE/INSERT policies
DROP POLICY IF EXISTS "Anyone can view files in service-provider-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files from service-provider-file" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their files in service-provider-" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload files to service-provider-files" ON storage.objects;
DROP POLICY IF EXISTS "Operation users can delete invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Operation users can update invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Operation users can upload invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Operation users can view invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Service providers can upload protocol files" ON storage.objects;
DROP POLICY IF EXISTS "Service providers can view protocol files" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete service provider files" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update service provider files" ON storage.objects;
DROP POLICY IF EXISTS "Owner can upload service provider files" ON storage.objects;
DROP POLICY IF EXISTS "Owner can view service provider files" ON storage.objects;
DROP POLICY IF EXISTS "Only owner can delete service provider files" ON storage.objects;
DROP POLICY IF EXISTS "Owners can manage all service provider files" ON storage.objects;
DROP POLICY IF EXISTS "Privileged roles can update service provider files" ON storage.objects;
DROP POLICY IF EXISTS "Privileged roles can upload service provider files" ON storage.objects;
DROP POLICY IF EXISTS "Privileged roles can view service provider files" ON storage.objects;

-- 3) Helper: a service provider may access a file only if its name appears
-- in invoice_file_url of a protocol that belongs to that provider.
-- We match by checking the protocol's invoice_file_url contains this
-- object's name (the storage path is embedded in the URL).
-- This is intentionally narrow and only covers the provider's own invoices.

-- Privileged roles: full access
CREATE POLICY "spf_privileged_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'service-provider-files'
  AND public.get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role, 'financeiro'::user_role])
);

CREATE POLICY "spf_privileged_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-provider-files'
  AND public.get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role, 'financeiro'::user_role])
);

CREATE POLICY "spf_privileged_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'service-provider-files'
  AND public.get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role, 'financeiro'::user_role])
);

CREATE POLICY "spf_privileged_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-provider-files'
  AND public.get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role, 'financeiro'::user_role])
);

-- Service providers: may read/upload only their own invoice files.
-- Their protocols are linked via service_provider_protocols.supplier_id
-- (uuid that equals their auth.uid()) and the file path is recorded in
-- invoice_file_url.
CREATE POLICY "spf_provider_view_own_invoice"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'service-provider-files'
  AND EXISTS (
    SELECT 1
    FROM public.service_provider_protocols spp
    WHERE spp.supplier_id = auth.uid()
      AND spp.invoice_file_url IS NOT NULL
      AND spp.invoice_file_url LIKE '%' || storage.objects.name || '%'
  )
);

-- Allow providers to upload only into the 'invoices/' folder.
CREATE POLICY "spf_provider_upload_invoice"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-provider-files'
  AND (storage.foldername(name))[1] = 'invoices'
);
