-- Create table for custom message templates
CREATE TABLE IF NOT EXISTS public.payment_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_message_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view templates
CREATE POLICY "Users can view message templates"
  ON public.payment_message_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Allow users to create their own templates
CREATE POLICY "Users can create message templates"
  ON public.payment_message_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own templates
CREATE POLICY "Users can update their own templates"
  ON public.payment_message_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Allow users to delete their own templates
CREATE POLICY "Users can delete their own templates"
  ON public.payment_message_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_payment_message_templates_updated_at
  BEFORE UPDATE ON public.payment_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_payment_message_templates_created_by ON public.payment_message_templates(created_by);