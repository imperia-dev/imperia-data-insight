-- Criar bucket para imagens de avisos
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-images', 'announcement-images', true);

-- RLS para permitir upload apenas para owner
CREATE POLICY "Owners can upload announcement images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'announcement-images' AND
  get_user_role(auth.uid()) = 'owner'::user_role
);

-- RLS para leitura pública
CREATE POLICY "Anyone can view announcement images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'announcement-images');

-- RLS para deletar imagens (owner)
CREATE POLICY "Owners can delete announcement images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcement-images' AND
  get_user_role(auth.uid()) = 'owner'::user_role
);

-- RLS para atualizar imagens (owner)
CREATE POLICY "Owners can update announcement images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'announcement-images' AND
  get_user_role(auth.uid()) = 'owner'::user_role
);

-- Criar tabela de sugestões
CREATE TABLE public.suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('improvement', 'bug', 'tip')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'implemented', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_suggestions_user_id ON public.suggestions(user_id);
CREATE INDEX idx_suggestions_status ON public.suggestions(status);

-- RLS Policies
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

-- Usuários autorizados podem criar sugestões
CREATE POLICY "Authorized users can create suggestions"
  ON public.suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    get_user_role(auth.uid()) IN ('owner'::user_role, 'master'::user_role, 'operation'::user_role, 'translator'::user_role)
  );

-- Usuários podem ver suas próprias sugestões
CREATE POLICY "Users can view own suggestions"
  ON public.suggestions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owner pode ver todas as sugestões
CREATE POLICY "Owner can view all suggestions"
  ON public.suggestions
  FOR SELECT
  TO authenticated
  USING (get_user_role(auth.uid()) = 'owner'::user_role);

-- Owner pode atualizar sugestões
CREATE POLICY "Owner can update suggestions"
  ON public.suggestions
  FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'owner'::user_role)
  WITH CHECK (get_user_role(auth.uid()) = 'owner'::user_role);

-- Trigger para updated_at
CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();