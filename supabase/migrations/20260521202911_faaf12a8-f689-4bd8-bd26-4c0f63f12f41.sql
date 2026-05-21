
-- Columns
ALTER TABLE public.trial_orders
  ADD COLUMN IF NOT EXISTS processing_step smallint,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_at timestamptz;

ALTER TABLE public.trial_orders
  DROP CONSTRAINT IF EXISTS trial_orders_processing_step_check;
ALTER TABLE public.trial_orders
  ADD CONSTRAINT trial_orders_processing_step_check
  CHECK (processing_step IS NULL OR processing_step BETWEEN 1 AND 6);

-- Owner-only: aceitar pedido
CREATE OR REPLACE FUNCTION public.accept_trial_order(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.trial_orders
    SET status = 'accepted', accepted_at = now(), updated_at = now()
  WHERE id = p_order_id AND status = 'submitted';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not in submitted state';
  END IF;
END;
$$;

-- Owner-only: iniciar processamento (etapa 1)
CREATE OR REPLACE FUNCTION public.start_trial_order_processing(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.trial_orders
    SET status = 'processing', processing_step = 1, updated_at = now()
  WHERE id = p_order_id AND status IN ('accepted','submitted');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not ready to start processing';
  END IF;
END;
$$;

-- Owner-only: avançar uma etapa (>6 finaliza)
CREATE OR REPLACE FUNCTION public.advance_trial_order_processing(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_step smallint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT processing_step INTO v_step
    FROM public.trial_orders
    WHERE id = p_order_id AND status = 'processing'
    FOR UPDATE;
  IF v_step IS NULL THEN
    RAISE EXCEPTION 'order not in processing state';
  END IF;
  IF v_step >= 6 THEN
    UPDATE public.trial_orders
      SET status = 'completed', completed_at = now(), updated_at = now()
    WHERE id = p_order_id;
  ELSE
    UPDATE public.trial_orders
      SET processing_step = v_step + 1, updated_at = now()
    WHERE id = p_order_id;
  END IF;
END;
$$;

-- Owner-only: definir etapa específica
CREATE OR REPLACE FUNCTION public.set_trial_order_processing_step(p_order_id uuid, p_step smallint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_step < 1 OR p_step > 6 THEN
    RAISE EXCEPTION 'invalid step';
  END IF;
  UPDATE public.trial_orders
    SET status = 'processing', processing_step = p_step, updated_at = now()
  WHERE id = p_order_id;
END;
$$;

-- Owner-only: marcar como entregue
CREATE OR REPLACE FUNCTION public.mark_trial_order_delivered(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.trial_orders
    SET status = 'delivered', delivered_at = now(), updated_at = now()
  WHERE id = p_order_id AND status IN ('completed','processing');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not ready to be delivered';
  END IF;
END;
$$;

-- Cliente dono confirma recebimento
CREATE OR REPLACE FUNCTION public.confirm_trial_order_received(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer uuid;
BEGIN
  v_customer := public.current_trial_customer_id();
  IF v_customer IS NULL THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.trial_orders
    SET status = 'received', received_at = now(), updated_at = now()
  WHERE id = p_order_id AND customer_id = v_customer AND status = 'delivered';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order not deliverable to confirm';
  END IF;
END;
$$;
