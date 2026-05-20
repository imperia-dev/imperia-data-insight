# Hardening da contagem de páginas e caracteres

Objetivo: tornar a análise de arquivos do portal trial mais confiável, cobrindo casos hoje frágeis (PDFs escaneados, DOCX, imagens com falha de OCR) e permitindo reprocessar arquivos sem redeploy.

## O que será feito

1. **DOCX com paginação real**
   - Ler `docProps/app.xml` do `.docx` (campo `Pages` gravado pelo Word) e usar esse valor quando existir.
   - Manter o cálculo atual (`ceil(chars/1800)`) apenas como fallback quando o campo não estiver presente.

2. **Fallback de OCR para PDFs escaneados**
   - Após `pdf-parse`, se `characters == 0` e `pages > 0`, tratar como PDF escaneado.
   - Renderizar/enviar o PDF (ou as primeiras páginas como imagem) ao Gemini 2.5 Flash via Lovable AI Gateway — mesmo pipeline já usado para imagens — e usar o texto extraído para contar caracteres.

3. **Imagens com OCR sem retorno**
   - Se o Gemini responder vazio ou falhar (rede/HTTP != 200), marcar o arquivo como `analysis_status = 'failed'` com `analysis_error` claro, em vez de salvar silenciosamente `characters = 0`.

4. **`chars_per_page` configurável**
   - Remover a constante mágica `1800` da função.
   - Ler de uma configuração (tabela `app_settings` ou variável de ambiente da Edge Function) com default 1800, para ajustes futuros sem redeploy.

5. **Botão "Reanalisar arquivo"**
   - Em `PortalOrderDetail.tsx` (lista de arquivos), adicionar ação de reanálise que reinvoca a função `analyze-trial-document` para o `file_id`.
   - Mostrar feedback (toast) e recarregar a lista quando concluir.
   - Disponível para o dono do pedido (a função já valida ownership).

## Detalhes técnicos

- **Edge Function** `supabase/functions/analyze-trial-document/index.ts`:
  - Adicionar leitura de `docProps/app.xml` via `npm:jszip` (rápido e leve) e parse de `<Pages>` por regex.
  - Refatorar o branch de imagens em uma função `ocrViaGemini(buf, mime)` reutilizada pelo fallback de PDF escaneado.
  - Em PDFs escaneados, enviar até N primeiras páginas (limite de segurança) ao Gemini. Opção mais simples: enviar o PDF inteiro como `application/pdf` data URL — Gemini 2.5 Flash aceita PDFs nativamente.
  - Tratar `characters = 0` em imagem/OCR como erro: `analysis_status = 'failed'`, `analysis_error = 'OCR retornou vazio'`.
  - Ler `chars_per_page` de `Deno.env.get('DOCX_CHARS_PER_PAGE')` com fallback `1800`.

- **Frontend** `src/portal/pages/PortalOrderDetail.tsx`:
  - Botão "Reanalisar" por arquivo chamando `supabase.functions.invoke('analyze-trial-document', { body: { file_id } })`.
  - Estado de loading local por arquivo; refetch da lista ao final.

- **Banco**: nenhuma migration necessária (campos `pages`, `characters`, `analysis_status`, `analysis_error` já existem em `trial_order_files`).

## Fora de escopo

- Mudar a UI do financeiro (`PortalFinance.tsx`) — os totais continuam vindo de `trial_orders.total_pages/total_characters`, que serão automaticamente recalculados após cada reanálise.
- Reprocessamento em lote de pedidos antigos (pode ser feito manualmente arquivo a arquivo via o novo botão).
