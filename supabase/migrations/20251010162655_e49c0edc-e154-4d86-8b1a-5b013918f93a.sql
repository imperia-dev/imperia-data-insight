-- Delete all data for user the.tecnology.cia@gmail.com to allow clean registration

-- First, get the user_id
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'the.tecnology.cia@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Delete from public tables (cascade will handle some, but being explicit)
    DELETE FROM public.registration_requests WHERE user_id = v_user_id;
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;
    DELETE FROM public.mfa_backup_codes WHERE user_id = v_user_id;
    DELETE FROM public.active_sessions WHERE user_id = v_user_id;
    DELETE FROM public.login_attempts WHERE identifier = 'the.tecnology.cia@gmail.com';
    DELETE FROM public.account_lockouts WHERE identifier = 'the.tecnology.cia@gmail.com';
    DELETE FROM public.mfa_audit_logs WHERE user_id = v_user_id;
    
    -- Finally, delete from auth.users (this will cascade to auth schema tables)
    DELETE FROM auth.users WHERE id = v_user_id;
    
    RAISE NOTICE 'User the.tecnology.cia@gmail.com deleted successfully';
  ELSE
    RAISE NOTICE 'User the.tecnology.cia@gmail.com not found';
  END IF;
END $$;