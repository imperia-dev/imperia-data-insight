-- Create table for payment recipient emails
CREATE TABLE public.payment_recipient_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  company TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_recipient_emails ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Owner and master can manage recipient emails" 
ON public.payment_recipient_emails 
FOR ALL 
USING (get_user_role(auth.uid()) = ANY (ARRAY['owner'::user_role, 'master'::user_role]));

CREATE POLICY "Admin can view recipient emails" 
ON public.payment_recipient_emails 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin'::user_role);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_recipient_emails_updated_at
BEFORE UPDATE ON public.payment_recipient_emails
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();