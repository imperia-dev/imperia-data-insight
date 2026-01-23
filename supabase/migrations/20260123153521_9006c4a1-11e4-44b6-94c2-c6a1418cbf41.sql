-- Creative Studio enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='studio_role') THEN
    CREATE TYPE public.studio_role AS ENUM ('admin','editor','viewer');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='brand_asset_type') THEN
    CREATE TYPE public.brand_asset_type AS ENUM ('logo','palette','font','example_creative','prohibited_word');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='knowledge_source_type') THEN
    CREATE TYPE public.knowledge_source_type AS ENUM ('website','competitor_inspiration','brand_kit_summary');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='generation_status') THEN
    CREATE TYPE public.generation_status AS ENUM ('pending','generating','completed','failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='creative_status') THEN
    CREATE TYPE public.creative_status AS ENUM ('generated','approved','rejected','adjusted');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='calendar_post_status') THEN
    CREATE TYPE public.calendar_post_status AS ENUM ('scheduled','posted','failed');
  END IF;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  style_guide jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.studio_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.brand_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_type public.brand_asset_type NOT NULL,
  value jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_type public.knowledge_source_type NOT NULL,
  content text NOT NULL,
  source_url text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  objective text NOT NULL,
  campaign_theme text,
  cta text NOT NULL,
  format text NOT NULL DEFAULT '1080x1080',
  quantity_requested int NOT NULL,
  status public.generation_status NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT generations_quantity_requested_chk CHECK (quantity_requested BETWEEN 1 AND 20)
);

CREATE TABLE IF NOT EXISTS public.creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  concept_headline text,
  concept_subheadline text,
  concept_bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  caption text,
  hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_path text,
  image_url text,
  rationale text,
  status public.creative_status NOT NULL DEFAULT 'generated',
  feedback text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creatives_version_chk CHECK (version >= 1)
);

