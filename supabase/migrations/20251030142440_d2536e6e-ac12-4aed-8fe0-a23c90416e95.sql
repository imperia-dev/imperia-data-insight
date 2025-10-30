-- Criar tabela para rastrear avisos visualizados por usuários
CREATE TABLE public.announcement_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, announcement_id)
);

-- Índices para performance
CREATE INDEX idx_announcement_views_user_id ON public.announcement_views(user_id);
CREATE INDEX idx_announcement_views_announcement_id ON public.announcement_views(announcement_id);

-- RLS Policies
ALTER TABLE public.announcement_views ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios registros de visualização
CREATE POLICY "Users can view own announcement views"
  ON public.announcement_views
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Usuários podem criar seus próprios registros de visualização
CREATE POLICY "Users can create own announcement views"
  ON public.announcement_views
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Owner pode ver todos os registros
CREATE POLICY "Owner can view all announcement views"
  ON public.announcement_views
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'owner'::user_role);