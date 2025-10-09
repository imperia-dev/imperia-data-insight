-- ============================================================================
-- FASE 1: MIGRAÇÃO CRÍTICA DO SISTEMA DE ROLES
-- ============================================================================

-- 1. Criar enum para roles (incluindo 'customer')
CREATE TYPE public.app_role AS ENUM ('owner', 'master', 'admin', 'operation', 'translator', 'customer');

-- 2. Criar tabela user_roles segura
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    customer_name TEXT, -- Para identificar qual cliente (ex: 'Yellowling', 'Cidadania4y')
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Criar funções security definer para evitar recursão em RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role_new(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'owner' THEN 1
      WHEN 'master' THEN 2
      WHEN 'admin' THEN 3
      WHEN 'operation' THEN 4
      WHEN 'translator' THEN 5
      WHEN 'customer' THEN 6
    END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_customer(_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_name FROM public.user_roles
  WHERE user_id = _user_id AND role = 'customer'::app_role
  LIMIT 1
$$;

-- 4. Políticas RLS para user_roles
CREATE POLICY "Owners can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Migração de dados existentes
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, role::text::app_role, NOW()
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Atualizar função get_user_role antiga para manter compatibilidade
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text::user_role FROM public.user_roles WHERE user_id = $1 ORDER BY 
    CASE role
      WHEN 'owner' THEN 1
      WHEN 'master' THEN 2
      WHEN 'admin' THEN 3
      WHEN 'operation' THEN 4
      WHEN 'translator' THEN 5
    END
  LIMIT 1
$$;

-- ============================================================================
-- FASE 2: TABELA DE SOLICITAÇÕES DE PENDÊNCIA (CUSTOMER_PENDENCY_REQUESTS)
-- ============================================================================

CREATE TABLE public.customer_pendency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação
    order_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    
    -- Dados da solicitação
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('baixa', 'normal', 'alta', 'urgente')),
    
    -- Anexos (array de objetos: {url, name, size, type})
    attachments JSONB DEFAULT '[]'::jsonb,
    
    -- Status e workflow
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'converted')),
    
    -- Auditoria
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Conversão para pendência
    converted_to_pendency_id UUID REFERENCES public.pendencies(id),
    converted_at TIMESTAMPTZ,
    converted_by UUID REFERENCES auth.users(id),
    
    -- Notas internas (visível apenas para equipe Impéria)
    internal_notes TEXT,
    rejection_reason TEXT
);

ALTER TABLE public.customer_pendency_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para customer_pendency_requests
CREATE POLICY "Customers can create requests for their company"
ON public.customer_pendency_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'customer'::app_role) AND
  customer_name = public.get_user_customer(auth.uid())
);

CREATE POLICY "Customers can view own requests"
ON public.customer_pendency_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'customer'::app_role) AND
  customer_name = public.get_user_customer(auth.uid())
);

CREATE POLICY "Internal team can manage all requests"
ON public.customer_pendency_requests
FOR ALL
TO authenticated
USING (
  public.get_user_role_new(auth.uid()) IN ('owner'::app_role, 'master'::app_role, 'admin'::app_role)
);

-- Trigger para updated_at
CREATE TRIGGER update_customer_pendency_requests_updated_at
BEFORE UPDATE ON public.customer_pendency_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- FASE 3: STORAGE BUCKET PARA ANEXOS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-pendency-attachments', 'customer-pendency-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para o bucket
CREATE POLICY "Customers can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-pendency-attachments' AND
  public.has_role(auth.uid(), 'customer'::app_role)
);

CREATE POLICY "Customers can view own attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'customer-pendency-attachments' AND
  (
    public.has_role(auth.uid(), 'customer'::app_role) OR
    public.get_user_role_new(auth.uid()) IN ('owner'::app_role, 'master'::app_role, 'admin'::app_role)
  )
);

CREATE POLICY "Internal team can manage all attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'customer-pendency-attachments' AND
  public.get_user_role_new(auth.uid()) IN ('owner'::app_role, 'master'::app_role, 'admin'::app_role)
);