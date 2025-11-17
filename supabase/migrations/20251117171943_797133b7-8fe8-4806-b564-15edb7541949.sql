-- Create table to track status history for customer pendency requests
CREATE TABLE IF NOT EXISTS public.customer_pendency_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.customer_pendency_requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.customer_pendency_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Customers can view own request history"
  ON public.customer_pendency_status_history
  FOR SELECT
  USING (
    has_role(auth.uid(), 'customer'::app_role) 
    AND EXISTS (
      SELECT 1 FROM public.customer_pendency_requests
      WHERE id = request_id 
      AND customer_name = get_user_customer(auth.uid())
    )
  );

CREATE POLICY "Internal team can view all request history"
  ON public.customer_pendency_status_history
  FOR SELECT
  USING (
    get_user_role_new(auth.uid()) = ANY (ARRAY['owner'::app_role, 'master'::app_role, 'admin'::app_role])
  );

-- Create index for better performance
CREATE INDEX idx_customer_pendency_status_history_request_id 
  ON public.customer_pendency_status_history(request_id);

CREATE INDEX idx_customer_pendency_status_history_changed_at 
  ON public.customer_pendency_status_history(changed_at DESC);

-- Function to automatically create history entry on status change
CREATE OR REPLACE FUNCTION track_customer_pendency_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert history record when status changes or on creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.customer_pendency_status_history (
      request_id, 
      status, 
      changed_by, 
      changed_at,
      notes,
      metadata
    ) VALUES (
      NEW.id, 
      NEW.status, 
      NEW.created_by, 
      NEW.created_at,
      'Solicitação criada',
      jsonb_build_object('priority', NEW.priority, 'order_id', NEW.order_id)
    );
  ELSIF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.customer_pendency_status_history (
      request_id, 
      status, 
      changed_by,
      notes,
      metadata
    ) VALUES (
      NEW.id, 
      NEW.status, 
      auth.uid(),
      CASE 
        WHEN NEW.status = 'under_review' THEN 'Status alterado para em análise'
        WHEN NEW.status = 'approved' THEN 'Solicitação aprovada'
        WHEN NEW.status = 'rejected' THEN 'Solicitação rejeitada: ' || COALESCE(NEW.rejection_reason, '')
        WHEN NEW.status = 'converted' THEN 'Solicitação convertida em pendência'
        ELSE 'Status alterado para ' || NEW.status
      END,
      jsonb_build_object(
        'previous_status', OLD.status,
        'rejection_reason', NEW.rejection_reason,
        'converted_to_pendency_id', NEW.converted_to_pendency_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_customer_pendency_status_change ON public.customer_pendency_requests;
CREATE TRIGGER trigger_customer_pendency_status_change
  AFTER INSERT OR UPDATE ON public.customer_pendency_requests
  FOR EACH ROW
  EXECUTE FUNCTION track_customer_pendency_status_change();

-- Populate history for existing records (one-time migration)
INSERT INTO public.customer_pendency_status_history (request_id, status, changed_by, changed_at, notes)
SELECT 
  id, 
  status, 
  created_by, 
  created_at,
  'Solicitação criada (histórico retroativo)'
FROM public.customer_pendency_requests
WHERE NOT EXISTS (
  SELECT 1 FROM public.customer_pendency_status_history 
  WHERE request_id = customer_pendency_requests.id
);