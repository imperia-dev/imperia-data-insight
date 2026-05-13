# Sidebar do Portal do Cliente

Adicionar um sidebar fixo no Portal do Cliente (a partir de `/portal/app`) com navegação para as áreas pedidas. Páginas novas serão criadas como placeholders funcionais quando ainda não existirem.

## Layout

Criar `src/portal/PortalAppLayout.tsx` — novo layout exclusivo das rotas autenticadas `/portal/app/*`, separado do `PortalLayout` atual (que segue sendo usado nas páginas públicas: landing, login, cadastro, aguardando).

Estrutura:
- Sidebar fixo à esquerda (colapsável, baseado nos componentes shadcn `Sidebar` já usados no app interno).
- No topo do sidebar: logo Impéria + label "Portal do Cliente".
- No rodapé do sidebar: nome do cliente + botão "Sair".
- Área principal renderiza o conteúdo da rota.
- Mobile: sidebar vira off-canvas com botão de abrir no header.

Envolve todas as rotas em `TrialPortalGuard` (já existente) para manter o controle de acesso.

## Itens do sidebar

| Label | Rota | Origem |
|---|---|---|
| Dashboard | `/portal/app` | Já existe (`PortalDashboard`) — vira página resumo |
| Pedidos | `/portal/app/pedidos` | **Novo** — lista completa dos pedidos |
| Novo pedido | `/portal/app/novo` | Já existe (`PortalNewOrder`) |
| Acompanhamento | `/portal/app/acompanhamento` | **Novo** — timeline/status detalhado |
| Financeiro | `/portal/app/financeiro` | **Novo** — resumo de gastos |
| Clientes | `/portal/app/clientes` | **Novo** — cadastro manual de clientes do usuário |
| Configurações | `/portal/app/configuracoes` | **Novo** — dados da conta |

Detalhe da rota existente `/portal/app/pedido/:id` (`PortalOrderDetail`) — segue funcionando dentro do novo layout, sem item próprio no sidebar.

## Páginas novas (escopo de cada uma)

1. **Pedidos** (`PortalOrders.tsx`) — Tabela completa de pedidos do cliente (mesmo `trial_orders`) com filtros por status e busca, link para o detalhe. Reaproveita o que hoje está embutido no Dashboard.

2. **Acompanhamento** (`PortalTracking.tsx`) — Lista de pedidos em andamento (status ≠ `completed`/`cancelled`) com timeline visual por pedido (etapas: Enviado → Em processamento → Concluído), datas, prazo estimado, responsável quando houver.

3. **Financeiro** (`PortalFinance.tsx`) — Cards de resumo: total gasto no período, nº de pedidos pagos, ticket médio, gráfico mensal simples. Lista dos pedidos pagos com valor. Filtro por período.

4. **Clientes** (`PortalClients.tsx`) — CRUD simples (criar/editar/remover) de clientes que o usuário cadastra manualmente. Estes registros **não geram acesso** ao portal — são apenas dados (nome, documento, e-mail, telefone, observação) atrelados ao `customer_id` do usuário trial logado.

5. **Configurações** (`PortalSettings.tsx`) — Edição dos dados da própria conta (nome, telefone, empresa) e troca de senha.

6. **Dashboard** — refator: deixa de mostrar a tabela completa e passa a mostrar cards-resumo (pedidos abertos, em andamento, concluídos, último pedido) + atalhos rápidos.

## Backend

Para a página **Clientes** será necessária uma nova tabela:

```sql
create table public.trial_customer_contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.trial_customers(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  document text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

RLS: apenas o dono (`customer_id` = trial customer logado) pode ler/escrever. Política via função security definer já existente que mapeia `auth.uid()` → `trial_customers.id`.

As demais páginas usam tabelas/edge functions existentes (`trial_orders`).

## Detalhes técnicos

- Componentes shadcn: `Sidebar`, `SidebarProvider`, `SidebarTrigger`, `SidebarMenu`, etc. (já no projeto).
- Navegação ativa via `NavLink` com `isActive`.
- Sidebar colapsável (`collapsible="icon"`) — mantém ícones visíveis no estado fechado.
- Roteamento: atualizar `src/App.tsx` adicionando as 5 rotas novas e envolvendo todas as `/portal/app/*` no `PortalAppLayout`.
- Cor/tema: usa os tokens semânticos de `index.css` (sem cores hard-coded).
- Sanitização: formulários novos (Clientes, Configurações) usam `useSecureForm` conforme regra do projeto.
- Footer "© 2024 Impéria Traduções" do `PortalLayout` é removido do `PortalAppLayout` (sidebar fixa não precisa).

## Arquivos a criar/editar

Criar:
- `src/portal/PortalAppLayout.tsx`
- `src/portal/components/PortalSidebar.tsx`
- `src/portal/pages/PortalOrders.tsx`
- `src/portal/pages/PortalTracking.tsx`
- `src/portal/pages/PortalFinance.tsx`
- `src/portal/pages/PortalClients.tsx`
- `src/portal/pages/PortalSettings.tsx`
- Migration SQL: tabela `trial_customer_contacts` + RLS

Editar:
- `src/App.tsx` — novas rotas dentro do layout
- `src/portal/pages/PortalDashboard.tsx` — remover `PortalLayout`, virar conteúdo puro com cards-resumo
- `src/portal/pages/PortalNewOrder.tsx` e `PortalOrderDetail.tsx` — remover `PortalLayout`, deixar conteúdo puro (o layout vem do shell)
