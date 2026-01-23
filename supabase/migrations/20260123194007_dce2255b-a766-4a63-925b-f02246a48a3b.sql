-- Creative Studio: multimodal media + provider jobs (Higgsfield)

-- 1) Media type enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'creative_media_type') THEN
    CREATE TYPE public.creative_media_type AS ENUM ('image', 'video');
  END IF;
END $$;

-- 2) Media table (supports single image, carousel pages, and reels video)
CREATE TABLE IF NOT EXISTS public.creative_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id uuid NOT NULL REFERENCES public.creatives(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  media_type public.creative_media_type NOT NULL,
  position int NOT NULL DEFAULT 1,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_media_creative_id ON public.creative_media(creative_id);
CREATE INDEX IF NOT EXISTS idx_creative_media_company_id ON public.creative_media(company_id);
CREATE INDEX IF NOT EXISTS idx_creative_media_type ON public.creative_media(media_type);

ALTER TABLE public.creative_media ENABLE ROW LEVEL SECURITY;

-- Read: any company member
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='creative_media' AND policyname='creative_media_select_company_members'
  ) THEN
    CREATE POLICY creative_media_select_company_members
    ON public.creative_media
    FOR SELECT
    USING (public.is_company_member(company_id, auth.uid()));
  END IF;
END $$;

-- Write: company admins/editors + owners/masters
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='creative_media' AND policyname='creative_media_insert_company_writers'
  ) THEN
    CREATE POLICY creative_media_insert_company_writers
    ON public.creative_media
    FOR INSERT
    WITH CHECK (public.has_company_write_access(company_id, auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='creative_media' AND policyname='creative_media_update_company_writers'
  ) THEN
    CREATE POLICY creative_media_update_company_writers
    ON public.creative_media
    FOR UPDATE
    USING (public.has_company_write_access(company_id, auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='creative_media' AND policyname='creative_media_delete_company_writers'
  ) THEN
    CREATE POLICY creative_media_delete_company_writers
    ON public.creative_media
    FOR DELETE
    USING (public.has_company_write_access(company_id, auth.uid()));
  END IF;
END $$;

-- 3) Provider jobs table (async queue tracking)
CREATE TABLE IF NOT EXISTS public.creative_provider_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  creative_id uuid NOT NULL REFERENCES public.creatives(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'higgsfield',
  request_id text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  status_url text,
  cancel_url text,
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_payload jsonb,
  error_message text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_creative_provider_jobs_request_id ON public.creative_provider_jobs(request_id);
CREATE INDEX IF NOT EXISTS idx_creative_provider_jobs_creative_id ON public.creative_provider_jobs(creative_id);
CREATE INDEX IF NOT EXISTS idx_creative_provider_jobs_company_id ON public.creative_provider_jobs(company_id);

ALTER TABLE public.creative_provider_jobs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='creative_provider_jobs' AND policyname='creative_provider_jobs_select_company_members'
  ) THEN
    CREATE POLICY creative_provider_jobs_select_company_members
    ON public.creative_provider_jobs
    FOR SELECT
    USING (public.is_company_member(company_id, auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='creative_provider_jobs' AND policyname='creative_provider_jobs_insert_company_writers'
  ) THEN
    CREATE POLICY creative_provider_jobs_insert_company_writers
    ON public.creative_provider_jobs
    FOR INSERT
    WITH CHECK (public.has_company_write_access(company_id, auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='creative_provider_jobs' AND policyname='creative_provider_jobs_update_company_writers'
  ) THEN
    CREATE POLICY creative_provider_jobs_update_company_writers
    ON public.creative_provider_jobs
    FOR UPDATE
    USING (public.has_company_write_access(company_id, auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='creative_provider_jobs' AND policyname='creative_provider_jobs_delete_company_writers'
  ) THEN
    CREATE POLICY creative_provider_jobs_delete_company_writers
    ON public.creative_provider_jobs
    FOR DELETE
    USING (public.has_company_write_access(company_id, auth.uid()));
  END IF;
END $$;

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_creative_provider_jobs_updated_at'
  ) THEN
    CREATE TRIGGER set_creative_provider_jobs_updated_at
    BEFORE UPDATE ON public.creative_provider_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- 4) Storage bucket for videos (private)
INSERT INTO storage.buckets (id, name, public)
SELECT 'creative-videos', 'creative-videos', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'creative-videos');

-- 5) Storage RLS for creative-videos (company scoped by folder: {companyId}/...)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='creative_videos_select_company_members'
  ) THEN
    CREATE POLICY creative_videos_select_company_members
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'creative-videos'
      AND public.can_access_company_storage((storage.foldername(name))[1]::uuid)
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='creative_videos_insert_company_writers'
  ) THEN
    CREATE POLICY creative_videos_insert_company_writers
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'creative-videos'
      AND public.has_company_write_access((storage.foldername(name))[1]::uuid, auth.uid())
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='creative_videos_update_company_writers'
  ) THEN
    CREATE POLICY creative_videos_update_company_writers
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'creative-videos'
      AND public.has_company_write_access((storage.foldername(name))[1]::uuid, auth.uid())
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='creative_videos_delete_company_writers'
  ) THEN
    CREATE POLICY creative_videos_delete_company_writers
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'creative-videos'
      AND public.has_company_write_access((storage.foldername(name))[1]::uuid, auth.uid())
    );
  END IF;
END $$;