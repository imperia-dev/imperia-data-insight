# Página interna: Pedidos do Portal (Owner/Master)

Adicionar uma página no app interno para que **owner** e **master** vejam os pedidos criados pelos clientes via Portal (`trial_orders`) e abram os documentos enviados.

## Backend

Nada novo a criar. As políticas RLS já permitem acesso total para owner/master:
- `trial_orders.to_select_admin` ✅
- `trial_order_files.tof_select_admin` ✅
- `trial_customers.tc_select_admin` ✅
- Storage `trial-uploads.trial_uploads_select_admin` ✅

Visualização de documento: gerar URL assinada via `supabase.storage.from('trial-uploads').createSignedUrl(path, 300)` no clique — o bucket é privado.

## Frontend

### Nova rota
`/portal-orders` (página interna, sem relação com o layout `/portal/app`).

Adicionada em `src/App.tsx` envolta em `ProtectedRouteWithApproval`.

### Item de sidebar
Adicionar em `src/components/layout/Sidebar.tsx`, dentro do grupo **Operação**:

```ts
{ title: "Pedidos do Portal", icon: Globe, href: "/portal-orders", roles: ["owner", "master"] }
```

(filtro de roles já elimina para outras roles)

### Página `src/pages/PortalOrdersAdmin.tsx`

- **Lista** (tabela): número, cliente (nome + email), idioma, docs/páginas, status, data. Filtros por status + busca por número/cliente.
- **Botão "Ver"** abre `Sheet`/`Dialog` com detalhes:
  - Dados do cliente (nome, email, telefone, empresa, CPF/CNPJ).
  - Resumo do pedido (idioma, tipo, totais, observações, datas).
  - **Lista de arquivos** com nome, páginas, caracteres e botão **"Abrir documento"** que gera signed URL e abre em nova aba. Para imagens (mime começando com `image/`) também mostra preview inline.
- Atualização de status do pedido pelo admin: dropdown rápido para mover entre `submitted` → `processing` → `completed` / `cancelled` (UPDATE direto, sem RLS extra — owner/master têm policy de update? Vou verificar).

### Ponto a confirmar

O policy `to_update_own` permite update apenas pelo próprio cliente em status `draft`. **Não há policy de UPDATE para owner/master** em `trial_orders`. Para o admin mudar status do pedido, será preciso adicionar policy:

```sql
create policy "to_update_admin"
on public.trial_orders for update
to authenticated
using (has_role(auth.uid(),'owner') or has_role(auth.uid(),'master'))
with check (has_role(auth.uid(),'owner') or has_role(auth.uid(),'master'));
```

Se você não quiser permitir mudança de status nessa tela agora, removo essa parte e fica só visualização. **Vou incluir a mudança de status (com a migration).**

## Arquivos

Criar:
- `src/pages/PortalOrdersAdmin.tsx`

Editar:
- `src/App.tsx` — registrar a rota
- `src/components/layout/Sidebar.tsx` — adicionar item no grupo Operação

Migration:
- Policy `to_update_admin` em `trial_orders`
