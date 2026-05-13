
# Portal Trial de Clientes (Lead → Cliente)

Área pública e isolada do sistema de gestão atual. Compartilha apenas o layout visual (Outfit, tokens, shadcn) e a infraestrutura Supabase. Nenhum lead vê telas internas; nenhum colaborador interno é exposto a esse fluxo.

---

## 1. Rotas (públicas, fora do shell interno)

```
/portal              → Landing simples + CTA "Entrar" / "Criar conta"
/portal/cadastro     → Formulário de registro (lead trial)
/portal/login        → Login do cliente trial
/portal/aguardando   → Tela "Cadastro em análise" (após signup, antes da aprovação)
/portal/app          → Dashboard do cliente (lista de pedidos)
/portal/app/novo     → Wizard de novo pedido
/portal/app/pedido/:id → Detalhe do pedido
```

Todas usam um layout próprio (`PortalLayout`) — sem Sidebar interna, sem Header interno. Header minimalista com logo Imperia + menu do usuário.

Internamente, o owner ganha uma rota nova:

```
/trial-approvals     → Lista de cadastros pendentes (apenas role owner)
```

---

## 2. Banco de dados

### `trial_customers`
- `user_id` (uuid → auth.users)
- `full_name`, `email`, `phone`, `company` (opcional), `cpf_cnpj`
- `status`: `pending` | `approved` | `rejected` | `deactivated`
- `approved_by`, `approved_at`, `rejection_reason`

### `trial_orders`
- `customer_id` → trial_customers
- `order_number` (gerado: `TR-YYYYMM-####`)
- `language_pair`: `pt-it` | `it-pt`
- `translation_type`: `juramentada` (enum aberto p/ futuras)
- `status`: `draft` | `submitted` | `processing` | `completed` | `cancelled`
- `total_documents` (int), `total_pages` (int), `total_characters` (int)
- `notes` (texto)

### `trial_order_files`
- `order_id` → trial_orders
- `storage_path` (bucket `trial-uploads`)
- `original_filename`, `mime_type`, `size_bytes`
- `pages` (int), `characters` (int)
- `analysis_status`: `pending` | `done` | `failed`
- `analysis_error` (texto)

### Storage
Bucket privado `trial-uploads`. Path: `{user_id}/{order_id}/{uuid}.{ext}`.

### RLS (estrita — nenhum vazamento entre clientes)
- `trial_customers`: cliente vê só sua linha; owner vê tudo; INSERT permitido a usuário autenticado para a própria linha; UPDATE de `status` apenas via RPC `approve_trial_customer(uuid)` / `reject_trial_customer(uuid, text)` — security definer, valida `has_role(auth.uid(),'owner')`.
- `trial_orders` / `trial_order_files`: SELECT/INSERT/UPDATE só se `customer_id` pertence ao `auth.uid()` E `trial_customers.status = 'approved'`. Owner pode SELECT tudo.
- Storage `trial-uploads`: primeira pasta = `auth.uid()::text` (mesmo padrão já usado em `pendency-attachments`).

### Bloqueio de acesso ao sistema interno
Trial customers NÃO recebem entrada em `user_roles`. O guard atual (`useRoleAccess` / `ProtectedRoute`) já bloqueia quem não tem role. Adiciono um guard novo `TrialPortalGuard` que faz o oposto: só permite quem tem `trial_customers` (e bloqueia roles internas, evitando que owner navegue acidentalmente como cliente).

---

## 3. Cadastro & aprovação

1. `/portal/cadastro` → `supabase.auth.signUp` + insert em `trial_customers` (status `pending`). Email de confirmação desabilitado para esse fluxo? **Pergunta aberta** — proponho manter confirmação por email para evitar spam.
2. Após login com status `pending` → redireciona para `/portal/aguardando`.
3. Owner abre `/trial-approvals`, vê lista, aprova/rejeita. Aprovar dispara email (Resend, mesmo domínio `ops.imperiatraducoes.com.br`) avisando o lead.
4. Status `approved` → cliente acessa `/portal/app`.

---

## 4. Wizard de novo pedido

Passos:

