-- Create bucket for customer pendency attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pendency-attachments',
  'pendency-attachments',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/zip']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for pendency-attachments bucket

-- Allow authenticated users to view attachments
CREATE POLICY "Allow authenticated users to view pendency attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pendency-attachments');

-- Allow authenticated users to upload attachments
CREATE POLICY "Allow authenticated users to upload pendency attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pendency-attachments');

-- Allow users to update their own attachments
CREATE POLICY "Allow users to update own pendency attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pendency-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own attachments
CREATE POLICY "Allow users to delete own pendency attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pendency-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);