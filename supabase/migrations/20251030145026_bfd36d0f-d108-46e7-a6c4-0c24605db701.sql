-- Create tech_demands table for kanban
CREATE TABLE IF NOT EXISTS public.tech_demands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL DEFAULT 'Imperia Traduções',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps TEXT DEFAULT 'processo default',
  error_message TEXT,
  url TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.tech_demands ENABLE ROW LEVEL SECURITY;

-- Policies for tech_demands
CREATE POLICY "Tech users can view all demands"
  ON public.tech_demands
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'operation')
  );

CREATE POLICY "Tech users can create demands"
  ON public.tech_demands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'operation')
  );

CREATE POLICY "Tech users can update demands"
  ON public.tech_demands
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'operation')
  );

CREATE POLICY "Tech users can delete demands"
  ON public.tech_demands
  FOR DELETE
  TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('owner', 'master', 'admin')
  );

-- Create index for better performance
CREATE INDEX idx_tech_demands_status ON public.tech_demands(status);
CREATE INDEX idx_tech_demands_created_by ON public.tech_demands(created_by);
CREATE INDEX idx_tech_demands_assigned_to ON public.tech_demands(assigned_to);

-- Trigger to update updated_at
CREATE TRIGGER update_tech_demands_updated_at
  BEFORE UPDATE ON public.tech_demands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-set completed_at when status changes to done
CREATE OR REPLACE FUNCTION public.set_tech_demand_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_tech_demand_completed_at
  BEFORE UPDATE ON public.tech_demands
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tech_demand_completed_at();