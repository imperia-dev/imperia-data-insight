-- Create the service-provider-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-provider-files', 'service-provider-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create RLS policies for the bucket
CREATE POLICY "Anyone can view files in service-provider-files"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-provider-files');

CREATE POLICY "Authenticated users can upload files to service-provider-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'service-provider-files');

CREATE POLICY "Authenticated users can update their files in service-provider-files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'service-provider-files');

CREATE POLICY "Authenticated users can delete files from service-provider-files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'service-provider-files');