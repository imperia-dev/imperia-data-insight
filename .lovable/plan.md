

# Migration: Z-API → uazapiGO V2

## Overview

Replace all Z-API WhatsApp integration with uazapiGO V2 across 3 edge functions and update the corresponding secrets. The migration covers:
- Direct message sending (manual)
- Scheduled automated messages
- WhatsApp report sending (Twilio → uazapiGO)

## What Changes

### 1. New Secrets (replace Z-API credentials)

Replace the 3 existing Z-API secrets with 2 uazapiGO secrets:
- **`UAZAPI_BASE_URL`** — Your instance URL (e.g., `https://seusubdominio.uazapi.com`)
- **`UAZAPI_TOKEN`** — Instance authentication token

The old secrets `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN` will no longer be used.

### 2. Edge Function: `send-zapi-message/index.ts` (renamed logic)

**Current**: Calls `https://api.z-api.io/instances/{id}/token/{token}/send-text` with `Client-Token` header and body `{ phone, message }`.

**New**: Calls `{UAZAPI_BASE_URL}/message/send-text` with `token` header and body `{ number, text }`.

Key differences:
- Auth via `token` header instead of URL path + `Client-Token` header
- Body field names change: `phone` → `number`, `message` → `text`
- The edge function name stays the same to avoid breaking frontend calls

### 3. Edge Function: `execute-scheduled-messages/index.ts`

Update the `sendZApiMessage()` function at the bottom of the file to use the same uazapiGO endpoint pattern. Same changes as above.

### 4. Edge Function: `send-whatsapp-report/index.ts`

This currently uses **Twilio** to send WhatsApp reports via templates. Since the scope is "migrate everything," this will be converted to use uazapiGO instead. The template-based approach will be replaced with a plain text message (uazapiGO doesn't use Twilio-style templates). The report content is already built as text in the template variables, so it will be restructured into a readable text message.

The Twilio secrets (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) will no longer be needed for this function.

### 5. Frontend Components (no changes needed)

All frontend components (`ZApiMessageModal`, `ZApiProductivityModal`, `ManageScheduledMessagesDialog`, `PhoneVerificationEnforcement`) call `supabase.functions.invoke("send-zapi-message", ...)` — since the edge function name and request/response interface stay the same, no frontend changes are required.

## Technical Details

**uazapiGO V2 API for sending text:**
```
POST {UAZAPI_BASE_URL}/message/send-text
Headers:
  Content-Type: application/json
  token: {UAZAPI_TOKEN}
Body:
  { "number": "5511999999999", "text": "Hello" }
```

**Files to modify:**
- `supabase/functions/send-zapi-message/index.ts` — swap Z-API call for uazapiGO
- `supabase/functions/execute-scheduled-messages/index.ts` — update `sendZApiMessage()` function
- `supabase/functions/send-whatsapp-report/index.ts` — replace Twilio with uazapiGO

**Secrets to add:** `UAZAPI_BASE_URL`, `UAZAPI_TOKEN`

## Prerequisites

Before implementation, you need to:
1. Create your uazapiGO instance and connect your WhatsApp Business number
2. Provide the base URL and token so I can store them as secrets

