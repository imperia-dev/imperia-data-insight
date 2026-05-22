# Limites do período de Trial

Durante a fase trial, cada cliente do portal pode enviar no máximo:

- **10 documentos no total** (somando todos os pedidos enviados)
- **3 páginas por documento** (limite individual)

Quando o cliente atingir o limite (10 documentos), o sistema **bloqueia a criação de novos pedidos**. Os pedidos já em andamento continuam normalmente até a entrega.

## O que muda

### 1. Regras de negócio (banco)

- Novos campos na tabela `trial_customers`:
  - `trial_doc_limit` (default 10) — total de documentos permitidos
  - `trial_pages_per_doc_limit` (default 3) — páginas máximas por documento
- Função SQL `get_trial_usage(p_customer_id uuid)` retornando `{ docs_used, docs_limit, pages_per_doc_limit, remaining, blocked }`.
  - Conta apenas pedidos com status **diferente de `draft` e `cancelled`** (ou seja, tudo que foi efetivamente enviado).
- Edge function `submit-trial-order` passa a validar antes de submeter:
  - Recusa se algum arquivo do pedido tem `pages > 3`.
  - Recusa se `(docs_usados_já_enviados + docs_deste_pedido) > 10`.
- Trigger de upload em `trial_order_files` (ou validação no `analyze-trial-document`) marca o arquivo como `over_limit` quando `pages > 3`, para feedback claro no fluxo.

### 2. Contador visível para o cliente

**Header do portal** (`PortalAppLayout`): chip permanente à direita mostrando `X / 10 documentos`, com cor:
- verde quando `< 80%`,
- âmbar entre 80% e 99%,
- vermelho/destructive quando 100% (com texto "Limite atingido").

Ao clicar, abre um popover com:
- Quantos documentos usados / restantes
- Regra: "até 3 páginas por documento"
- Link para "Falar com a equipe" (mailto) caso queira aumentar o limite

**Dashboard** (`/portal/app`): card destacado no topo com barra de progresso, mesmas informações e CTA "Novo pedido" desabilitado quando bloqueado.

### 3. Bloqueio na criação de pedido (`/portal/app/novo`)

- Ao montar a página, busca `get_trial_usage`. Se `blocked = true`, mostra tela bloqueante com explicação + botão "Voltar para pedidos". Não cria rascunho.
- Durante o upload de arquivos:
  - Se um arquivo analisado vier com `pages > 3`, marca visualmente como "Acima do limite (3 pág.)" e impede avançar para o próximo passo até remover.
  - Se a soma `documentos do rascunho + documentos já enviados` ultrapassar 10, bloqueia novos uploads com toast.
- No passo final ("Revisão e envio"), revalida usage server-side via edge function.

### 4. Painel do owner

- Em `/portal-orders` (admin): nova coluna "Uso trial" mostrando `X/10` por cliente.
- Em `Settings` (owner): possibilidade de editar `trial_doc_limit` e `trial_pages_per_doc_limit` por cliente, caso queira liberar mais para um cliente específico.

## Detalhes técnicos

- Hook React `useTrialUsage()` que faz `supabase.rpc("get_trial_usage", { p_customer_id })` com cache via TanStack Query (`staleTime: 30s`) e revalidação em foco, para o chip atualizar sem reload.
- Componente `TrialUsageChip` no header + `TrialUsageCard` no dashboard, ambos consumindo o mesmo hook.
- A edge function devolve `{ error: "trial_limit_exceeded", details }` com 422, e o frontend mostra mensagem amigável.
- RLS: a função SQL é `security definer` e só retorna dados do próprio `customer_id` (validação `auth.uid()` interna).

## Fora do escopo

- Cobrança/upgrade automático para sair do trial.
- Histórico de alterações de limite por cliente.
- Limite por período (mensal/semanal) — é um limite total acumulado por enquanto.

## Perguntas rápidas (responda antes de aprovar se quiser ajustar)

1. **Rascunhos contam?** Plano atual: **não** — só conta o que foi efetivamente enviado.
2. **Pedido cancelado libera o slot?** Plano atual: **sim** — `cancelled` não conta no uso.
3. **Páginas por doc > 3:** Plano atual: **bloqueia o envio** do pedido (não trunca). Confirma?
