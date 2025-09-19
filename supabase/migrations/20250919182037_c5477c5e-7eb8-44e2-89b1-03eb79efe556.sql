-- Create enum for approval status
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add approval fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN approval_status approval_status DEFAULT 'pending',
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN rejection_reason text;

-- Create registration requests table
CREATE TABLE public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  requested_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES public.profiles(id),
  status approval_status DEFAULT 'pending' NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on registration_requests
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for registration_requests
CREATE POLICY "Owners can view all registration requests" 
ON public.registration_requests 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Owners can update registration requests" 
ON public.registration_requests 
FOR UPDATE 
USING (get_user_role(auth.uid()) = 'owner'::user_role);

CREATE POLICY "Users can view own registration request" 
ON public.registration_requests 
FOR SELECT 
USING (user_id = auth.uid());

-- Update profiles RLS to allow pending users to view their own profile
CREATE POLICY "Pending users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id AND approval_status = 'pending'::approval_status);

-- Update the handle_new_user function to set pending status
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
  
  -- Create registration request
  INSERT INTO public.registration_requests (user_id, status)
  VALUES (NEW.id, 'pending'::approval_status);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create function to get user approval status
CREATE OR REPLACE FUNCTION public.get_user_approval_status(user_id uuid)
RETURNS approval_status
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT approval_status FROM public.profiles WHERE id = user_id;
$$;

-- Create function to approve user
CREATE OR REPLACE FUNCTION public.approve_user(p_user_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if caller is owner
  IF get_user_role(auth.uid()) != 'owner'::user_role THEN
    RAISE EXCEPTION 'Only owners can approve users';
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
$$;

-- Create function to reject user
CREATE OR REPLACE FUNCTION public.reject_user(p_user_id uuid, p_reason text, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if caller is owner
  IF get_user_role(auth.uid()) != 'owner'::user_role THEN
    RAISE EXCEPTION 'Only owners can reject users';
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
$$;