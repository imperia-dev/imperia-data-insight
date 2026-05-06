## Causa raiz

A tela `OperationProtocolData` (usada por revisores/operação para inserir nota fiscal de protocolos de revisor) está fazendo upload no bucket `service-provider-files` no caminho:

```
reviewer-protocols/<protocolo>_nota_fiscal_<timestamp>.ext
```

Porém a política RLS de INSERT do bucket para usuários não-privilegiados é:

```sql
spf_provider_upload_invoice:
  bucket_id = 'service-provider-files'
  AND (storage.foldername(name))[1] = 'invoices'
```

Ou seja, **somente uploads cuja primeira pasta seja `invoices/`** são permitidos. Como o código envia para `reviewer-protocols/...`, o RLS bloqueia o upload e o `uploadInvoice()` retorna `null`, disparando o toast "Falha ao fazer upload da nota fiscal" visto no print.

Os prestadores que usam o fluxo `ProviderDataFormDialog` (caminho `invoices/...`) funcionam normalmente — só quebra no fluxo de protocolos de revisor.

## Correção proposta

**Arquivo:** `src/pages/OperationProtocolData.tsx` (função `uploadInvoice`, linha 152)

Trocar o prefixo do path para que respeite a política RLS:

```ts
const filePath = `invoices/reviewer-protocols/${fileName}`;
```

Isso mantém a organização (subpasta `reviewer-protocols/`) e satisfaz a regra `(storage.foldername(name))[1] = 'invoices'`.

### Política de visualização

A política `spf_provider_view_own_invoice` faz match por `invoice_file_url ~~ '%' || objects.name || '%'`, comparando contra `service_provider_protocols.invoice_file_url`. Mas neste fluxo o URL é salvo em `reviewer_protocols.invoice_url`, e quem vê o arquivo são owner/master/admin/financeiro (cobertos por `spf_privileged_select`). Portanto não há impacto na visualização.

Nenhuma migração de banco é necessária — apenas 1 linha de código.

## Verificação

Após o ajuste, um usuário com role `operation` consegue submeter a nota fiscal para um protocolo de revisor sem erro de RLS.