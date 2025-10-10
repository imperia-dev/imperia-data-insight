-- Drop existing trigger and function to recreate with proper error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Priority 1: Create profile (most critical for login)
  INSERT INTO public.profiles (id, email, full_name, role, approval_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'operation'::user_role,  -- Correct enum for profiles table
    'pending'::approval_status
  );
  
  -- Priority 2: Create user_role entry (CRITICAL: was missing before)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operation'::app_role);  -- Correct enum for user_roles table
  
  -- Priority 3: Create registration request
  INSERT INTO public.registration_requests (user_id, status)
  VALUES (NEW.id, 'pending'::approval_status);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Detailed error logging without blocking signup
    RAISE WARNING 'Error in handle_new_user for user % (email: %): %', 
      NEW.id, NEW.email, SQLERRM;
    -- Return NEW to allow signup to complete even if trigger fails
    RETURN NEW;
END;
$$;

-- Recreate trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 
  'Automatically creates profile, user_role, and registration_request when a new user signs up. Uses correct enums: user_role for profiles, app_role for user_roles.';