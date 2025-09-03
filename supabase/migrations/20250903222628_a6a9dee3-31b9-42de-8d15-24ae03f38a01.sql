-- Fix RLS policy for operation users to take any available order
DROP POLICY IF EXISTS "Operation can update own orders" ON orders;

CREATE POLICY "Operation can take available orders" 
ON orders 
FOR UPDATE 
USING (
  get_user_role(auth.uid()) = 'operation'::user_role 
  AND (
    status_order = 'available' -- Can take any available order
    OR (assigned_to = auth.uid() AND status_order = 'in_progress') -- Can update own in-progress orders
  )
);