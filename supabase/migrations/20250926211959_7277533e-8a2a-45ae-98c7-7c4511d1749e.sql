-- Create public bucket for company assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create policy to allow public access to company assets
CREATE POLICY "Public access to company assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'company-assets');