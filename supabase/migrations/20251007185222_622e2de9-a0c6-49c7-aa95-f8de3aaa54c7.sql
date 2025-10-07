-- ========================================
-- FIX #1: Dados Pessoais de Funcionários Expostos
-- ========================================

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view basic profile info" ON public.profiles;

-- Create restrictive policy: users can only view their own profile, owners can view all
CREATE POLICY "Users can view own profile, owners can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid() OR 
  get_user_role(auth.uid()) = 'owner'::user_role
);

-- ========================================
-- FIX #2: Dados Bancários de Fornecedores
-- ========================================

-- The suppliers table already has owner-only policies, so we skip this

-- ========================================
-- FIX #3: Recursão Infinita no Chat
-- ========================================

-- Create security definer function to check channel membership without recursion
CREATE OR REPLACE FUNCTION public.is_channel_member(p_user_id uuid, p_channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_channel_members
    WHERE user_id = p_user_id
      AND channel_id = p_channel_id
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view channel members" ON public.chat_channel_members;

-- Create non-recursive policy using the security definer function
CREATE POLICY "Users can view channel members"
ON public.chat_channel_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  public.is_channel_member(auth.uid(), channel_id) OR
  get_user_role(auth.uid()) = 'owner'::user_role
);