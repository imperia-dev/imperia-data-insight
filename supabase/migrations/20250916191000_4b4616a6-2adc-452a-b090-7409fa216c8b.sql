-- Create table for daily document limits
CREATE TABLE public.user_document_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_limit INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_document_limits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Owner and master can view limits" 
ON public.user_document_limits 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

CREATE POLICY "Owner and master can insert limits" 
ON public.user_document_limits 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

CREATE POLICY "Owner and master can update limits" 
ON public.user_document_limits 
FOR UPDATE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

CREATE POLICY "Owner and master can delete limits" 
ON public.user_document_limits 
FOR DELETE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

-- Create trigger for updated_at
CREATE TRIGGER update_user_document_limits_updated_at
BEFORE UPDATE ON public.user_document_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();