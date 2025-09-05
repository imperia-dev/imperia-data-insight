-- Adicionar coluna para armazenar arquivos na tabela service_provider_costs
ALTER TABLE public.service_provider_costs 
ADD COLUMN files TEXT[] DEFAULT '{}';

-- Criar bucket para armazenar arquivos de custos de prestadores
INSERT INTO storage.buckets (id, name, public) 
VALUES ('service-provider-files', 'service-provider-files', false);

-- Políticas RLS para o bucket de arquivos de prestadores
-- Permitir que o owner faça upload de arquivos
CREATE POLICY "Owner can upload service provider files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'service-provider-files' 
  AND get_user_role(auth.uid()) = 'owner'::user_role
);

-- Permitir que o owner visualize arquivos
CREATE POLICY "Owner can view service provider files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'service-provider-files' 
  AND get_user_role(auth.uid()) = 'owner'::user_role
);

-- Permitir que o owner atualize arquivos
CREATE POLICY "Owner can update service provider files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'service-provider-files' 
  AND get_user_role(auth.uid()) = 'owner'::user_role
);

-- Permitir que o owner delete arquivos
CREATE POLICY "Owner can delete service provider files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'service-provider-files' 
  AND get_user_role(auth.uid()) = 'owner'::user_role
);