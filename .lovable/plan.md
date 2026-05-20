# Página de detalhe do pedido + upload da tradução

Hoje, ao clicar em "Ver" em `/portal-orders`, abre um painel lateral (Sheet) com as informações. A proposta é trocar isso por uma **página dedicada** para cada pedido, com mais espaço e a possibilidade do owner anexar o **PDF da tradução** finalizada.

## O que muda para o usuário

- Em `/portal-orders`, o botão "Ver" leva para `/portal-orders/:id`.
- A nova página mostra todas as informações do pedido (cliente, dados do pedido, status editável, documentos enviados pelo cliente) em layout completo, com header e sidebar.
- Nova seção **"Tradução (PDF)"**:
  - Botão para enviar o PDF da tradução (somente arquivos `.pdf`).
  - Lista os PDFs já enviados, com botões de visualizar, abrir em nova aba, baixar e remover.
  - Visualização inline em modal (igual à dos documentos do cliente).
- Apenas owner consegue acessar a rota e fazer upload (mesma regra já aplicada a `/portal-orders`).

## Detalhes técnicos

### Banco / Storage
- Adicionar coluna `kind text NOT NULL DEFAULT 'source'` em `public.trial_order_files`, com check `kind in ('source','translation')`.
- Novas policies em `trial_order_files`:
  - `tof_insert_admin_translation`: owner/master pode inserir quando `kind = 'translation'`.
  - `tof_delete_admin_translation`: owner/master pode deletar quando `kind = 'translation'`.
- Storage `trial-uploads` (já privado): adicionar policy de INSERT para owner/master no prefixo `translations/<order_id>/...`, complementando as policies de SELECT/DELETE de admin que já existem.

### Frontend
- Nova página `src/pages/PortalOrderDetail.tsx` reaproveitando os hooks/componentes de layout (`Header`, `Sidebar`, `usePageLayout`).
- Carrega o pedido por `id` (`trial_orders` + `trial_customers`) e os arquivos (`trial_order_files`) separando por `kind`.
- Upload via `supabase.storage.from('trial-uploads').upload('translations/<orderId>/<uuid>.pdf', file)` + insert em `trial_order_files` com `kind='translation'`. Validação: apenas `application/pdf`, tamanho máx. 50MB.
- Rota nova em `src/App.tsx`:
  ```text
  /portal-orders/:id  ->  ProtectedRouteWithApproval > PortalOrderDetail
  ```
- Em `PortalOrdersAdmin.tsx`: remover o `Sheet` de detalhe e fazer o botão "Ver" navegar via `useNavigate` para `/portal-orders/:id`. Lista e filtros continuam iguais.

### Permissões
- `permissions.ts`: incluir `/portal-orders/:id` (ou prefixo `/portal-orders`) na mesma regra que já libera `/portal-orders` só para owner.
