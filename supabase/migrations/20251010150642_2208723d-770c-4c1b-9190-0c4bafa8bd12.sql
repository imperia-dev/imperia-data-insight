-- Criar políticas de RLS para o bucket company-assets

-- Permitir que qualquer usuário autenticado visualize os assets (bucket é público)
CREATE POLICY "Anyone can view company assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

-- Permitir que apenas owners façam upload
CREATE POLICY "Only owners can upload company assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-assets' 
  AND auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'owner'
  )
);

-- Permitir que apenas owners atualizem arquivos
CREATE POLICY "Only owners can update company assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-assets'
  AND auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'owner'
  )
);

-- Permitir que apenas owners deletem arquivos
CREATE POLICY "Only owners can delete company assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-assets'
  AND auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'owner'
  )
);