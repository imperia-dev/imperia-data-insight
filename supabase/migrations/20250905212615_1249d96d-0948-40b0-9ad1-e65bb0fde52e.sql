-- Adicionar coluna para armazenar arquivos na tabela company_costs
ALTER TABLE public.company_costs 
ADD COLUMN files TEXT[] DEFAULT '{}';

-- Criar bucket para armazenar arquivos de custos da empresa
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-cost-files', 'company-cost-files', false);

-- Políticas RLS para o bucket de arquivos
-- Permitir que o owner faça upload de arquivos
CREATE POLICY "Owner can upload company cost files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'company-cost-files' 
  AND get_user_role(auth.uid()) = 'owner'::user_role
);

-- Permitir que o owner visualize arquivos
CREATE POLICY "Owner can view company cost files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'company-cost-files' 
  AND get_user_role(auth.uid()) = 'owner'::user_role
);

-- Permitir que o owner atualize arquivos
CREATE POLICY "Owner can update company cost files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'company-cost-files' 
  AND get_user_role(auth.uid()) = 'owner'::user_role
);

-- Permitir que o owner delete arquivos
CREATE POLICY "Owner can delete company cost files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'company-cost-files' 
  AND get_user_role(auth.uid()) = 'owner'::user_role
);