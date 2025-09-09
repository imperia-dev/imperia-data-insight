-- Create table for pendencies
CREATE TABLE public.pendencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id),
  c4u_id TEXT NOT NULL,
  description TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_document_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.pendencies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pendencies
CREATE POLICY "Owner, master and admin can view all pendencies" 
ON public.pendencies 
FOR SELECT 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

CREATE POLICY "Owner, master and admin can insert pendencies" 
ON public.pendencies 
FOR INSERT 
WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

CREATE POLICY "Owner, master and admin can update pendencies" 
ON public.pendencies 
FOR UPDATE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role, 'admin'::user_role]));

CREATE POLICY "Owner and master can delete pendencies" 
ON public.pendencies 
FOR DELETE 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pendencies_updated_at
BEFORE UPDATE ON public.pendencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();