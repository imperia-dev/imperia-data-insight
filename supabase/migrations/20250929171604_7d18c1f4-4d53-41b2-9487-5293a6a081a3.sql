-- Update RLS policies to restrict channel access to members only

-- Drop existing policies for chat_channels
DROP POLICY IF EXISTS "Users can view public channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Channel creators can update their channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Users can create channels" ON public.chat_channels;

-- Create new policies for chat_channels
CREATE POLICY "Users can view channels they are members of"
ON public.chat_channels 
FOR SELECT 
USING (
  -- Owners can see all channels
  get_user_role(auth.uid()) = 'owner'::user_role 
  OR 
  -- Users can see channels they are members of
  EXISTS (
    SELECT 1 FROM public.chat_channel_members 
    WHERE channel_id = chat_channels.id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Owners can create channels"
ON public.chat_channels 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owners can update channels"
ON public.chat_channels 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owners can delete channels"
ON public.chat_channels 
FOR DELETE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Update chat_channel_members policies
DROP POLICY IF EXISTS "Users can join public channels" ON public.chat_channel_members;
DROP POLICY IF EXISTS "Users can leave channels" ON public.chat_channel_members;
DROP POLICY IF EXISTS "Users can update their membership" ON public.chat_channel_members;
DROP POLICY IF EXISTS "Users can view channel members" ON public.chat_channel_members;

CREATE POLICY "Owners can manage all memberships"
ON public.chat_channel_members 
FOR ALL 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Users can view memberships of their channels"
ON public.chat_channel_members 
FOR SELECT 
USING (
  get_user_role(auth.uid()) = 'owner'::user_role 
  OR 
  EXISTS (
    SELECT 1 FROM public.chat_channel_members cm 
    WHERE cm.channel_id = chat_channel_members.channel_id 
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can leave channels"
ON public.chat_channel_members 
FOR DELETE 
USING (user_id = auth.uid());

-- Update chat_messages policies to work with new channel restrictions
DROP POLICY IF EXISTS "Users can send messages to accessible channels" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.chat_messages;

CREATE POLICY "Users can send messages to their channels"
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.chat_channel_members 
    WHERE channel_id = chat_messages.channel_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view messages in their channels"
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_channel_members 
    WHERE channel_id = chat_messages.channel_id 
    AND user_id = auth.uid()
  ) 
  OR 
  get_user_role(auth.uid()) = 'owner'::user_role
);

-- Add all current users to existing channels
DO $$
DECLARE
    channel_record RECORD;
    user_record RECORD;
BEGIN
    FOR channel_record IN SELECT id FROM public.chat_channels LOOP
        FOR user_record IN SELECT id FROM public.profiles LOOP
            INSERT INTO public.chat_channel_members (channel_id, user_id)
            VALUES (channel_record.id, user_record.id)
            ON CONFLICT (channel_id, user_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;