1. **Par de idioma**: PT → IT  /  IT → PT
2. **Tipo de tradução**: Juramentada (único por enquanto, mas em radio para extensão futura)
3. **Upload de arquivos**: drag-and-drop, múltiplos. Formatos aceitos: PDF, DOCX, DOC, XLSX, XLS, PNG, JPG, JPEG, WEBP. Limite 20MB/arquivo, 20 arquivos/pedido.
4. **Análise automática** (ver §5): mostra spinner por arquivo; ao concluir, exibe páginas + caracteres por arquivo e totais agregados. Cliente pode editar páginas manualmente caso discorde.
5. **Observações** (textarea opcional)
6. **Revisar e enviar** → status passa para `submitted` e dispara webhook n8n (mesmo padrão `N8N_WEBHOOK_URL`) avisando a operação.

---

## 5. Contagem automática (páginas / documentos / caracteres)

Edge Function `analyze-trial-document` chamada por arquivo logo após upload. Roda 100% server-side (cliente nunca processa). Parsing por tipo:

| Formato | Páginas | Caracteres |
|---|---|---|
| PDF | `pdf-parse` (npm via esm.sh) → `numpages` | `pdf-parse` text length |
| DOCX | `mammoth` extractRawText → estimar páginas (`ceil(chars/1800)`) | comprimento do texto |
| DOC (legado) | converter via `mammoth` falha; fallback: marcar `analysis_status=failed` e pedir re-upload em DOCX/PDF |
| XLSX/XLS | `xlsx` (SheetJS) → 1 página por planilha; chars = soma das células |
| PNG/JPG/WEBP | 1 página; caracteres via **OpenAI Vision (gpt-4o-mini)** com prompt "transcreva todo o texto visível"; usa `LOVABLE_API_KEY` no AI Gateway (já habilitado) |

Resultado salvo em `trial_order_files`. Totais do pedido calculados em trigger `BEFORE INSERT/UPDATE` ou via RPC ao submeter.

Sem necessidade de serviço externo de OCR pago — Vision via AI Gateway cobre imagens.

---

## 6. Dashboard do cliente (`/portal/app`)

- Card de boas-vindas com nome
- Botão grande "Novo pedido"
- Tabela: nº do pedido, idioma, tipo, docs/páginas, status, data, ação (ver detalhe)
- Detalhe: lista de arquivos com páginas/caracteres, status, observações

---

## 7. Tela do owner `/trial-approvals`

- Tabela de pendentes com nome, email, telefone, empresa, data
- Ações: Aprovar / Rejeitar (com motivo)
- Aba "Aprovados" para acompanhamento + botão Desativar
- Item no Sidebar interno apenas para role `owner` / `master`

---

## 8. Segurança (checklist 7 pontos do projeto)

1. RLS em todas as tabelas novas, isolamento por `user_id` e `status='approved'`.
2. Inputs validados via `validations/sanitized.ts` (Zod + DOMPurify) — nome, telefone, CPF/CNPJ, observações.
3. Edge Functions com `verify_jwt=true` (`analyze-trial-document`, `submit-trial-order`).
4. Bucket privado, paths com `auth.uid()`.
5. Aprovação via RPC security definer com `has_role(...,'owner')`.
6. Webhook n8n com `x-webhook-secret`.
7. Sem armazenar nada sensível em texto puro além do necessário.

---

## 9. Detalhes técnicos

- **Frontend**: novos arquivos em `src/portal/` (pages, layout, hooks isolados) + rotas registradas em `App.tsx` antes do `ProtectedRoute` interno.
- **Auth**: mesmo Supabase auth; diferenciação por presença de linha em `trial_customers` vs `user_roles`.
- **Email de aprovação**: Edge Function `send-trial-approval-email` usando Resend já configurado.
- **Email de boas-vindas/confirmação**: usa fluxo padrão Supabase.
- **Edge Functions novas**:
  - `analyze-trial-document` (POST: file_id) — baixa do storage, faz parsing, atualiza linha.
  - `submit-trial-order` (POST: order_id) — valida totais, muda status para `submitted`, chama webhook n8n.
- **Bibliotecas Deno**: `npm:pdf-parse`, `npm:mammoth`, `npm:xlsx`. Vision via `https://ai.gateway.lovable.dev/v1/chat/completions` com `LOVABLE_API_KEY`.

---

## 10. Itens fora deste plano (confirmar depois)

- Pagamento (explicitamente fora — é trial)
- Conversão automática de lead aprovado em cliente "real" do sistema interno
- Notificações por WhatsApp ao cliente (pode entrar numa fase 2 usando uazapiGO já integrado)
- i18n: portal nasce em PT-BR

---

Se aprovar, implemento na ordem: migração + RLS → layout/rotas do portal → cadastro/login/aguardando → tela de aprovação do owner → wizard de pedido + edge function de análise → submissão + webhook.
