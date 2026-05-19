-- 1) Update handle_new_user to skip portal signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Skip portal/trial signups: they must NOT receive internal roles or profiles
  IF COALESCE(NEW.raw_user_meta_data->>'source', '') = 'trial_portal' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'operation'::user_role,
    'pending'::approval_status
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operation'::app_role);

  INSERT INTO public.registration_requests (user_id, status)
  VALUES (NEW.id, 'pending'::approval_status);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user % (email: %): %',
      NEW.id, NEW.email, SQLERRM;
    RETURN NEW;
END;
$function$;

-- 2) Cleanup existing trial portal users that were contaminated with internal access
DELETE FROM public.user_roles
WHERE user_id IN (SELECT user_id FROM public.trial_customers)
  AND role <> 'customer'::app_role;

DELETE FROM public.registration_requests
WHERE user_id IN (SELECT user_id FROM public.trial_customers);

DELETE FROM public.profiles
WHERE id IN (SELECT user_id FROM public.trial_customers);