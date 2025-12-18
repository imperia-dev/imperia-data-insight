-- Create scheduled_messages table
CREATE TABLE public.scheduled_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  schedule_time TIME NOT NULL,
  schedule_days TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  include_metrics JSONB NOT NULL DEFAULT '{}',
  next_execution TIMESTAMP WITH TIME ZONE,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_message_contacts junction table
CREATE TABLE public.scheduled_message_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_message_id UUID NOT NULL REFERENCES public.scheduled_messages(id) ON DELETE CASCADE,
  whatsapp_contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(scheduled_message_id, whatsapp_contact_id)
);

-- Create scheduled_message_logs table for audit
CREATE TABLE public.scheduled_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_message_id UUID NOT NULL REFERENCES public.scheduled_messages(id) ON DELETE CASCADE,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  contacts_sent INTEGER NOT NULL DEFAULT 0,
  contacts_failed INTEGER NOT NULL DEFAULT 0,
  message_sent TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on all tables
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_message_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_message_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scheduled_messages
CREATE POLICY "Owner can manage scheduled messages"
ON public.scheduled_messages
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- RLS Policies for scheduled_message_contacts
CREATE POLICY "Owner can manage scheduled message contacts"
ON public.scheduled_message_contacts
FOR ALL
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- RLS Policies for scheduled_message_logs
CREATE POLICY "Owner can view scheduled message logs"
ON public.scheduled_message_logs
FOR SELECT
USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_messages_updated_at
BEFORE UPDATE ON public.scheduled_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate next execution
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
  v_now TIMESTAMP WITH TIME ZONE := now();
  v_today DATE := CURRENT_DATE;
  v_next TIMESTAMP WITH TIME ZONE;
  v_day_names TEXT[] := ARRAY['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  v_current_day_idx INTEGER;
  v_target_day_idx INTEGER;
  v_days_ahead INTEGER;
  v_min_days_ahead INTEGER := 8;
  v_day TEXT;
BEGIN
  IF p_schedule_type = 'daily' THEN
    v_next := v_today + p_schedule_time;
    IF v_next <= v_now THEN
      v_next := v_next + INTERVAL '1 day';
    END IF;
  ELSIF p_schedule_type = 'weekly' THEN
    v_current_day_idx := EXTRACT(DOW FROM v_now)::INTEGER;
    
    FOREACH v_day IN ARRAY p_schedule_days LOOP
      v_target_day_idx := array_position(v_day_names, v_day) - 1;
      IF v_target_day_idx IS NOT NULL THEN
        v_days_ahead := v_target_day_idx - v_current_day_idx;
        IF v_days_ahead < 0 THEN
          v_days_ahead := v_days_ahead + 7;
        END IF;
        IF v_days_ahead = 0 AND (v_today + p_schedule_time) <= v_now THEN
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
    
    v_next := (v_today + (v_min_days_ahead || ' days')::INTERVAL) + p_schedule_time;
  ELSIF p_schedule_type = 'monthly' THEN
    v_next := date_trunc('month', v_now) + INTERVAL '1 month' + p_schedule_time;
    IF (v_today + p_schedule_time) > v_now AND EXTRACT(DAY FROM v_now) = 1 THEN
      v_next := v_today + p_schedule_time;
    END IF;
  ELSE
    v_next := v_now + INTERVAL '1 day';
  END IF;
  
  RETURN v_next;
END;
$$;

-- Trigger to auto-calculate next_execution on insert/update
CREATE OR REPLACE FUNCTION public.set_next_execution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.next_execution := calculate_next_execution(
    NEW.schedule_type,
    NEW.schedule_time,
    NEW.schedule_days
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_scheduled_message_next_execution
BEFORE INSERT OR UPDATE OF schedule_type, schedule_time, schedule_days, is_active
ON public.scheduled_messages
FOR EACH ROW
EXECUTE FUNCTION public.set_next_execution();