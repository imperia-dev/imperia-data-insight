-- Allow customers to delete their own pendency requests
CREATE POLICY "Customers can delete own requests"
ON public.customer_pendency_requests
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'customer'::app_role) 
  AND customer_name = get_user_customer(auth.uid())
  AND created_by = auth.uid()
);