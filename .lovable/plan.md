# Adequar a view do owner ao novo fluxo de etapas

A página de detalhe do pedido no admin (`src/pages/PortalOrderDetail.tsx`) ainda exibe o cartão "Pedido" no formato antigo (status como dropdown solto, sem timeline visual). Vamos reformatar essa view para refletir o novo fluxo de 6 etapas, espelhando o visual que o cliente vê no portal — mas com os controles operacionais do owner integrados.

## O que muda na tela

No cartão "Pedido" (lado direito do topo), substituir o bloco atual de status por uma seção "Fluxo do pedido" com:

1. **Timeline horizontal** com as 6 etapas públicas (Pedido realizado → Pedido aceito → Em processamento → Finalizado → Entregue → Recebido), destacando a etapa atual e marcando como concluídas as anteriores. Mesma linguagem visual usada pelo cliente.
2. **Painel de ação contextual** logo abaixo da timeline, mostrando só o botão da próxima ação possível:
   - `submitted` → "Aceitar pedido"
   - `accepted` → "Iniciar processamento"
   - `processing` → "Avançar etapa" (vira "Finalizar" no passo 6) + "Marcar como entregue" (atalho)
   - `completed` → "Marcar como entregue"
   - `delivered` → mostra aviso "Aguardando confirmação do cliente"
   - `received` → mostra confirmação com data
3. **Sub-etapas internas** (visível só em `processing`, e só para owner/master): lista vertical numerada das 6 sub-etapas (Diagramação, Tradução automática, Revisão tradução, Claude CQ, Assinatura, Last review) com indicador de concluída / atual / pendente. Cada item é clicável para corrigir manualmente o passo. Inclui aviso "Não visível ao cliente".
4. **Histórico de datas-chave** compacto: Enviado em, Aceito em, Finalizado em, Entregue em, Recebido em (omitindo as que ainda não aconteceram).
5. **Removido**: o dropdown solto "Status" e o bloco "Status atual + badge + Loader". O `<details>` "Alterar status manualmente" continua existindo como fallback escondido, mas restrito a owner/master.

## Restrições e permissões

- Sub-etapas internas e nomes (Diagramação etc.) só renderizam se `userRole` for `owner` ou `master`. Nunca aparecem no portal do cliente.
- Botões de ação só ficam habilitados para `owner` e `master`. Outros papéis veem timeline + datas em modo leitura.
- Todas as transições continuam via RPCs já existentes (`accept_trial_order`, `start_trial_order_processing`, `advance_trial_order_processing`, `set_trial_order_processing_step`, `mark_trial_order_delivered`). Nenhuma mudança de banco.

## Detalhes técnicos

- Extrair o componente da timeline em `src/portal/lib/orderStatus.tsx` (ou um novo `src/portal/components/OrderTimeline.tsx`) e reusar tanto no portal do cliente quanto no admin, para garantir consistência visual.
- O componente recebe `status`, `processing_step` e um modo (`"compact" | "full"`).
- Painel de sub-etapas vira um componente separado `OwnerProcessingStepsPanel` que encapsula a grade de botões e a chamada de `set_trial_order_processing_step`.
- Adicionar tipagem das datas (`accepted_at`, `completed_at`, `delivered_at`, `received_at`) no tipo `OrderRow` local do admin (já existem na tabela após a migração anterior).
- Manter o `<details>` de fallback para alterar status manualmente, mas só renderizar quando `userRole === "owner"`.

## Fora de escopo

- Notificações automáticas em cada transição.
- Histórico textual por mudança de status (tabela de auditoria separada).
- Alterações na timeline do cliente — ela já está no formato novo.
