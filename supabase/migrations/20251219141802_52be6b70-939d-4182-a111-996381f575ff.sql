-- Atualizar função para usar fuso horário de Brasília (America/Sao_Paulo)
CREATE OR REPLACE FUNCTION public.calculate_next_execution(
  p_schedule_type TEXT,
  p_schedule_time TIME,
  p_schedule_days TEXT[]
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_tz TEXT := 'America/Sao_Paulo';
  v_now_local TIMESTAMP := (now() AT TIME ZONE v_tz);
  v_today_local DATE := v_now_local::DATE;
  v_next_local TIMESTAMP;
  v_day_names TEXT[] := ARRAY['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  v_current_day_idx INTEGER;
  v_target_day_idx INTEGER;
  v_days_ahead INTEGER;
  v_min_days_ahead INTEGER := 8;
  v_day TEXT;
BEGIN
  IF p_schedule_type = 'daily' THEN
    v_next_local := v_today_local + p_schedule_time;
    IF v_next_local <= v_now_local THEN
      v_next_local := v_next_local + INTERVAL '1 day';
    END IF;
  ELSIF p_schedule_type = 'weekly' THEN
    v_current_day_idx := EXTRACT(DOW FROM v_now_local)::INTEGER;
    
    FOREACH v_day IN ARRAY p_schedule_days LOOP
      v_target_day_idx := array_position(v_day_names, v_day) - 1;
      IF v_target_day_idx IS NOT NULL THEN
        v_days_ahead := v_target_day_idx - v_current_day_idx;
        IF v_days_ahead < 0 THEN
          v_days_ahead := v_days_ahead + 7;
        END IF;
        IF v_days_ahead = 0 AND (v_today_local + p_schedule_time) <= v_now_local THEN
          v_days_ahead := 7;
        END IF;
        IF v_days_ahead < v_min_days_ahead THEN
          v_min_days_ahead := v_days_ahead;
        END IF;
      END IF;
    END LOOP;
    
    IF v_min_days_ahead = 8 THEN
      v_min_days_ahead := 1;
    END IF;
    
    v_next_local := (v_today_local + (v_min_days_ahead || ' days')::INTERVAL) + p_schedule_time;
  ELSIF p_schedule_type = 'monthly' THEN
    v_next_local := date_trunc('month', v_now_local) + INTERVAL '1 month' + p_schedule_time;
    IF (v_today_local + p_schedule_time) > v_now_local AND EXTRACT(DAY FROM v_now_local) = 1 THEN
      v_next_local := v_today_local + p_schedule_time;
    END IF;
  ELSE
    v_next_local := v_now_local + INTERVAL '1 day';
  END IF;
  
  -- Converter de volta para timestamptz (UTC) a partir do horário local de Brasília
  RETURN v_next_local AT TIME ZONE v_tz;
END;
$$;