# Botão "olhinho" para visualizar documento

Adicionar um botão de visualização (ícone de olho) na lista de Arquivos da página de detalhe do pedido (`/portal/app/pedido/:id`), ao lado do botão de download existente.

## Comportamento

- Ao clicar no olhinho, gera uma signed URL do arquivo no bucket `trial-uploads` (sem flag de download) e abre em nova aba.
- O botão de download atual continua funcionando como está (forçando download).
- Estado de loading próprio para o botão de visualização (spinner enquanto gera a URL).

## Alterações técnicas

Arquivo único: `src/portal/pages/PortalOrderDetail.tsx`

1. Importar ícone `Eye` de `lucide-react`.
2. Adicionar `viewingId` state e função `viewFile(f)` análoga a `downloadFile`, mas chamando `createSignedUrl(path, 60)` sem `{ download }`.
3. Na célula de ações da tabela de Arquivos, inserir um `<Button variant="ghost" size="icon">` com o ícone `Eye` antes do botão de download.
