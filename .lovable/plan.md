## Diagnóstico

Sim — cada protocolo da listagem em `/fechamento-prestadores` (aba "Protocolos Individuais") já está vinculado à nota fiscal que o prestador anexa no fluxo de aprovação. A nota é gravada na coluna `invoice_file_url` da tabela `service_provider_protocols` (bucket `service-provider-files/invoices/...`).

A coluna "Nota Fiscal" inclusive **já existe** na tabela visível no print, com um ícone de documento. O problema é que ela está sendo lida do campo errado:

- Hoje o código lê `protocol.receipt_url` → esse campo é nulo nessa tabela (existe em outras tabelas, como `closing_protocols`, e se refere a comprovante de pagamento, não nota fiscal).
- Por isso o ícone aparece sempre cinza (sem link), em todas as linhas do print, mesmo nos protocolos que já têm nota anexada (ex.: `PREST-DIAG-202603-003-ANA`, `PREST-DIAG-202603-002-MAR` etc., que têm `invoice_file_url` preenchido no banco).

## O que será feito

Ajuste pequeno e cirúrgico em **`src/components/fechamentoPrestadores/ProtocolosIndividuaisTab.tsx`**:

1. Trocar a leitura de `protocol.receipt_url` por `protocol.invoice_file_url` na célula da coluna "Nota Fiscal".
2. Substituir o ícone de documento por um **ícone de olhinho** (`Eye` do lucide-react), conforme você pediu, mantendo o tooltip "Ver nota fiscal".
3. Quando houver nota anexada:
   - Olhinho colorido (primary), clicável, abre a nota em nova aba.
4. Quando não houver nota anexada:
   - Olhinho com cor "muted" e desabilitado (sem ação), deixando claro que ainda não foi enviada.
5. Exibir o ícone também na lista da aba **"Protocolo Consolidado"** (se aplicável) — vou verificar e, se a aba consolidada também listar protocolos individuais com nota, aplicar a mesma melhoria. Caso contrário, fica apenas na aba "Protocolos Individuais".

## Detalhes técnicos

- Arquivo principal alterado: `src/components/fechamentoPrestadores/ProtocolosIndividuaisTab.tsx` (linhas ~284-301).
- Import: adicionar `Eye` em `lucide-react`.
- Sem migrations, sem alteração de schema, sem mudança de RLS — o bucket `service-provider-files` é público e a URL já está pronta para uso.
- Não mexe no fluxo de upload da nota (que é feito pelo prestador no link público de aprovação) — apenas exibe o que já está salvo.

## Resultado esperado

Na listagem de `/fechamento-prestadores`, cada linha que já tiver nota fiscal anexada passará a mostrar um olhinho clicável que abre o PDF/imagem da nota em nova aba. Linhas sem nota mostram o olhinho apagado.
