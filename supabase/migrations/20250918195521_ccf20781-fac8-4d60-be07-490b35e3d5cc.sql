-- Create table to track read notifications
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_id TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

-- Enable RLS
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own read notifications" 
ON public.notification_reads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their own notifications as read" 
ON public.notification_reads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own read notifications" 
ON public.notification_reads 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own read notifications" 
ON public.notification_reads 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_notification_reads_user_id ON public.notification_reads(user_id);
CREATE INDEX idx_notification_reads_notification_id ON public.notification_reads(notification_id);