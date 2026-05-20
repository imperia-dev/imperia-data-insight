# Ocultar pedidos em rascunho no Financeiro

## Problema
A página `/portal/app/financeiro` lista e contabiliza todos os pedidos do cliente, inclusive os com status `draft` (rascunho). Como rascunhos ainda não foram efetivamente solicitados, eles inflam KPIs e aparecem no histórico indevidamente.

## Solução
Filtrar `status !== "draft"` logo após o fetch em `src/portal/pages/PortalFinance.tsx`. Com isso:

- KPIs (total de pedidos, em andamento, concluídos, documentos, páginas, caracteres, valor total/faturado/em aberto, ticket médio, preço médio/página) passam a considerar apenas pedidos efetivamente enviados.
- Tabela de Histórico não exibe mais linhas de rascunho.
- Totais do rodapé refletem o mesmo conjunto.

## Fora de escopo
- A página `/portal/app/pedidos` continua mostrando rascunhos (lá o cliente precisa vê-los para concluir ou excluir).
- Nenhuma alteração de schema, RLS ou outras telas.
