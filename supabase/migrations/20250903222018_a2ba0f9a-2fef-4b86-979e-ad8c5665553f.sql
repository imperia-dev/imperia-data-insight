-- Update RLS policy for operation to properly view orders
DROP POLICY IF EXISTS "Operation can view available and own orders" ON orders;

CREATE POLICY "Operation can view available and own orders" 
ON orders 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'operation'::user_role 
  AND (
    status_order = 'available' 
    OR (assigned_to = auth.uid() AND status_order IN ('in_progress', 'delivered'))
  )
);