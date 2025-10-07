-- Adicionar políticas RLS para o bucket service-provider-files
-- Permitir que usuários operation façam upload de notas fiscais

-- Política para permitir upload de arquivos
CREATE POLICY "Operation users can upload invoice files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-provider-files' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'reviewer-protocols'
);

-- Política para permitir visualização de arquivos
CREATE POLICY "Operation users can view invoice files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'service-provider-files' 
  AND auth.uid() IS NOT NULL
);

-- Política para permitir atualização de arquivos
CREATE POLICY "Operation users can update invoice files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'service-provider-files' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'reviewer-protocols'
);

-- Política para permitir exclusão de arquivos
CREATE POLICY "Operation users can delete invoice files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-provider-files' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'reviewer-protocols'
);