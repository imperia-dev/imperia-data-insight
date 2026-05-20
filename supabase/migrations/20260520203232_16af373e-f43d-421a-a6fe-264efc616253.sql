
-- 1) Prevent privilege escalation via self profile updates
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role public.user_role;
BEGIN
  caller_role := public.get_user_role(auth.uid());
  IF caller_role IN ('owner','master') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.daily_rate IS DISTINCT FROM OLD.daily_rate
     OR NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
     OR NEW.mfa_enabled IS DISTINCT FROM OLD.mfa_enabled
     OR NEW.mfa_backup_codes_generated_at IS DISTINCT FROM OLD.mfa_backup_codes_generated_at
     OR NEW.trusted_devices IS DISTINCT FROM OLD.trusted_devices
     OR NEW.failed_access_attempts IS DISTINCT FROM OLD.failed_access_attempts
  THEN
    RAISE EXCEPTION 'Privileged profile fields cannot be modified by the user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- Also add a WITH CHECK that ensures id is unchanged (defense in depth)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2) Restrict system_settings SELECT to privileged roles
DROP POLICY IF EXISTS "Authenticated users can view system settings" ON public.system_settings;
CREATE POLICY "Privileged roles can view system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (public.get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role,'master'::user_role,'owner'::user_role]));

-- 3) Lock anonymous lead session updates: session_id cannot be changed
DROP POLICY IF EXISTS "Anonymous can update own sessions" ON public.lead_sessions;
CREATE POLICY "Anonymous can update own sessions"
ON public.lead_sessions
FOR UPDATE
USING (session_id = current_setting('app.session_id'::text, true))
WITH CHECK (session_id = current_setting('app.session_id'::text, true));

-- 4) Tighten service provider invoice uploads to scope by protocol id in path
DROP POLICY IF EXISTS "spf_provider_upload_invoice" ON storage.objects;
CREATE POLICY "spf_provider_upload_invoice"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-provider-files'
  AND (storage.foldername(name))[1] = 'invoices'
  AND (
    EXISTS (
      SELECT 1 FROM public.service_provider_protocols spp
      WHERE spp.supplier_id = auth.uid()
        AND spp.id::text = (storage.foldername(name))[2]
    )
    OR EXISTS (
      SELECT 1 FROM public.reviewer_protocols rp
      WHERE rp.assigned_operation_user_id = auth.uid()
        AND rp.id::text = (storage.foldername(name))[2]
    )
  )
);
