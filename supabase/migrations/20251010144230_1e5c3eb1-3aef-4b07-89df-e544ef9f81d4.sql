-- Update handle_new_user trigger to create user_role as well
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile with pending status
  INSERT INTO public.profiles (id, email, full_name, role, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'operation'::user_role,
    'pending'::approval_status
  );
  
  -- Create user_role entry (CRITICAL: was missing before)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operation'::app_role);
  
  -- Create registration request
  INSERT INTO public.registration_requests (user_id, status)
  VALUES (NEW.id, 'pending'::approval_status);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block signup
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;