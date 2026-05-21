# Novo fluxo de status do pedido (Portal)

Substituir a timeline atual (Rascunho → Enviado → Em processamento → Concluído) por um fluxo mais rico e fiel à operação real.

## Etapas visíveis ao cliente

1. **Pedido realizado** — cliente enviou o pedido.
2. **Pedido aceito** — owner aceitou e iniciou o trabalho.
3. **Em processamento** — exibido como `2/6`, `3/6`, etc., **sem revelar o nome de cada sub-etapa**.
4. **Finalizado** — produção concluída internamente, pronto para entrega.
5. **Entregue** — owner disponibilizou os arquivos finais ao cliente.
6. **Recebido** — cliente confirmou recebimento (botão "Confirmar recebimento" no portal).

Rascunho continua existindo, mas é interno: aparece só para o cliente que ainda não enviou o pedido, e não conta como etapa na timeline pública.

## Sub-etapas internas de "Em processamento" (somente owner vê)

Ordem fixa, 6 passos:

1. Diagramação
2. Tradução automática
3. Revisão tradução
4. Claude CQ
5. Assinatura
6. Last review

Owner avança um passo por vez no painel admin. O cliente vê apenas "Em processamento — etapa X de 6" e uma barra de progresso, nunca o rótulo.

## Mudanças no banco

- Estender o enum `trial_order_status` com: `accepted`, `delivered`, `received` (mantém `draft`, `submitted`, `processing`, `completed`, `cancelled`; `completed` passa a significar "Finalizado" internamente).
- Em `trial_orders` adicionar:
  - `processing_step smallint` (1..6, nullable)
  - `accepted_at`, `completed_at`, `delivered_at`, `received_at` timestamptz nullable
- RPCs `SECURITY DEFINER` (owner only, via `has_role(auth.uid(),'owner')`):
  - `accept_trial_order(order_id)` → status = `accepted`, `accepted_at = now()`
  - `start_trial_order_processing(order_id)` → status = `processing`, `processing_step = 1`
  - `advance_trial_order_processing(order_id)` → incrementa `processing_step`; se passar de 6, vira `completed`
  - `set_trial_order_processing_step(order_id, step)` → para correções manuais
  - `mark_trial_order_delivered(order_id)` → status = `delivered`, `delivered_at = now()`
- RPC para o cliente (dono do pedido):
  - `confirm_trial_order_received(order_id)` → status = `received`, `received_at = now()` (valida via `trial_customers.id = trial_orders.customer_id` ligado ao `auth.uid()`)

Políticas RLS existentes em `trial_orders` continuam; clientes não conseguem alterar `processing_step` direto, apenas via RPCs.

## Mudanças de UI

### Cliente — `src/portal/pages/PortalOrderDetail.tsx`
- Nova `TIMELINE` com os 6 estágios acima (Rascunho fica de fora quando o pedido já foi enviado).
- Quando `status = 'processing'`, mostrar dentro do cartão da etapa um sublabel "Etapa {processing_step}/6" + barra de progresso fina (`processing_step / 6`). Sem nomes internos.
- Quando `status = 'delivered'`, exibir botão "Confirmar recebimento" abaixo da timeline. Ao clicar, chama `confirm_trial_order_received` e dá toast de sucesso.
- Atualizar `statusLabels`/`statusVariant` para os novos status.
- A lista de pedidos (`PortalOrders.tsx`) recebe os novos labels para os badges (sem mudança de layout).

### Admin / Owner — `src/pages/PortalOrdersAdmin.tsx` (ou detalhe equivalente)
- Adicionar painel "Fluxo do pedido" mostrando o estágio atual e botões contextuais:
  - "Aceitar pedido" (em `submitted`)
  - "Iniciar processamento" (em `accepted`)
  - "Avançar etapa" + dropdown com os 6 nomes internos (em `processing`), indicando o passo atual com destaque
  - "Marcar como entregue" (em `completed`)
- Lista compacta dos 6 sub-passos com check/atual/pendente, visível só para owner.

## Detalhes técnicos

- Tipos TS: regenerados automaticamente após a migração; ajustar `Order` no `PortalOrderDetail.tsx` para incluir `processing_step` e os novos timestamps.
- Mapas de cor/label centralizados em um helper `src/portal/lib/orderStatus.ts` para reuso entre portal e admin.
- Toda mudança de status passa por RPC; nada de `update` direto no front.
- Mensagens em PT-BR; sem expor nomes de sub-etapas em respostas RPC ou colunas lidas pelo cliente.

## Fora de escopo

- Notificações por e-mail/WhatsApp em cada transição (pode ser feito depois).
- Histórico textual completo por etapa (pode ser próximo passo com tabela `trial_order_status_history`).
