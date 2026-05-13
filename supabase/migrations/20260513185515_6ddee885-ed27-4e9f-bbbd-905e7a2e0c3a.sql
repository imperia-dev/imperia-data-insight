
DROP POLICY IF EXISTS tc_update_own_profile ON public.trial_customers;

CREATE POLICY tc_update_own_profile ON public.trial_customers FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.protect_trial_customer_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Allow if invoked by owner/master, otherwise block protected fields
  IF public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master') THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    RAISE EXCEPTION 'cannot modify approval fields';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_trial_customer_status
  BEFORE UPDATE ON public.trial_customers
  FOR EACH ROW EXECUTE FUNCTION public.protect_trial_customer_status();