CREATE TABLE IF NOT EXISTS public.creative_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid NOT NULL REFERENCES public.creatives(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  feedback text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calendar_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid NOT NULL REFERENCES public.creatives(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  posted_at timestamptz,
  status public.calendar_post_status NOT NULL DEFAULT 'scheduled',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_memberships_company_id ON public.company_memberships(company_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_id ON public.company_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_brand_assets_company_id ON public.brand_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_company_id ON public.knowledge_base(company_id);
CREATE INDEX IF NOT EXISTS idx_generations_company_id ON public.generations(company_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_creatives_generation_id ON public.creatives(generation_id);
CREATE INDEX IF NOT EXISTS idx_creatives_company_id ON public.creatives(company_id);
CREATE INDEX IF NOT EXISTS idx_calendar_posts_company_id ON public.calendar_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_calendar_posts_creative_id ON public.calendar_posts(creative_id);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_generations_updated_at ON public.generations;
CREATE TRIGGER set_generations_updated_at
BEFORE UPDATE ON public.generations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Access helper functions
CREATE OR REPLACE FUNCTION public.is_company_member(p_company_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships m
    WHERE m.company_id = p_company_id AND m.user_id = p_user_id
  )
  OR (public.get_user_role(p_user_id) IN ('owner','master'))
$$;

CREATE OR REPLACE FUNCTION public.company_role(p_company_id uuid, p_user_id uuid)
RETURNS public.studio_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.role
  FROM public.company_memberships m
  WHERE m.company_id = p_company_id AND m.user_id = p_user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_company_write_access(p_company_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.get_user_role(p_user_id) IN ('owner','master'))
  OR EXISTS (
    SELECT 1
    FROM public.company_memberships m
    WHERE m.company_id = p_company_id
      AND m.user_id = p_user_id
      AND m.role IN ('admin','editor')
  )
$$;

CREATE OR REPLACE FUNCTION public.has_company_admin_access(p_company_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.get_user_role(p_user_id) IN ('owner','master'))
  OR EXISTS (
    SELECT 1
    FROM public.company_memberships m
    WHERE m.company_id = p_company_id
      AND m.user_id = p_user_id
      AND m.role = 'admin'
  )
$$;

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies: companies
DROP POLICY IF EXISTS "companies_select_member" ON public.companies;
CREATE POLICY "companies_select_member"
ON public.companies
FOR SELECT
USING (public.is_company_member(id, auth.uid()));

DROP POLICY IF EXISTS "companies_insert_owner" ON public.companies;
CREATE POLICY "companies_insert_owner"
ON public.companies
FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "companies_update_admin" ON public.companies;
CREATE POLICY "companies_update_admin"
ON public.companies
FOR UPDATE
USING (public.has_company_admin_access(id, auth.uid()))
WITH CHECK (public.has_company_admin_access(id, auth.uid()));

DROP POLICY IF EXISTS "companies_delete_admin" ON public.companies;
CREATE POLICY "companies_delete_admin"
ON public.companies
FOR DELETE
USING (public.has_company_admin_access(id, auth.uid()));

-- RLS policies: company_memberships
DROP POLICY IF EXISTS "memberships_select_member" ON public.company_memberships;
CREATE POLICY "memberships_select_member"
ON public.company_memberships
FOR SELECT
USING (public.is_company_member(company_id, auth.uid()));

DROP POLICY IF EXISTS "memberships_insert_admin" ON public.company_memberships;
CREATE POLICY "memberships_insert_admin"
ON public.company_memberships
FOR INSERT
WITH CHECK (public.has_company_admin_access(company_id, auth.uid()));

DROP POLICY IF EXISTS "memberships_update_admin" ON public.company_memberships;
CREATE POLICY "memberships_update_admin"
ON public.company_memberships
FOR UPDATE
USING (public.has_company_admin_access(company_id, auth.uid()))
WITH CHECK (public.has_company_admin_access(company_id, auth.uid()));

DROP POLICY IF EXISTS "memberships_delete_admin" ON public.company_memberships;
CREATE POLICY "memberships_delete_admin"
ON public.company_memberships
FOR DELETE
USING (public.has_company_admin_access(company_id, auth.uid()));

-- RLS policies: brand_assets
DROP POLICY IF EXISTS "brand_assets_select_member" ON public.brand_assets;
CREATE POLICY "brand_assets_select_member"
ON public.brand_assets
FOR SELECT
USING (public.is_company_member(company_id, auth.uid()));

DROP POLICY IF EXISTS "brand_assets_insert_writer" ON public.brand_assets;
CREATE POLICY "brand_assets_insert_writer"
ON public.brand_assets
FOR INSERT
WITH CHECK (public.has_company_write_access(company_id, auth.uid()) AND auth.uid() = created_by);

DROP POLICY IF EXISTS "brand_assets_update_writer" ON public.brand_assets;
CREATE POLICY "brand_assets_update_writer"
ON public.brand_assets
FOR UPDATE
USING (public.has_company_write_access(company_id, auth.uid()))
WITH CHECK (public.has_company_write_access(company_id, auth.uid()));

DROP POLICY IF EXISTS "brand_assets_delete_writer" ON public.brand_assets;
CREATE POLICY "brand_assets_delete_writer"
ON public.brand_assets
FOR DELETE
USING (public.has_company_write_access(company_id, auth.uid()));

-- RLS policies: knowledge_base
DROP POLICY IF EXISTS "knowledge_base_select_member" ON public.knowledge_base;
CREATE POLICY "knowledge_base_select_member"
ON public.knowledge_base
FOR SELECT
USING (public.is_company_member(company_id, auth.uid()));

DROP POLICY IF EXISTS "knowledge_base_insert_writer" ON public.knowledge_base;
CREATE POLICY "knowledge_base_insert_writer"
ON public.knowledge_base
FOR INSERT
WITH CHECK (public.has_company_write_access(company_id, auth.uid()) AND auth.uid() = created_by);

DROP POLICY IF EXISTS "knowledge_base_update_writer" ON public.knowledge_base;
CREATE POLICY "knowledge_base_update_writer"
ON public.knowledge_base
FOR UPDATE
USING (public.has_company_write_access(company_id, auth.uid()))
WITH CHECK (public.has_company_write_access(company_id, auth.uid()));

DROP POLICY IF EXISTS "knowledge_base_delete_writer" ON public.knowledge_base;
CREATE POLICY "knowledge_base_delete_writer"
ON public.knowledge_base
FOR DELETE
USING (public.has_company_write_access(company_id, auth.uid()));

-- RLS policies: generations
DROP POLICY IF EXISTS "generations_select_member" ON public.generations;
CREATE POLICY "generations_select_member"
ON public.generations
FOR SELECT
USING (public.is_company_member(company_id, auth.uid()));

DROP POLICY IF EXISTS "generations_insert_writer" ON public.generations;
CREATE POLICY "generations_insert_writer"
ON public.generations
FOR INSERT
WITH CHECK (public.has_company_write_access(company_id, auth.uid()) AND auth.uid() = user_id);

DROP POLICY IF EXISTS "generations_update_writer" ON public.generations;
CREATE POLICY "generations_update_writer"
ON public.generations
FOR UPDATE
USING (public.has_company_write_access(company_id, auth.uid()))
WITH CHECK (public.has_company_write_access(company_id, auth.uid()));

-- RLS policies: creatives
DROP POLICY IF EXISTS "creatives_select_member" ON public.creatives;
CREATE POLICY "creatives_select_member"
ON public.creatives
FOR SELECT
USING (public.is_company_member(company_id, auth.uid()));

DROP POLICY IF EXISTS "creatives_insert_writer" ON public.creatives;
CREATE POLICY "creatives_insert_writer"
ON public.creatives
FOR INSERT
WITH CHECK (public.has_company_write_access(company_id, auth.uid()));

DROP POLICY IF EXISTS "creatives_update_writer" ON public.creatives;
CREATE POLICY "creatives_update_writer"
ON public.creatives
FOR UPDATE
USING (public.has_company_write_access(company_id, auth.uid()))
WITH CHECK (public.has_company_write_access(company_id, auth.uid()));

-- RLS policies: creative_adjustments
DROP POLICY IF EXISTS "creative_adjustments_select_member" ON public.creative_adjustments;
CREATE POLICY "creative_adjustments_select_member"
ON public.creative_adjustments
FOR SELECT
USING (public.is_company_member(company_id, auth.uid()));

DROP POLICY IF EXISTS "creative_adjustments_insert_writer" ON public.creative_adjustments;
CREATE POLICY "creative_adjustments_insert_writer"
ON public.creative_adjustments
FOR INSERT
WITH CHECK (public.has_company_write_access(company_id, auth.uid()) AND auth.uid() = user_id);

-- RLS policies: calendar_posts
DROP POLICY IF EXISTS "calendar_posts_select_member" ON public.calendar_posts;
CREATE POLICY "calendar_posts_select_member"
ON public.calendar_posts
FOR SELECT
USING (public.is_company_member(company_id, auth.uid()));

DROP POLICY IF EXISTS "calendar_posts_insert_writer" ON public.calendar_posts;
CREATE POLICY "calendar_posts_insert_writer"
ON public.calendar_posts
FOR INSERT
WITH CHECK (public.has_company_write_access(company_id, auth.uid()) AND auth.uid() = created_by);

DROP POLICY IF EXISTS "calendar_posts_update_writer" ON public.calendar_posts;
CREATE POLICY "calendar_posts_update_writer"
ON public.calendar_posts
FOR UPDATE
USING (public.has_company_write_access(company_id, auth.uid()))
WITH CHECK (public.has_company_write_access(company_id, auth.uid()));

DROP POLICY IF EXISTS "calendar_posts_delete_writer" ON public.calendar_posts;
CREATE POLICY "calendar_posts_delete_writer"
ON public.calendar_posts
FOR DELETE
USING (public.has_company_write_access(company_id, auth.uid()));

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('creative-images', 'creative-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage access helper
CREATE OR REPLACE FUNCTION public.can_access_company_storage(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_company_member(p_company_id, auth.uid())
$$;

-- Storage RLS policies (by folder: {companyId}/...)
-- NOTE: Policies live on storage.objects

-- brand-assets
DROP POLICY IF EXISTS "brand_assets_read" ON storage.objects;
CREATE POLICY "brand_assets_read"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'brand-assets'
  AND public.can_access_company_storage((storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "brand_assets_write" ON storage.objects;
CREATE POLICY "brand_assets_write"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'brand-assets'
  AND public.can_access_company_storage((storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "brand_assets_update" ON storage.objects;
CREATE POLICY "brand_assets_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'brand-assets'
  AND public.can_access_company_storage((storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id = 'brand-assets'
  AND public.can_access_company_storage((storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "brand_assets_delete" ON storage.objects;
CREATE POLICY "brand_assets_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'brand-assets'
  AND public.can_access_company_storage((storage.foldername(name))[1]::uuid)
);

-- creative-images
DROP POLICY IF EXISTS "creative_images_read" ON storage.objects;
CREATE POLICY "creative_images_read"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'creative-images'
  AND public.can_access_company_storage((storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "creative_images_write" ON storage.objects;
CREATE POLICY "creative_images_write"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'creative-images'
  AND public.can_access_company_storage((storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "creative_images_update" ON storage.objects;
CREATE POLICY "creative_images_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'creative-images'
  AND public.can_access_company_storage((storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id = 'creative-images'
  AND public.can_access_company_storage((storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "creative_images_delete" ON storage.objects;
CREATE POLICY "creative_images_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'creative-images'
  AND public.can_access_company_storage((storage.foldername(name))[1]::uuid)
);
