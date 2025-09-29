-- Remover a política problemática de profiles e criar uma mais específica
DROP POLICY IF EXISTS "Users can view profiles of users in same channels" ON public.profiles;

-- Criar política que permite que usuários autenticados vejam informações básicas de outros usuários
-- Isso é necessário para o chat funcionar corretamente
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Garantir que a tabela chat_channel_members tenha as políticas corretas
DROP POLICY IF EXISTS "Users can view memberships" ON public.chat_channel_members;

-- Permitir que usuários vejam membros de canais que eles fazem parte
CREATE POLICY "Users can view channel members"
ON public.chat_channel_members
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- User can see their own membership
    user_id = auth.uid()
    OR
    -- User can see other members in channels they belong to
    EXISTS (
      SELECT 1 FROM chat_channel_members cm
      WHERE cm.channel_id = chat_channel_members.channel_id
      AND cm.user_id = auth.uid()
    )
    OR
    -- Owner can see all memberships
    get_user_role(auth.uid()) = 'owner'::user_role
  )
);

-- Garantir que usuários possam inserir presence sem problemas
DROP POLICY IF EXISTS "Users can update their own presence" ON public.chat_presence;
DROP POLICY IF EXISTS "Users can view all presence" ON public.chat_presence;

CREATE POLICY "Users can manage their own presence"
ON public.chat_presence
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view all presence"
ON public.chat_presence
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Corrigir políticas de security_events para evitar erro 400
DROP POLICY IF EXISTS "Authenticated users can insert security events" ON public.security_events;
DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;

-- Permitir que a função security definer insira eventos
CREATE POLICY "Allow security event logging"
ON public.security_events
FOR INSERT
WITH CHECK (true);

-- Manter a política de visualização apenas para owner
-- (já existe: "Only owner can view security events")