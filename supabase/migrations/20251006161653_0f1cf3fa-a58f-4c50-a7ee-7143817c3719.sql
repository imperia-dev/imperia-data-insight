-- Create payment-receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for payment-receipts bucket
-- Allow authenticated users to view receipts
CREATE POLICY "Authenticated users can view payment receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-receipts');

-- Allow owner and master to upload receipts
CREATE POLICY "Owner and master can upload payment receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (
    public.get_user_role(auth.uid()) = 'owner'::user_role OR
    public.get_user_role(auth.uid()) = 'master'::user_role
  )
);

-- Allow owner and master to update receipts
CREATE POLICY "Owner and master can update payment receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  (
    public.get_user_role(auth.uid()) = 'owner'::user_role OR
    public.get_user_role(auth.uid()) = 'master'::user_role
  )
);

-- Allow owner to delete receipts
CREATE POLICY "Owner can delete payment receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-receipts' AND
  public.get_user_role(auth.uid()) = 'owner'::user_role
);