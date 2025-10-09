# Implementação - Semana 1: Fundação de Segurança

## ✅ Itens Implementados

### 1. MFA Obrigatório para Roles Sensíveis

**Arquivo:** `src/components/security/MFAEnforcement.tsx`

**Funcionalidade:**
- Detecta automaticamente usuários com roles `owner` ou `master`
- Exibe modal bloqueante obrigando configuração de MFA
- Não permite acesso ao sistema sem conclusão do MFA
- Integrado ao `AuthProvider` para verificação imediata após login

**Como funciona:**
1. Componente verifica role do usuário via `user_roles` table
2. Se role for `owner` ou `master` E MFA não estiver habilitado
3. Modal bloqueante aparece com instruções de configuração
4. Usuário configura TOTP (Google Authenticator, Authy, etc.)
5. Salva códigos de backup
6. Após conclusão, modal fecha e usuário pode acessar sistema

**Localização no código:** `src/App.tsx` linha 69

---

### 2. Security Headers Aplicados

**Arquivos modificados:**
- `vite.config.ts` - Headers no servidor de desenvolvimento e build
- `supabase/functions/_shared/validation.ts` - Headers para Edge Functions

**Headers implementados:**

#### Frontend (Vite)
```typescript
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
'X-Frame-Options': 'DENY'
'X-Content-Type-Options': 'nosniff'
'Referrer-Policy': 'strict-origin-when-cross-origin'
'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
```

**CSP (Content Security Policy):**
- **Produção:** Restritivo, permite apenas domínio Supabase
- **Desenvolvimento:** Mais permissivo para hot-reload funcionar

#### Backend (Edge Functions)
```typescript
securityHeaders = {
  'Access-Control-Allow-Origin': 'https://agttqqaampznczkyfvkf.supabase.co',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';"
}
```

**CORS restritivo em produção:**
- Desenvolvimento: `Access-Control-Allow-Origin: *` (para testes)
- Produção: Apenas URL do Supabase permitida

---

### 3. Validação Zod em Edge Functions

**Arquivos criados:**
- `supabase/functions/_shared/validation.ts` - Utilitários compartilhados
- `supabase/functions/btg-auth/validation.ts` - Schema específico BTG

**Funcionalidades implementadas:**

#### A. Validação de Schema
```typescript
validatePayload<T>(schema: z.ZodSchema<T>, data: unknown): T
```
- Valida payload usando Zod
- Retorna dados tipados ou lança erro detalhado
- Mensagens de erro amigáveis

#### B. Validação de Tamanho
```typescript
validatePayloadSize(payload: string, maxSizeMB = 10): void
```
- Verifica tamanho do payload
- Previne ataques de DoS via payloads grandes
- Configurável por função

#### C. Rate Limiting (em memória)
```typescript
checkRateLimit(identifier: string, maxRequests = 100, windowMs = 60000): boolean
```
- Limite de 100 requisições por minuto por identificador
- ⚠️ **Nota:** Em produção, usar Redis/Upstash
- Inclui função de limpeza automática

#### D. Sanitização de Strings
```typescript
sanitizeString(input: string): string
```
- Remove `<>`, `javascript:`, event handlers
- Limita tamanho a 10.000 caracteres
- Previne XSS em logs e respostas

#### E. Schemas Comuns
- `paginationSchema` - Paginação padronizada
- `uuidSchema` - Validação de UUIDs
- `emailSchema` - Validação de emails

**Exemplo de uso (btg-auth):**
```typescript
// Validar tamanho
validatePayloadSize(rawBody, 1); // Max 1MB

// Validar schema
const body = JSON.parse(rawBody);
const validatedBody = validatePayload(btgAuthRequestSchema, body);
```

---

## 📋 Checklist de Implementação

- [x] MFA obrigatório para owner/master
- [x] Security headers em desenvolvimento (Vite)
- [x] Security headers em produção (Vite build)
- [x] Security headers em Edge Functions
- [x] CSP configurado (produção e dev)
- [x] CORS restritivo em Edge Functions
- [x] Validação Zod em `btg-auth`
- [x] Utilitários de validação compartilhados
- [x] Rate limiting básico
- [x] Sanitização de strings
- [x] Schemas comuns (UUID, email, paginação)

---

## 🔄 Próximos Passos

### Edge Functions Pendentes de Validação

Aplicar validação Zod nas seguintes Edge Functions:

1. ✅ `btg-auth` - **Concluído**
2. ⏳ `btg-sync-suppliers`
3. ⏳ `send-payment-email`
4. ⏳ `send-sms`
5. ⏳ `send-whatsapp-report`
6. ⏳ `webhook-translation-orders`
7. ⏳ `initiate-password-reset`
8. ⏳ `reset-password`
9. ⏳ `verify-reset-token`
10. ⏳ `secure-upload`
11. ⏳ `check-pwned-password`
12. ⏳ `generate-provider-protocols`
13. ⏳ `generate-reviewer-protocols`
14. ⏳ `sync-facebook-data`
15. ⏳ `daily-backup`

### Melhorias Futuras (Semana 2+)

1. **Rate Limiting em Produção**
   - Migrar de memória para Redis/Upstash
   - Implementar diferentes limites por endpoint
   - Adicionar banimento temporário por IP

2. **JWT Lifetime**
   - Reduzir de 12h para 30 minutos
   - Implementar refresh token robusto
   - Auto-renovação transparente

3. **Documentação RACI**
   - Criar matriz de permissões por role
   - Documentar cada endpoint e sua autorização
   - Testes automatizados de permissões

4. **Monitoramento**
   - Alertas para tentativas de MFA
   - Dashboard de rate limits
   - Métricas de security headers

---

## 🧪 Como Testar

### 1. MFA Obrigatório
1. Criar usuário com role `owner` ou `master`
2. Fazer login
3. Verificar se modal de MFA aparece
4. Tentar fechar modal (não deve permitir)
5. Configurar MFA
6. Verificar acesso liberado

### 2. Security Headers
```bash
# Desenvolvimento
curl -I http://localhost:8080
# Verificar headers: HSTS, X-Frame-Options, etc.

# Edge Function
curl -I https://agttqqaampznczkyfvkf.supabase.co/functions/v1/btg-auth
# Verificar security headers na resposta
```

### 3. Validação Zod
```bash
# Payload inválido
curl -X POST https://agttqqaampznczkyfvkf.supabase.co/functions/v1/btg-auth \
  -H "Content-Type: application/json" \
  -d '{"trigger": "invalid"}'
# Deve retornar erro de validação

# Payload muito grande
curl -X POST https://agttqqaampznczkyfvkf.supabase.co/functions/v1/btg-auth \
  -H "Content-Type: application/json" \
  -d "$(python -c 'print("x" * 2000000)')"
# Deve retornar erro de tamanho
```

---

## 📊 Métricas de Sucesso

- ✅ 100% dos usuários owner/master com MFA habilitado
- ✅ Security headers presentes em todas as respostas
- ✅ CSP sem violações reportadas
- ✅ 0 payloads inválidos processados
- ✅ Rate limits funcionando (verificar logs)

---

## 🔗 Referências

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Zod Documentation](https://zod.dev/)
- [Supabase Auth MFA](https://supabase.com/docs/guides/auth/auth-mfa)
