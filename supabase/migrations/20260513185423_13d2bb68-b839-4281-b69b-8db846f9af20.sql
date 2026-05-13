
-- ===== Trial Portal: tabelas, RLS, RPCs e bucket =====

-- Enums
CREATE TYPE public.trial_customer_status AS ENUM ('pending','approved','rejected','deactivated');
CREATE TYPE public.trial_order_status AS ENUM ('draft','submitted','processing','completed','cancelled');
CREATE TYPE public.trial_file_analysis_status AS ENUM ('pending','done','failed');

-- trial_customers
CREATE TABLE public.trial_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  company text,
  cpf_cnpj text,
  status public.trial_customer_status NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trial_customers_status ON public.trial_customers(status);

-- trial_orders
CREATE TABLE public.trial_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.trial_customers(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE,
  language_pair text NOT NULL CHECK (language_pair IN ('pt-it','it-pt')),
  translation_type text NOT NULL DEFAULT 'juramentada',
  status public.trial_order_status NOT NULL DEFAULT 'draft',
  total_documents int NOT NULL DEFAULT 0,
  total_pages int NOT NULL DEFAULT 0,
  total_characters int NOT NULL DEFAULT 0,
  notes text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trial_orders_customer ON public.trial_orders(customer_id);

-- trial_order_files
CREATE TABLE public.trial_order_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.trial_orders(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  pages int NOT NULL DEFAULT 0,
  characters int NOT NULL DEFAULT 0,
  analysis_status public.trial_file_analysis_status NOT NULL DEFAULT 'pending',
  analysis_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_trial_order_files_order ON public.trial_order_files(order_id);

-- updated_at triggers
CREATE TRIGGER trg_trial_customers_updated BEFORE UPDATE ON public.trial_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_trial_orders_updated BEFORE UPDATE ON public.trial_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_trial_order_files_updated BEFORE UPDATE ON public.trial_order_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Order number generator
CREATE OR REPLACE FUNCTION public.generate_trial_order_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yyyymm text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYYMM');
  seq int;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(order_number, '^TR-' || yyyymm || '-', ''), '')::int), 0) + 1
  INTO seq
  FROM public.trial_orders
  WHERE order_number LIKE 'TR-' || yyyymm || '-%';
  RETURN 'TR-' || yyyymm || '-' || lpad(seq::text, 4, '0');
END;
$$;

-- Helper: is current user an approved trial customer
CREATE OR REPLACE FUNCTION public.current_trial_customer_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.trial_customers
  WHERE user_id = auth.uid() AND status = 'approved'
  LIMIT 1;
$$;

-- Approval RPCs (owner-only)
CREATE OR REPLACE FUNCTION public.approve_trial_customer(_customer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.trial_customers
    SET status='approved', approved_by=auth.uid(), approved_at=now(), rejection_reason=NULL
    WHERE id = _customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_trial_customer(_customer_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.trial_customers
    SET status='rejected', approved_by=auth.uid(), approved_at=now(), rejection_reason=_reason
    WHERE id = _customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_trial_customer(_customer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.trial_customers SET status='deactivated' WHERE id = _customer_id;
END;
$$;

-- RLS
ALTER TABLE public.trial_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_order_files ENABLE ROW LEVEL SECURITY;

-- trial_customers policies
CREATE POLICY tc_select_own ON public.trial_customers FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY tc_select_admin ON public.trial_customers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master'));
CREATE POLICY tc_insert_self ON public.trial_customers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY tc_update_own_profile ON public.trial_customers FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status = (SELECT status FROM public.trial_customers WHERE id = trial_customers.id));

-- trial_orders policies
CREATE POLICY to_select_own ON public.trial_orders FOR SELECT TO authenticated
  USING (customer_id = public.current_trial_customer_id());
CREATE POLICY to_select_admin ON public.trial_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master'));
CREATE POLICY to_insert_own ON public.trial_orders FOR INSERT TO authenticated
  WITH CHECK (customer_id = public.current_trial_customer_id());
CREATE POLICY to_update_own ON public.trial_orders FOR UPDATE TO authenticated
  USING (customer_id = public.current_trial_customer_id() AND status IN ('draft'))
  WITH CHECK (customer_id = public.current_trial_customer_id());
CREATE POLICY to_delete_own ON public.trial_orders FOR DELETE TO authenticated
  USING (customer_id = public.current_trial_customer_id() AND status = 'draft');

-- trial_order_files policies
CREATE POLICY tof_select_own ON public.trial_order_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trial_orders o WHERE o.id = order_id AND o.customer_id = public.current_trial_customer_id()));
CREATE POLICY tof_select_admin ON public.trial_order_files FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master'));
CREATE POLICY tof_insert_own ON public.trial_order_files FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.trial_orders o WHERE o.id = order_id AND o.customer_id = public.current_trial_customer_id() AND o.status = 'draft'));
CREATE POLICY tof_delete_own ON public.trial_order_files FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trial_orders o WHERE o.id = order_id AND o.customer_id = public.current_trial_customer_id() AND o.status = 'draft'));

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('trial-uploads','trial-uploads', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY trial_uploads_select_own ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'trial-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY trial_uploads_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trial-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY trial_uploads_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'trial-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY trial_uploads_select_admin ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'trial-uploads' AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'master')));
