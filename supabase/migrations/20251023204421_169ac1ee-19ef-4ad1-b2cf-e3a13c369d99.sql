
-- Add 'customer' to user_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'customer' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'customer';
  END IF;
END $$;

-- Update get_user_role function to handle customer role properly
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role::text::user_role FROM public.user_roles WHERE user_id = $1 ORDER BY 
    CASE role
      WHEN 'owner' THEN 1
      WHEN 'master' THEN 2
      WHEN 'admin' THEN 3
      WHEN 'operation' THEN 4
      WHEN 'translator' THEN 5
      WHEN 'customer' THEN 6
      WHEN 'financeiro' THEN 7
    END
  LIMIT 1
$function$;
