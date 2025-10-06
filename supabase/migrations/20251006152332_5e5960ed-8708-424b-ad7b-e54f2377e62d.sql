-- Fix RLS policies for service-provider-files bucket uploads

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload their protocol files" ON storage.objects;
DROP POLICY IF EXISTS "Service providers can upload invoices" ON storage.objects;

-- Allow authenticated users to upload files to their own protocol folders
CREATE POLICY "Service providers can upload protocol files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-provider-files' 
  AND (storage.foldername(name))[1] = 'invoices'
);

-- Allow authenticated users to read files in service-provider-files
CREATE POLICY "Service providers can view protocol files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'service-provider-files');

-- Allow owners to manage all files
CREATE POLICY "Owners can manage all service provider files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'service-provider-files' 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'owner'
  )
);