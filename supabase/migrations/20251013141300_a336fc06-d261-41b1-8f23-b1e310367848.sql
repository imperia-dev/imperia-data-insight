-- Ajustar trigger para permitir atualização de despesas quando marcando como pago
CREATE OR REPLACE FUNCTION public.prevent_closed_expense_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- For DELETE operations, we need to check OLD record
  IF TG_OP = 'DELETE' THEN
    IF OLD.closing_protocol_id IS NOT NULL THEN
      -- Check if protocol is closed
      IF EXISTS (
        SELECT 1 FROM public.expense_closing_protocols 
        WHERE id = OLD.closing_protocol_id 
        AND status = 'closed'
      ) THEN
        RAISE EXCEPTION 'Cannot delete expense that is part of a closed protocol';
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  
  -- For UPDATE operations, check OLD record
  IF TG_OP = 'UPDATE' THEN
    -- Allow updates that are ONLY changing status to 'pago' and data_pagamento
    -- This is for the automatic payment trigger
    IF OLD.status != 'pago' AND NEW.status = 'pago' AND 
       (OLD.data_pagamento IS NULL OR OLD.data_pagamento != NEW.data_pagamento) AND
       OLD.closing_protocol_id = NEW.closing_protocol_id THEN
      -- This is the payment trigger updating the expense, allow it
      RETURN NEW;
    END IF;
    
    -- For other updates, check if protocol is closed
    IF OLD.closing_protocol_id IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.expense_closing_protocols 
        WHERE id = OLD.closing_protocol_id 
        AND status = 'closed'
      ) THEN
        RAISE EXCEPTION 'Cannot modify expense that is part of a closed protocol';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  
  -- For INSERT operations
  RETURN NEW;
END;
$function$;