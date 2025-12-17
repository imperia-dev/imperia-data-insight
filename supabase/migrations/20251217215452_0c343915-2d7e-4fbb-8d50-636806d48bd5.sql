-- Create whatsapp_contacts table for storing WhatsApp contacts
CREATE TABLE public.whatsapp_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies: only owner can manage contacts
CREATE POLICY "Owner can manage whatsapp contacts"
ON public.whatsapp_contacts
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Create index for faster lookups
CREATE INDEX idx_whatsapp_contacts_created_by ON public.whatsapp_contacts(created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_whatsapp_contacts_updated_at
BEFORE UPDATE ON public.whatsapp_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();