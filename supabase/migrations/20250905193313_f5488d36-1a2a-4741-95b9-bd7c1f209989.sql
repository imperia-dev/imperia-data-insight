-- Create a table for system settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view system settings" 
ON public.system_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admin, master and owner can update system settings" 
ON public.system_settings 
FOR UPDATE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'master'::user_role, 'owner'::user_role]));

CREATE POLICY "Admin, master and owner can insert system settings" 
ON public.system_settings 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'master'::user_role, 'owner'::user_role]));

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default value for last document
INSERT INTO public.system_settings (key, value) 
VALUES ('last_document_id', '')
ON CONFLICT (key) DO NOTHING;