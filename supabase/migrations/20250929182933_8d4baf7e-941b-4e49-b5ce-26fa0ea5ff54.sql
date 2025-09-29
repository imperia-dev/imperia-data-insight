-- Fix infinite recursion in chat_channel_members RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can manage all memberships" ON chat_channel_members;
DROP POLICY IF EXISTS "Users can view memberships of their channels" ON chat_channel_members;
DROP POLICY IF EXISTS "Users can leave channels" ON chat_channel_members;

-- Create simplified policies that avoid recursion

-- Owners can manage all memberships
CREATE POLICY "Owners can manage all memberships"
ON chat_channel_members
FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Users can view memberships where they are the user OR for public channels they are members of
CREATE POLICY "Users can view memberships"
ON chat_channel_members
FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'owner'::user_role
  OR user_id = auth.uid()
);

-- Users can leave channels (delete their own membership)
CREATE POLICY "Users can leave channels"
ON chat_channel_members
FOR DELETE
TO authenticated
USING (user_id = auth.uid());