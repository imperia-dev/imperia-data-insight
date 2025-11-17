-- Fix search_path warning by setting it explicitly in the function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;