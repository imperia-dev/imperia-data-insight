-- Create table for anonymous bad news reports
CREATE TABLE public.bad_news_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (but allow inserts from everyone)
ALTER TABLE public.bad_news_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to insert (anonymous)
CREATE POLICY "Anyone can submit bad news anonymously"
ON public.bad_news_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only owner can view the reports
CREATE POLICY "Only owner can view bad news reports"
ON public.bad_news_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'owner'
  )
);

-- Add index for performance
CREATE INDEX idx_bad_news_created_at ON public.bad_news_reports(created_at DESC);