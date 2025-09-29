-- Add policy to allow users to view basic profile info of users in same chat channels
CREATE POLICY "Users can view profiles of users in same channels"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- User can always see their own profile
    auth.uid() = id
    OR
    -- User can see profiles of users in the same chat channels
    EXISTS (
      SELECT 1
      FROM public.chat_channel_members cm1
      JOIN public.chat_channel_members cm2 ON cm1.channel_id = cm2.channel_id
      WHERE cm1.user_id = auth.uid()
      AND cm2.user_id = profiles.id
    )
  )
);