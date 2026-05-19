# Novo pedido em abas (wizard livre)

Refatorar `src/portal/pages/PortalNewOrder.tsx` para apresentar o fluxo em abas clicáveis no topo, com as etapas que você definiu. Mantém toda a lógica atual (criação de rascunho, upload, análise, envio) sem mudanças funcionais — só reorganiza a apresentação.

## Abas

1. **Par de idioma** — PT → IT / IT → PT (igual hoje).
2. **Tipo de tradução** — Juramentada (igual hoje).
3. **Arquivos** — upload com dropzone (igual hoje).
4. **Dados sobre os arquivos** — tabela read-only com nome, páginas, caracteres e total geral (extraído do que já analisamos).
5. **Preço** — placeholder "Em breve — cálculo automático de preço".
6. **Pagamento** — placeholder "Em breve — opções de pagamento".
7. **Revisão e envio** — resumo de tudo + campo Observações + botão "Enviar pedido".

## Navegação

- Abas livres clicáveis (usuário pode pular entre etapas a qualquer momento).
- Indicador visual de progresso (número + check verde nas abas já preenchidas).
- Botões "Voltar" / "Próximo" no rodapé de cada aba como atalho.
- O botão "Enviar pedido" só aparece na aba final e respeita as validações atuais (pelo menos 1 arquivo, nenhum em análise).

## Detalhes técnicos

- Usar `Tabs` do shadcn (`@/components/ui/tabs`) com `value` controlado por estado local.
- Toda a lógica existente (`useEffect` de criação, `handleFiles`, polling, `submit`) permanece idêntica — apenas redistribuída entre `TabsContent`.
- Nova aba "Dados sobre os arquivos": renderiza tabela com colunas `Arquivo | Páginas | Caracteres | Status`, mais linha de totais.
- Abas "Preço" e "Pagamento": componente `EmptyState` simples com ícone e texto "Em breve".
- Sem mudanças em rotas, edge functions, banco ou políticas RLS.

## Fora de escopo

- Não implementar cálculo de preço nem integração de pagamento agora (apenas placeholders).
- Não alterar o fluxo de submissão nem o backend.
