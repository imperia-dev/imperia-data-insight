-- Update approve_user and reject_user functions to allow master role
-- Masters should be able to approve and reject user registration requests

-- Drop and recreate approve_user function with master support
CREATE OR REPLACE FUNCTION public.approve_user(p_user_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if caller is owner or master
  IF get_user_role(auth.uid()) NOT IN ('owner', 'master') THEN
    RAISE EXCEPTION 'Only owners and masters can approve users';
  END IF;
  
  -- Update profile
  UPDATE public.profiles
  SET 
    approval_status = 'approved'::approval_status,
    approved_at = now(),
    approved_by = auth.uid()
  WHERE id = p_user_id;
  
  -- Update registration request
  UPDATE public.registration_requests
  SET 
    status = 'approved'::approval_status,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    notes = p_notes
  WHERE user_id = p_user_id AND status = 'pending'::approval_status;
END;
$function$;

-- Drop and recreate reject_user function with master support
CREATE OR REPLACE FUNCTION public.reject_user(p_user_id uuid, p_reason text, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if caller is owner or master
  IF get_user_role(auth.uid()) NOT IN ('owner', 'master') THEN
    RAISE EXCEPTION 'Only owners and masters can reject users';
  END IF;
  
  -- Update profile
  UPDATE public.profiles
  SET 
    approval_status = 'rejected'::approval_status,
    rejection_reason = p_reason
  WHERE id = p_user_id;
  
  -- Update registration request
  UPDATE public.registration_requests
  SET 
    status = 'rejected'::approval_status,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    notes = p_notes
  WHERE user_id = p_user_id AND status = 'pending'::approval_status;
END;
$function$;