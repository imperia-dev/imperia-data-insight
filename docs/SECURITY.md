# Security Documentation

> **Last Updated**: December 2024
> **Security Audit Status**: ✅ Completed

## Table of Contents
1. [Secure Logging Practices](#secure-logging-practices)
2. [Environment Variables Management](#environment-variables-management)
3. [Row Level Security (RLS)](#row-level-security-rls)
4. [Storage Security](#storage-security)
5. [Rate Limiting](#rate-limiting)
6. [Security Monitoring](#security-monitoring)
7. [Manual Configuration Required](#manual-configuration-required)

---

## Secure Logging Practices

### Overview
This project uses a secure logger utility (`src/utils/logger.ts`) that prevents sensitive data exposure in logs.

### Key Features
- **Development Only**: Logs are disabled in production by default
- **Data Sanitization**: Automatically redacts sensitive fields (passwords, tokens, CPF, PIX, emails, etc.)
- **Security Event Logging**: Critical security events are logged to the database for audit trails

### Usage

#### Basic Logging (Development Only)
```typescript
import { logger } from '@/utils/logger';

// Standard logging
logger.log('User action completed');
logger.error('Operation failed');
logger.warn('Deprecated feature used');
logger.info('System initialized');
logger.debug('Detailed debug info');
```

#### Security Event Logging (Production + Development)
```typescript
import { logSecurityEvent } from '@/utils/logger';

// Log security-critical events (always persisted to database)
await logSecurityEvent('login_attempt', {
  userId: user.id,
  ipAddress: req.ip,
  success: true
});
```

### What NOT to Do
```typescript
// ❌ NEVER use console.log directly
console.log('User data:', userData);

// ❌ NEVER log sensitive data
logger.log('Password:', password);

// ✅ ALWAYS use logger utility
logger.log('User action completed');
```

### Sensitive Data Detection
The logger automatically redacts these fields:
- `password`, `senha`, `token`, `secret`, `api_key`
- `cpf`, `cnpj`, `pix`, `pix_key`
- `email`, `phone`, `telefone`
- `credit_card`, `card_number`, `cvv`
- `session`, `auth`, `user_id`, `access_token`

## Environment Variables Management

### Overview
This project implements strict separation between public and private environment variables to ensure security.

### Variable Types

#### 1. Public Variables (Frontend-safe)
- **Prefix**: `VITE_`
- **Storage**: Can be in `.env` file during development
- **Access**: Available in browser via `import.meta.env`
- **Examples**:
  ```typescript
  VITE_SUPABASE_URL=https://xxx.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGc...
  ```

#### 2. Private Variables (Backend-only)
- **Storage**: Supabase Secrets only
- **Access**: Edge Functions via `Deno.env.get()`
- **Never**: Never prefix with `VITE_`, never expose to frontend
- **Examples**:
  ```typescript
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
  PAGPAY_SECRET=sk_live_...
  WEBHOOK_SECRET=whsec_...
  ```

### Security Checklist

- [ ] `.env` file added to `.gitignore`
- [ ] No sensitive data in frontend code
- [ ] Service role key only in Edge Functions
- [ ] Webhooks validated with signatures
- [ ] API keys stored in Supabase Secrets
- [ ] CORS headers properly configured
- [ ] Rate limiting implemented where needed
- [ ] Audit logs for sensitive operations

### Adding Secrets in Production

1. Navigate to Supabase Dashboard
2. Go to Settings → Functions → Secrets
3. Add your secret with a descriptive name
4. Access in Edge Functions:
   ```typescript
   const secret = Deno.env.get('YOUR_SECRET_NAME');
   ```

### Example: Secure Webhook Handler

```typescript
// supabase/functions/webhook-handler/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Get secret from environment
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  
  // Verify signature
  const signature = req.headers.get('x-signature');
  if (!verifySignature(signature, webhookSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Process webhook securely
  // ...
});
```

### Common Security Mistakes to Avoid

1. **Never do this**:
   ```typescript
   // ❌ BAD: Exposing service role in frontend
   const supabase = createClient(url, 'service_role_key');
   ```

2. **Never do this**:
   ```typescript
   // ❌ BAD: Hardcoding secrets
   const API_KEY = 'sk_live_abcd1234';
   ```

3. **Never do this**:
   ```typescript
   // ❌ BAD: Using VITE_ prefix for secrets
   VITE_SECRET_API_KEY=secret_value
   ```

4. **Never do this**:
   ```typescript
   // ❌ BAD: Using console.log directly
   console.log('User data:', userData);
   
   // ✅ GOOD: Use logger utility
   import { logger } from '@/utils/logger';
   logger.log('User action completed');
   ```

## Security Monitoring

### Security Events Dashboard
Access real-time security monitoring at `/security-dashboard`:
- Failed login attempts
- Suspicious activity detection
- Rate limit violations
- Unauthorized access attempts
- Security score calculation

### Audit Logs
All sensitive data access is logged to `audit_logs` table:
- Who accessed what data
- When it was accessed
- Which fields were viewed
- IP address and user agent

### Rate Limiting
Sensitive data access is rate-limited:
- Max 100 operations per hour per user
- Automatic lockout on excessive attempts
- Real-time alerts for violations

---

## Row Level Security (RLS)

### Overview
All 91 database tables have Row Level Security (RLS) enabled. Policies are configured to ensure data isolation based on user roles.

### Role Hierarchy
| Role | Access Level |
|------|--------------|
| `owner` | Full access to all data |
| `master` | Administrative access to most data |
| `admin` | Operational administrative access |
| `financeiro` | Financial data access only |
| `operation` | Operational tasks access |
| `translator` | Translation work access |
| `customer` | Own data only |

### Critical Tables with Restricted Access

#### Lead Tracking Tables (Fixed Dec 2024)
- `lead_conversions`, `lead_events`, `lead_sessions`, `lead_page_views`
- **SELECT**: Only `owner`, `master`, `admin`
- **INSERT**: Public (for tracking)
- **UPDATE/DELETE**: Only `owner`

#### Financial Tables
- `closing_protocols`, `contas_a_pagar`, `contas_a_receber`, `expenses`
- Access restricted to `owner`, `financeiro`

#### Audit & Security Tables
- `audit_logs`, `security_logs`, `active_sessions`, `account_lockouts`
- Access restricted to `owner` only

### Policy Best Practices
```sql
-- ✅ GOOD: Using get_user_role function
CREATE POLICY "Only privileged roles can view"
ON table_name FOR SELECT
USING (get_user_role(auth.uid()) IN ('owner', 'master', 'admin'));

-- ❌ BAD: Using USING (true) - exposes all data
CREATE POLICY "Anyone can view"
ON table_name FOR SELECT
USING (true);
```

---

## Storage Security

### Bucket Configuration (Updated Dec 2024)

#### Public Buckets (Safe for public access)
| Bucket | Purpose |
|--------|---------|
| `company-assets` | Public company logos/images |
| `avatars` | User profile pictures |
| `announcement-images` | Public announcements |

#### Private Buckets (Role-restricted access)
| Bucket | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `service-provider-files` | owner, master, admin, financeiro | owner, master, admin, financeiro | owner, master, admin | owner |
| `payment-receipts` | owner, master, admin, financeiro | owner, master, admin, financeiro | owner, master, admin | owner |
| `documents` | owner, master, admin, operation | owner, master, admin, operation | owner, master, admin | owner |
| `pendency-attachments` | owner, master, admin, operation | owner, master, admin, operation, customer | owner, master, admin | owner |

### Storage Policy Example
```sql
CREATE POLICY "Privileged roles can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND get_user_role(auth.uid()) IN ('owner', 'master', 'admin', 'operation'));
```

---

## Rate Limiting

### Configuration
| Endpoint Pattern | Limit | Window |
|-----------------|-------|--------|
| `/auth/*` | 5 requests | 60 seconds |
| `/api/*` | 100 requests | 60 seconds |
| Default | 50 requests | 60 seconds |

### Lockout Mechanism
- After exceeding rate limit: 15-minute cooldown
- Automatic lockout logged to `rate_limit_logs`
- Alerts sent to owner on violations

---

## Manual Configuration Required

### ⚠️ Leaked Password Protection
**Status**: Must be manually enabled in Supabase Dashboard

**Steps to enable**:
1. Go to Supabase Dashboard → Authentication → Settings
2. Scroll to "Security" section
3. Enable "Leaked password protection"
4. Save changes

This feature checks passwords against HaveIBeenPwned database during signup/password change.

### JWT Token Configuration
- **Access Token TTL**: 1 hour (Supabase default)
- **Refresh Token TTL**: 1 week
- **Storage**: localStorage (protected by CSP)

---

## Validation Test

### Testing RLS Policies (Penetration Test)
```bash
# 1. Get tokens for two different users
# User A (translator role)
curl -X POST 'https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_ANON_KEY' \
  -d '{"email":"translator@example.com","password":"xxx"}'

# 2. Try to access lead data with translator token
curl 'https://YOUR_PROJECT.supabase.co/rest/v1/lead_conversions' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer TRANSLATOR_TOKEN'

# Expected result: Empty array [] (access denied by RLS)
```

---

### Reporting Security Issues

If you discover a security vulnerability, please email security@example.com with:
- Description of the issue
- Steps to reproduce
- Potential impact
- Suggested fix (if any)