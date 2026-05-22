# Referência personalizada do cliente nos pedidos

Hoje o pedido é identificado apenas pelo código gerado pelo sistema (ex: `TR-202605-0004`). O cliente quer poder adicionar uma referência própria — um nome, número de processo interno, nome do destinatário, etc. — para reconhecer o pedido mais facilmente.

## O que muda

1. **Novo campo livre "Referência" no pedido** (opcional, até 120 caracteres).
   - Cliente pode preencher na criação do pedido (`/portal/app/novo-pedido`).
   - Cliente pode editar a qualquer momento na tela de detalhe do pedido (`/portal/app/pedidos/:id`), clicando num ícone de lápis ao lado do título.
   - Campo permanece editável independentemente do status (não é parte do fluxo operacional).

2. **Exibição em duas camadas**:
   - **Título principal**: a referência do cliente quando preenchida, senão o código `TR-...`.
   - **Subtítulo / chip**: sempre mostra o código `TR-...` como identificador oficial (para suporte e rastreio).

3. **Locais que passam a mostrar a referência**:
   - Lista de pedidos `/portal/app/pedidos` — coluna "Pedido" passa a mostrar a referência (quando houver) com o código `TR-...` abaixo em texto menor.
   - Busca no topo da lista — passa a procurar tanto no código quanto na referência.
   - Tela de detalhe do pedido — referência como título, código `TR-...` como subtítulo copiável.
   - Dashboard do cliente (tooltips de "Pedidos por etapa") — referência + código.
   - Painel do owner (`/portal-orders` e detalhe) — exibe a referência do cliente ao lado do código, para que a equipe saiba como o cliente chama aquele pedido.

## Detalhes técnicos

- Migration: adicionar coluna `customer_reference text` (nullable, check length ≤ 120) na tabela `trial_orders`.
- RLS: nenhuma mudança — política existente já cobre updates do dono do pedido.
- Sanitização: aplicar o mesmo pipeline Zod+DOMPurify usado em `validations/sanitized.ts` antes de gravar.
- Tipos Supabase: regenerados automaticamente após a migration.
- Componente novo: pequeno `EditableReference` (input inline com salvar/cancelar) reutilizado no detalhe do cliente e no detalhe do owner.

## Fora do escopo

- Múltiplas referências/tags por pedido.
- Busca global da referência fora do módulo de pedidos.
- Histórico de alterações do campo.
