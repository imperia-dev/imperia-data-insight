-- Update payment-receipts bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-receipts';