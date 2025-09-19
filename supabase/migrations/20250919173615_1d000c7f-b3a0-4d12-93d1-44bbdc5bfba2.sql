-- Create closing_protocols table
CREATE TABLE public.closing_protocols (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_number TEXT NOT NULL UNIQUE,
  competence_month DATE NOT NULL,
  total_ids INTEGER NOT NULL,
  total_pages INTEGER NOT NULL,
  total_value NUMERIC(10,2) NOT NULL,
  avg_value_per_document NUMERIC(10,2) NOT NULL,
  product_1_count INTEGER NOT NULL, -- documents <= 4 pages
  product_2_count INTEGER NOT NULL, -- documents > 4 pages
  document_data JSONB NOT NULL, -- store the CSV data
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add protocol_id column to financial_entries
ALTER TABLE public.financial_entries 
ADD COLUMN protocol_id UUID REFERENCES public.closing_protocols(id);

-- Enable RLS for closing_protocols
ALTER TABLE public.closing_protocols ENABLE ROW LEVEL SECURITY;

-- Create policies for closing_protocols
CREATE POLICY "Owner can manage closing protocols" 
ON public.closing_protocols 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'owner'
  )
);

-- Create index for protocol lookups
CREATE INDEX idx_closing_protocols_protocol_number ON public.closing_protocols(protocol_number);
CREATE INDEX idx_financial_entries_protocol_id ON public.financial_entries(protocol_id);

-- Add trigger to update updated_at
CREATE TRIGGER update_closing_protocols_updated_at
BEFORE UPDATE ON public.closing_protocols
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();