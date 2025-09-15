# Security Documentation

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

### Reporting Security Issues

If you discover a security vulnerability, please email security@example.com with:
- Description of the issue
- Steps to reproduce
- Potential impact
- Suggested fix (if any)