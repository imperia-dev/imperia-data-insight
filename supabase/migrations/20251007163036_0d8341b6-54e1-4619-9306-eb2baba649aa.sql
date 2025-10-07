-- Drop the existing function
DROP FUNCTION IF EXISTS public.generate_protocol_number(text, date, text);

-- Recreate with corrected logic to handle both RAS- prefixed and non-prefixed protocols
CREATE OR REPLACE FUNCTION public.generate_protocol_number(p_type text, p_competence_month date, p_supplier_name text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prefix text;
  v_year_month text;
  v_sequence integer;
  v_supplier_suffix text;
  v_protocol_number text;
BEGIN
  -- Define prefix based on type
  IF p_type = 'service_provider' THEN
    v_prefix := 'PREST-DIAG';
  ELSIF p_type = 'consolidated' THEN
    v_prefix := 'CONS-DIAG';
  ELSIF p_type = 'reviewer' THEN
    v_prefix := 'PREST-REV';
  ELSE
    RAISE EXCEPTION 'Invalid protocol type: %', p_type;
  END IF;
  
  -- Year-month format
  v_year_month := to_char(p_competence_month, 'YYYYMM');
  
  -- Calculate monthly sequence
  IF p_type = 'service_provider' THEN
    SELECT COALESCE(MAX(CAST(split_part(protocol_number, '-', 4) AS integer)), 0) + 1
    INTO v_sequence
    FROM public.service_provider_protocols
    WHERE protocol_number LIKE 'PREST-DIAG-' || v_year_month || '-%';
    
    -- Add supplier name suffix (first 3 letters, uppercase)
    IF p_supplier_name IS NOT NULL THEN
      v_supplier_suffix := upper(substring(regexp_replace(p_supplier_name, '[^a-zA-Z]', '', 'g'), 1, 3));
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || 
                          lpad(v_sequence::text, 3, '0') || '-' || v_supplier_suffix;
    ELSE
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || lpad(v_sequence::text, 3, '0');
    END IF;
  ELSIF p_type = 'reviewer' THEN
    -- FIXED: Search for both RAS- prefixed and non-prefixed protocols
    -- Extract sequence from both patterns:
    -- Pattern 1: PREST-REV-202509-001-UNK (split_part position 4)
    -- Pattern 2: RAS-PREST-REV-202509-001-UNK (split_part position 5)
    SELECT COALESCE(
      MAX(
        CASE 
          WHEN protocol_number LIKE 'RAS-PREST-REV-%' THEN 
            CAST(split_part(protocol_number, '-', 5) AS integer)
          ELSE 
            CAST(split_part(protocol_number, '-', 4) AS integer)
        END
      ), 0) + 1
    INTO v_sequence
    FROM public.reviewer_protocols
    WHERE (protocol_number LIKE 'PREST-REV-' || v_year_month || '-%' 
           OR protocol_number LIKE 'RAS-PREST-REV-' || v_year_month || '-%');
    
    -- Add reviewer name suffix (first 3 letters, uppercase)
    IF p_supplier_name IS NOT NULL THEN
      v_supplier_suffix := upper(substring(regexp_replace(p_supplier_name, '[^a-zA-Z]', '', 'g'), 1, 3));
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || 
                          lpad(v_sequence::text, 3, '0') || '-' || v_supplier_suffix;
    ELSE
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || lpad(v_sequence::text, 3, '0');
    END IF;
  ELSE
    -- For consolidated protocol, no sequence (unique per month)
    v_protocol_number := v_prefix || '-' || v_year_month;
  END IF;
  
  RETURN v_protocol_number;
END;
$function$;