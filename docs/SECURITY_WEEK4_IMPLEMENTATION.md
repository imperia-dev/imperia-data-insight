# Semana 4: Idempotency Keys + Rotação de Secrets

## 📋 Visão Geral

Esta implementação adiciona dois sistemas críticos de segurança:

1. **Idempotency Keys**: Prevenção de operações duplicadas
2. **Secret Rotation**: Gerenciamento e rotação automática de secrets

## 🔐 1. Idempotency Keys

### O que são Idempotency Keys?

Idempotency keys garantem que operações críticas (pagamentos, aprovações, etc.) não sejam executadas múltiplas vezes acidentalmente, mesmo se a requisição for enviada várias vezes.

### Como Funciona

1. Cliente gera um UUID único para a operação
2. Cliente envia request com header `Idempotency-Key: <uuid>`
3. Sistema verifica se a key já existe:
   - Se não existe: processa e armazena resultado
   - Se existe e completou: retorna resultado armazenado
   - Se existe e está processando: retorna 409 Conflict
   - Se existe com parâmetros diferentes: retorna 422 Unprocessable Entity

### Uso no Frontend

```typescript
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

// Gerar idempotency key
const idempotencyKey = uuidv4();

// Fazer chamada idempotente
const { data, error } = await supabase.functions.invoke('process-idempotent-operation', {
  headers: {
    'Idempotency-Key': idempotencyKey
  },
  body: {
    operation_type: 'approve_protocol',
    payload: {
      protocol_id: 'xxx',
      approval_type: 'master_initial',
      notes: 'Aprovado'
    }
  }
});

if (data?.idempotent && data?.cached) {
  console.log('Operação já foi executada anteriormente');
}
```

### Operações Suportadas

#### 1. Aprovar Protocolo
```typescript
{
  operation_type: 'approve_protocol',
  payload: {
    protocol_id: string,
    approval_type: 'provider' | 'master_initial' | 'master_final' | 'owner',
    notes?: string
  }
}
```

#### 2. Processar Pagamento
```typescript
{
  operation_type: 'process_payment',
  payload: {
    payment_request_id: string,
    amount: number
  }
}
```

#### 3. Criar Despesa
```typescript
{
  operation_type: 'create_expense',
  payload: {
    description: string,
    amount: number,
    data_competencia: string,
    conta_contabil_id: string,
    tipo_lancamento: string,
    // ... outros campos de expense
  }
}
```

#### 4. Gerar Protocolo Consolidado
```typescript
{
  operation_type: 'generate_consolidated_protocol',
  payload: {
    competence_month: string,
    protocol_ids: string[]
  }
}
```

### Limpeza Automática

Keys expiram automaticamente após 24 horas. Para limpeza manual:

```sql
SELECT cleanup_expired_idempotency_keys();
```

Recomenda-se executar via cron job diário.

## 🔄 2. Secret Rotation

### Secrets Gerenciados

| Secret | Rotação Padrão | Uso |
|--------|---------------|-----|
| `BTG_CLIENT_ID` | 90 dias | Integração BTG Pactual |
| `BTG_CLIENT_SECRET` | 90 dias | Integração BTG Pactual |
| `FACEBOOK_ACCESS_TOKEN` | 30 dias | Marketing/Ads |
| `TWILIO_AUTH_TOKEN` | 90 dias | SMS |
| `RESEND_API_KEY` | 180 dias | Email |
| `WEBHOOK_SECRET` | 90 dias | Webhooks externos |
| `TRANSLATION_WEBHOOK_SECRET` | 90 dias | Tradução |

### Rotação Manual (UI)

1. Acesse `/settings/security/secrets`
2. Localize o secret a ser rotado
3. Clique em "Rotate"
4. Selecione o tipo de rotação:
   - **Manual**: Rotação planejada
   - **Scheduled**: Rotação agendada automática
   - **Compromised**: Secret comprometido (emergência)
5. Confirme
6. **IMPORTANTE**: Copie o novo valor e atualize nas configurações do Supabase imediatamente

### Rotação via API

```typescript
const { data, error } = await supabase.functions.invoke('rotate-secret', {
  body: {
    secret_name: 'RESEND_API_KEY',
    rotation_type: 'manual',
    expires_in_days: 180 // opcional
  }
});

if (data?.success) {
  console.log('Novo secret:', data.new_secret);
  console.log('Expira em:', data.expires_at);
  console.log('Próxima rotação:', data.next_rotation_due);
}
```

### Verificação de Expiração

Edge function `check-secret-expiration` pode ser executada manualmente ou via cron:

