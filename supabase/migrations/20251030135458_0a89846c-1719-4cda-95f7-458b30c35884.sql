-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_announcements_active ON public.announcements(is_active);
CREATE INDEX idx_announcements_priority ON public.announcements(priority);
CREATE INDEX idx_announcements_dates ON public.announcements(start_date, end_date);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Policy: owner, master, operation, translator can view
CREATE POLICY "Authorized roles can view announcements"
  ON public.announcements
  FOR SELECT
  USING (
    get_user_role(auth.uid()) IN ('owner', 'master', 'operation', 'translator')
  );

-- Policy: only owner can insert
CREATE POLICY "Only owner can create announcements"
  ON public.announcements
  FOR INSERT
  WITH CHECK (get_user_role(auth.uid()) = 'owner');

-- Policy: only owner can update
CREATE POLICY "Only owner can update announcements"
  ON public.announcements
  FOR UPDATE
  USING (get_user_role(auth.uid()) = 'owner')
  WITH CHECK (get_user_role(auth.uid()) = 'owner');

-- Policy: only owner can delete
CREATE POLICY "Only owner can delete announcements"
  ON public.announcements
  FOR DELETE
  USING (get_user_role(auth.uid()) = 'owner');

-- Trigger to update updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();