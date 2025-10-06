-- Update protocol number generation to include DIAG in the format
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
  -- Definir prefixo baseado no tipo
  IF p_type = 'service_provider' THEN
    v_prefix := 'PREST-DIAG';
  ELSIF p_type = 'consolidated' THEN
    v_prefix := 'CONS-DIAG';
  ELSE
    RAISE EXCEPTION 'Invalid protocol type: %', p_type;
  END IF;
  
  -- Formato ano-mês
  v_year_month := to_char(p_competence_month, 'YYYYMM');
  
  -- Calcular sequencial do mês
  IF p_type = 'service_provider' THEN
    -- Updated to handle the new format with DIAG
    SELECT COALESCE(MAX(CAST(split_part(protocol_number, '-', 4) AS integer)), 0) + 1
    INTO v_sequence
    FROM public.service_provider_protocols
    WHERE protocol_number LIKE 'PREST-DIAG-' || v_year_month || '-%';
    
    -- Adicionar sufixo do nome do fornecedor (primeiras 3 letras, uppercase)
    IF p_supplier_name IS NOT NULL THEN
      v_supplier_suffix := upper(substring(regexp_replace(p_supplier_name, '[^a-zA-Z]', '', 'g'), 1, 3));
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || 
                          lpad(v_sequence::text, 3, '0') || '-' || v_supplier_suffix;
    ELSE
      v_protocol_number := v_prefix || '-' || v_year_month || '-' || lpad(v_sequence::text, 3, '0');
    END IF;
  ELSE
    -- Para protocolo consolidado, não há sequencial (único por mês)
    v_protocol_number := v_prefix || '-' || v_year_month;
  END IF;
  
  RETURN v_protocol_number;
END;
$function$;