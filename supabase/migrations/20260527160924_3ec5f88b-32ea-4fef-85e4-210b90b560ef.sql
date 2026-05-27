
ALTER TABLE public.trial_customers
  ADD COLUMN IF NOT EXISTS trial_pages_limit integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS trial_single_doc_pages_limit integer NOT NULL DEFAULT 30;

CREATE OR REPLACE FUNCTION public.get_trial_usage(p_customer_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
  v_customer record;
  v_docs_used integer;
  v_pages_used integer;
BEGIN
  v_customer_id := COALESCE(p_customer_id, public.current_trial_customer_id());
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer not found';
  END IF;

  SELECT id, trial_doc_limit, trial_pages_per_doc_limit, trial_pages_limit, trial_single_doc_pages_limit
    INTO v_customer
    FROM public.trial_customers
    WHERE id = v_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer not found';
  END IF;

  IF v_customer.id <> COALESCE(public.current_trial_customer_id(), '00000000-0000-0000-0000-000000000000'::uuid)
     AND NOT (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'master')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT
    COUNT(*)::int,
    COALESCE(SUM(COALESCE(f.pages, 0)), 0)::int
    INTO v_docs_used, v_pages_used
    FROM public.trial_order_files f
    JOIN public.trial_orders o ON o.id = f.order_id
    WHERE o.customer_id = v_customer_id
      AND COALESCE(f.kind, 'source') = 'source'
      AND o.status::text NOT IN ('draft','cancelled');

  RETURN jsonb_build_object(
    'customer_id', v_customer.id,
    'docs_used', v_docs_used,
    'docs_limit', v_customer.trial_doc_limit,
    'pages_used', v_pages_used,
    'pages_limit', v_customer.trial_pages_limit,
    'pages_per_doc_limit', v_customer.trial_pages_per_doc_limit,
    'single_doc_pages_limit', v_customer.trial_single_doc_pages_limit,
    'remaining', GREATEST(v_customer.trial_doc_limit - v_docs_used, 0),
    'remaining_docs', GREATEST(v_customer.trial_doc_limit - v_docs_used, 0),
    'remaining_pages', GREATEST(v_customer.trial_pages_limit - v_pages_used, 0),
    'blocked', (v_docs_used >= v_customer.trial_doc_limit) OR (v_pages_used >= v_customer.trial_pages_limit)
  );
END;
$function$;
