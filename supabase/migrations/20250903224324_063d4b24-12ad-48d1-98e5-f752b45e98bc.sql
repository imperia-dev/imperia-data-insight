-- Fix RLS policy to allow operation users to deliver their assigned orders
DROP POLICY IF EXISTS "Operation can take available orders" ON orders;

CREATE POLICY "Operation can update their orders" 
ON orders 
FOR UPDATE 
USING (
  get_user_role(auth.uid()) = 'operation'::user_role 
  AND (
    status_order = 'available' -- Can take any available order  
    OR assigned_to = auth.uid() -- Can update any order assigned to them (including to deliver)
  )
);