```sql
-- Configurar cron job para verificação diária
SELECT cron.schedule(
  'check-secrets-daily',
  '0 9 * * *', -- 9h todos os dias
  $$
  SELECT net.http_post(
    url:='https://agttqqaampznczkyfvkf.supabase.co/functions/v1/check-secret-expiration',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

### Notificações

Quando secrets estão próximos da expiração:
- **30 dias**: Notificação informativa
- **7 dias**: Alerta crítico
- **Expirado**: Alerta emergencial

Notificações são enviadas via:
1. Security Alerts (dashboard)
2. Email (se RESEND_API_KEY configurado)

## 📊 Monitoramento

### Dashboard de Secrets

Acesse `/settings/security/secrets` para ver:
- Status de todos os secrets
- Dias até expiração
- Histórico de rotações
- Próxima rotação agendada

### Dashboard de Idempotency Keys

Visualize as últimas 50 operações idempotentes:
- Tipo de operação
- Status (processando, completo, falha)
- Timestamps
- Chave utilizada

## 🔧 Funções SQL Disponíveis

### get_active_secrets_summary()
Retorna resumo de todos os secrets ativos (apenas owner):

```sql
SELECT * FROM get_active_secrets_summary();
```

### check_secret_expiration()
Verifica secrets expirando em 30 dias:

```sql
SELECT * FROM check_secret_expiration();
```

### log_secret_rotation()
Loga uma rotação de secret:

```sql
SELECT log_secret_rotation(
  p_secret_name := 'RESEND_API_KEY',
  p_rotation_type := 'manual',
  p_old_hash := 'hash_anterior',
  p_new_hash := 'hash_novo',
  p_expires_in_days := 180
);
```

### cleanup_expired_idempotency_keys()
Remove idempotency keys expiradas:

```sql
SELECT cleanup_expired_idempotency_keys();
```

## 🛡️ Segurança

### RLS Policies

#### idempotency_keys
- Usuários podem ver suas próprias keys
- Owners e Masters podem ver todas
- Apenas usuários podem criar suas próprias keys
- Apenas owners podem deletar

#### secret_rotation_logs
- Apenas owners podem visualizar, inserir e atualizar
- Todas as operações são auditadas
- Trigger automático para security_events

### Audit Trail

Todas as operações são registradas em:
- `audit_logs`: Operações gerais
- `security_events`: Eventos de segurança
- `secret_rotation_logs`: Histórico de rotações

## 📝 Boas Práticas

### Idempotency Keys

1. ✅ **Gere UUIDs únicos** para cada operação
2. ✅ **Armazene keys localmente** se precisar retentar
3. ✅ **Trate código 409** (já processando) adequadamente
4. ✅ **Use keys curtas** (24h expiração)
5. ❌ **Não reutilize keys** para operações diferentes

### Secret Rotation

1. ✅ **Rotacione secrets regularmente**
2. ✅ **Nunca compartilhe secrets** via email/chat
3. ✅ **Use tipo 'compromised'** se suspeitar de vazamento
4. ✅ **Teste novo secret** antes de revogar o antigo
5. ❌ **Não ignore alertas** de expiração

## 🚀 Implementação

### Bug Crítico Corrigido

**Arquivo**: `supabase/functions/secure-upload/index.ts`
**Linha 41**: Regex EICAR mal formado corrigido

### Novas Tabelas

- `idempotency_keys`: Armazena keys de idempotência
- `secret_rotation_logs`: Histórico de rotações

### Novas Edge Functions

- `process-idempotent-operation`: Processa operações idempotentes
- `rotate-secret`: Rotaciona secrets
- `check-secret-expiration`: Verifica expiração

### Novos Componentes

- `SecretRotationDashboard`: Dashboard de gestão de secrets
- `IdempotencyKeyMonitor`: Monitor de operações idempotentes
- `SecretManagement`: Página principal

### Nova Rota

- `/settings/security/secrets`: Gestão de secrets

## 🧪 Testes

### Testar Idempotency

```bash
# Primeira chamada
curl -X POST 'https://your-project.supabase.co/functions/v1/process-idempotent-operation' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Idempotency-Key: test-key-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "operation_type": "approve_protocol",
    "payload": {"protocol_id": "xxx", "approval_type": "master_initial"}
  }'

# Segunda chamada (mesma key) - deve retornar resultado cacheado
curl -X POST 'https://your-project.supabase.co/functions/v1/process-idempotent-operation' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Idempotency-Key: test-key-123' \
  -H 'Content-Type: application/json' \
  -d '{
    "operation_type": "approve_protocol",
    "payload": {"protocol_id": "xxx", "approval_type": "master_initial"}
  }'
```

### Testar Rotação

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/rotate-secret' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "secret_name": "TEST_SECRET",
    "rotation_type": "manual"
  }'
```

## 📚 Referências

- [Idempotency Keys - Stripe](https://stripe.com/docs/api/idempotent_requests)
- [Secret Management Best Practices - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Password Rotation - AWS](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)

## ✅ Checklist de Implementação

- [x] Bug no secure-upload corrigido
- [x] Tabela idempotency_keys criada
- [x] Tabela secret_rotation_logs criada
- [x] Funções SQL implementadas
- [x] RLS policies configuradas
- [x] Edge function process-idempotent-operation
- [x] Edge function rotate-secret
- [x] Edge function check-secret-expiration
- [x] Componente SecretRotationDashboard
- [x] Componente IdempotencyKeyMonitor
- [x] Página SecretManagement
- [x] Documentação completa
- [ ] Testes end-to-end
- [ ] Configurar cron jobs
- [ ] Adicionar rota no App.tsx

## 🔜 Próximos Passos

1. Adicionar rota `/settings/security/secrets` no `App.tsx`
2. Configurar cron job para `check-secret-expiration`
3. Configurar cron job para `cleanup_expired_idempotency_keys`
4. Implementar notificações push/mobile (opcional)
5. Adicionar métricas de uso de idempotency keys
6. Dashboard de auditoria consolidado
