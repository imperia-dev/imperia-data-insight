

# Migração Z-API / Twilio → uazapiGO V2

## Pré-requisito: Adicionar Secrets no Supabase

Acesse o [painel de secrets](https://supabase.com/dashboard/project/agttqqaampznczkyfvkf/settings/functions) e adicione:
- **`UAZAPI_BASE_URL`** → `https://imperia.uazapi.com`
- **`UAZAPI_TOKEN`** → o Admin Token da sua tela (copie clicando no ícone)

## Arquivos a Modificar

### 1. `supabase/functions/send-zapi-message/index.ts`
- Trocar env vars de `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN` → `UAZAPI_BASE_URL`, `UAZAPI_TOKEN`
- Trocar chamada `https://api.z-api.io/instances/{id}/token/{token}/send-text` → `{UAZAPI_BASE_URL}/message/send-text`
- Trocar header `Client-Token` → `token`
- Trocar body `{ phone, message }` → `{ number, text }`
- Nome da função mantido igual (sem quebrar frontend)

### 2. `supabase/functions/execute-scheduled-messages/index.ts`
- Atualizar a função `sendZApiMessage()` (renomear para `sendUazapiMessage()`) no final do arquivo
- Mesmas mudanças: env vars, endpoint, headers e body

### 3. `supabase/functions/send-whatsapp-report/index.ts`
- Remover toda lógica do Twilio (template-based)
- Trocar por uazapiGO com mensagem de texto puro
- Criar função `buildReportMessage()` que formata os 3 tipos de relatório (operacional, técnico, financeiro) como texto legível
- Usar mesma API: `POST {UAZAPI_BASE_URL}/message/send-text` com header `token`

### 4. Nenhuma mudança no frontend
Todas as chamadas do frontend usam `supabase.functions.invoke("send-zapi-message", ...)` e `supabase.functions.invoke("send-whatsapp-report", ...)` — a interface de request/response permanece igual.

## Importante
Depois de configurar os secrets e eu implementar, você precisa:
1. Conectar seu WhatsApp no painel do uazapiGO (escanear QR code) — o status atual está "offline"
2. Testar enviando uma mensagem pelo sistema

