-- Create chat channels table
CREATE TABLE public.chat_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'dm')),
  icon TEXT DEFAULT '💬',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archived BOOLEAN DEFAULT false
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  reply_to UUID REFERENCES public.chat_messages(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  attachments JSONB DEFAULT '[]'::jsonb
);

-- Create chat presence table
CREATE TABLE public.chat_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  channel_id UUID REFERENCES public.chat_channels(id),
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'away', 'busy', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_typing BOOLEAN DEFAULT false,
  typing_channel_id UUID REFERENCES public.chat_channels(id),
  UNIQUE(user_id)
);

-- Create chat reactions table
CREATE TABLE public.chat_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create chat channel members table (for private channels and DMs)
CREATE TABLE public.chat_channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notifications_enabled BOOLEAN DEFAULT true,
  UNIQUE(channel_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_channels
CREATE POLICY "Users can view public channels" 
ON public.chat_channels 
FOR SELECT 
USING (type = 'public' OR EXISTS (
  SELECT 1 FROM public.chat_channel_members 
  WHERE channel_id = chat_channels.id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can create channels" 
ON public.chat_channels 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Channel creators can update their channels" 
ON public.chat_channels 
FOR UPDATE 
USING (created_by = auth.uid());

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in accessible channels" 
ON public.chat_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.chat_channels 
  WHERE id = chat_messages.channel_id 
  AND (type = 'public' OR EXISTS (
    SELECT 1 FROM public.chat_channel_members 
    WHERE channel_id = chat_channels.id 
    AND user_id = auth.uid()
  ))
));

CREATE POLICY "Users can send messages to accessible channels" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.chat_channels 
    WHERE id = channel_id 
    AND (type = 'public' OR EXISTS (
      SELECT 1 FROM public.chat_channel_members 
      WHERE channel_id = chat_channels.id 
      AND user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can edit their own messages" 
ON public.chat_messages 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can soft delete their own messages" 
ON public.chat_messages 
FOR UPDATE 
USING (user_id = auth.uid());

-- RLS Policies for chat_presence
CREATE POLICY "Users can view all presence" 
ON public.chat_presence 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own presence" 
ON public.chat_presence 
FOR ALL 
USING (user_id = auth.uid());

-- RLS Policies for chat_reactions
CREATE POLICY "Users can view reactions" 
ON public.chat_reactions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can add their own reactions" 
ON public.chat_reactions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own reactions" 
ON public.chat_reactions 
FOR DELETE 
USING (user_id = auth.uid());

-- RLS Policies for chat_channel_members
CREATE POLICY "Users can view channel members" 
ON public.chat_channel_members 
FOR SELECT 
USING (true);

CREATE POLICY "Users can join public channels" 
ON public.chat_channel_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.chat_channels 
    WHERE id = channel_id 
    AND type = 'public'
  )
);

CREATE POLICY "Users can update their membership" 
ON public.chat_channel_members 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can leave channels" 
ON public.chat_channel_members 
FOR DELETE 
USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_chat_messages_channel_id ON public.chat_messages(channel_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_presence_user_id ON public.chat_presence(user_id);
CREATE INDEX idx_chat_channel_members_user_id ON public.chat_channel_members(user_id);
CREATE INDEX idx_chat_channel_members_channel_id ON public.chat_channel_members(channel_id);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;

-- Create update timestamp trigger
CREATE TRIGGER update_chat_channels_updated_at
BEFORE UPDATE ON public.chat_channels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default public channel
INSERT INTO public.chat_channels (name, description, type, icon, created_by)
VALUES 
  ('geral', 'Canal geral para toda a equipe', 'public', '🌐', NULL),
  ('avisos', 'Avisos e comunicados importantes', 'public', '📢', NULL),
  ('random', 'Conversas aleatórias e descontraídas', 'public', '🎲', NULL);