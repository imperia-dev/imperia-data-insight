-- Fix the trigger function to properly handle DELETE operations
CREATE OR REPLACE FUNCTION public.prevent_closed_expense_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
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
    RETURN OLD;  -- Important: return OLD for DELETE operations
  END IF;
  
  -- For UPDATE operations, check OLD record
  IF TG_OP = 'UPDATE' THEN
    IF OLD.closing_protocol_id IS NOT NULL THEN
      -- Check if protocol is closed
      IF EXISTS (
        SELECT 1 FROM public.expense_closing_protocols 
        WHERE id = OLD.closing_protocol_id 
        AND status = 'closed'
      ) THEN
        RAISE EXCEPTION 'Cannot modify expense that is part of a closed protocol';
      END IF;
    END IF;
    RETURN NEW;  -- Return NEW for UPDATE operations
  END IF;
  
  -- For INSERT operations (if trigger is also set for INSERT)
  RETURN NEW;
END;
$function$;

-- Now delete the duplicate expense record
DELETE FROM public.expenses 
WHERE id = '7f8e8e52-1fa8-42fe-a9f8-b2f97c4e0074';

-- Verify the deletion
SELECT COUNT(*) as remaining_count 
FROM public.expenses 
WHERE id = '7f8e8e52-1fa8-42fe-a9f8-b2f97c4e0074';