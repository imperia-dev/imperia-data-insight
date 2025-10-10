-- Fix security warning: Add search_path to functions that don't have it set

-- Fix function: get_business_days_between
CREATE OR REPLACE FUNCTION public.get_business_days_between(p_start_date timestamp with time zone, p_end_date timestamp with time zone)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_days integer := 0;
  v_current_date date;
  v_day_of_week integer;
BEGIN
  v_current_date := p_start_date::date;
  
  WHILE v_current_date < p_end_date::date LOOP
    v_day_of_week := EXTRACT(DOW FROM v_current_date);
    
    -- Count only business days (Monday to Friday: 1-5)
    IF v_day_of_week BETWEEN 1 AND 5 THEN
      v_days := v_days + 1;
    END IF;
    
    v_current_date := v_current_date + interval '1 day';
  END LOOP;
  
  RETURN v_days;
END;
$$;

-- Fix function: update_expenses_on_protocol_approval
CREATE OR REPLACE FUNCTION public.update_expenses_on_protocol_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- When protocol is approved, mark all expenses as paid
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE public.expenses
    SET 
      status = 'pago',
      updated_at = NOW()
    WHERE closing_protocol_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.get_business_days_between IS 'Calculates business days between two dates. Uses immutable search_path for security.';
COMMENT ON FUNCTION public.update_expenses_on_protocol_approval IS 'Trigger function to update expenses when protocol is approved. Uses security definer with empty search_path for security.';