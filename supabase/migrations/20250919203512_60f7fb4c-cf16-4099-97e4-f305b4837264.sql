-- Add payment fields to closing_protocols
ALTER TABLE public.closing_protocols 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'sent', 'paid', 'overdue')),
ADD COLUMN IF NOT EXISTS payment_requested_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_received_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_amount numeric,
ADD COLUMN IF NOT EXISTS receipt_url text,
ADD COLUMN IF NOT EXISTS payment_notes text;

-- Create payment_requests table for tracking billing history
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_ids UUID[] NOT NULL,
  recipient_email text NOT NULL,
  cc_emails text[],
  subject text NOT NULL,
  message text NOT NULL,
  total_amount numeric NOT NULL,
  pdf_url text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'cancelled')),
  sent_at timestamp with time zone,
  viewed_at timestamp with time zone,
  paid_at timestamp with time zone,
  reminder_count integer DEFAULT 0,
  last_reminder_at timestamp with time zone,
  created_by UUID REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create payment_receipts table for storing receipt information
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_id UUID REFERENCES public.closing_protocols(id) ON DELETE CASCADE,
  payment_request_id UUID REFERENCES public.payment_requests(id) ON DELETE SET NULL,
  receipt_number text,
  receipt_date date NOT NULL,
  amount numeric NOT NULL,
  payment_method text,
  bank_reference text,
  file_url text NOT NULL,
  notes text,
  validated boolean DEFAULT false,
  validated_by UUID REFERENCES public.profiles(id),
  validated_at timestamp with time zone,
  created_by UUID REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for payment_requests
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and master can manage payment requests" 
ON public.payment_requests 
FOR ALL 
USING (get_user_role(auth.uid()) IN ('owner', 'master'));

CREATE POLICY "Admin can view payment requests" 
ON public.payment_requests 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policies for payment_receipts
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and master can manage payment receipts" 
ON public.payment_receipts 
FOR ALL 
USING (get_user_role(auth.uid()) IN ('owner', 'master'));

CREATE POLICY "Admin can view payment receipts" 
ON public.payment_receipts 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'admin');

-- Storage policies for payment receipts
CREATE POLICY "Owner and master can upload receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'payment-receipts' AND 
  get_user_role(auth.uid()) IN ('owner', 'master')
);

CREATE POLICY "Owner and master can view receipts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'payment-receipts' AND 
  get_user_role(auth.uid()) IN ('owner', 'master', 'admin')
);

CREATE POLICY "Owner and master can delete receipts" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'payment-receipts' AND 
  get_user_role(auth.uid()) IN ('owner', 'master')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON public.payment_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_protocol_id ON public.payment_receipts(protocol_id);
CREATE INDEX IF NOT EXISTS idx_closing_protocols_payment_status ON public.closing_protocols(payment_status);

-- Create function to update payment status when receipt is uploaded
CREATE OR REPLACE FUNCTION public.update_protocol_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the closing protocol status when a receipt is validated
  IF NEW.validated = true AND OLD.validated = false THEN
    UPDATE public.closing_protocols
    SET 
      payment_status = 'paid',
      payment_received_at = NEW.receipt_date,
      payment_amount = NEW.amount,
      receipt_url = NEW.file_url,
      updated_at = now()
    WHERE id = NEW.protocol_id;
    
    -- Also update the payment request if exists
    IF NEW.payment_request_id IS NOT NULL THEN
      UPDATE public.payment_requests
      SET 
        status = 'paid',
        paid_at = now(),
        updated_at = now()
      WHERE id = NEW.payment_request_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status update
CREATE TRIGGER update_payment_status_on_receipt_validation
AFTER UPDATE ON public.payment_receipts
FOR EACH ROW
WHEN (OLD.validated IS DISTINCT FROM NEW.validated)
EXECUTE FUNCTION public.update_protocol_payment_status();

-- Update updated_at triggers
CREATE TRIGGER update_payment_requests_updated_at
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_receipts_updated_at
BEFORE UPDATE ON public.payment_receipts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();