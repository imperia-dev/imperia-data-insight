-- Extend generate_protocol_number function to support revenue protocols
CREATE OR REPLACE FUNCTION public.generate_protocol_number(
  p_type text, 
  p_competence_month date, 
  p_supplier_name text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  ELSIF p_type = 'revenue' THEN
    v_prefix := 'RECEITA';
  ELSE
    RAISE EXCEPTION 'Invalid protocol type: %', p_type;
  END IF;
  
  -- Year-month format
  v_year_month := to_char(p_competence_month, 'YYYY-MM');
  
  -- Calculate monthly sequence for revenue protocols
  IF p_type = 'revenue' THEN
    SELECT COALESCE(MAX(
      CAST(split_part(protocol_number, '-', 3) AS integer)
    ), 0) + 1
    INTO v_sequence
    FROM public.closing_protocols
    WHERE protocol_number LIKE v_year_month || '-comp-%';
    
    v_protocol_number := v_year_month || '-comp-' || lpad(v_sequence::text, 2, '0');
    
  ELSIF p_type = 'service_provider' THEN
    SELECT COALESCE(MAX(CAST(split_part(protocol_number, '-', 4) AS integer)), 0) + 1
    INTO v_sequence
    FROM public.service_provider_protocols
    WHERE protocol_number LIKE 'PREST-DIAG-' || to_char(p_competence_month, 'YYYYMM') || '-%';
    
    IF p_supplier_name IS NOT NULL THEN
      v_supplier_suffix := upper(substring(regexp_replace(p_supplier_name, '[^a-zA-Z]', '', 'g'), 1, 3));
      v_protocol_number := v_prefix || '-' || to_char(p_competence_month, 'YYYYMM') || '-' || 
                          lpad(v_sequence::text, 3, '0') || '-' || v_supplier_suffix;
    ELSE
      v_protocol_number := v_prefix || '-' || to_char(p_competence_month, 'YYYYMM') || '-' || 
                          lpad(v_sequence::text, 3, '0');
    END IF;
    
  ELSIF p_type = 'reviewer' THEN
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
    WHERE (protocol_number LIKE 'PREST-REV-' || to_char(p_competence_month, 'YYYYMM') || '-%' 
           OR protocol_number LIKE 'RAS-PREST-REV-' || to_char(p_competence_month, 'YYYYMM') || '-%');
    
    IF p_supplier_name IS NOT NULL THEN
      v_supplier_suffix := upper(substring(regexp_replace(p_supplier_name, '[^a-zA-Z]', '', 'g'), 1, 3));
      v_protocol_number := v_prefix || '-' || to_char(p_competence_month, 'YYYYMM') || '-' || 
                          lpad(v_sequence::text, 3, '0') || '-' || v_supplier_suffix;
    ELSE
      v_protocol_number := v_prefix || '-' || to_char(p_competence_month, 'YYYYMM') || '-' || 
                          lpad(v_sequence::text, 3, '0');
    END IF;
    
  ELSE
    -- For consolidated protocol, no sequence (unique per month)
    v_protocol_number := v_prefix || '-' || to_char(p_competence_month, 'YYYYMM');
  END IF;
  
  RETURN v_protocol_number;
END;
$$;