-- Make the service-provider-files bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'service-provider-files';