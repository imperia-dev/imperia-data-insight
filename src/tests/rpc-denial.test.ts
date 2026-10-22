import { readFileSync } from 'node:fs';

// These probes cannot read business rows: only RPC denial with zero-row GETs.
const client = readFileSync(new URL('../integrations/supabase/client.ts', import.meta.url), 'utf8');
const url = client.match(/SUPABASE_URL = "([^"]+)"/)?.[1];
const key = client.match(/SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)?.[1];
if (!url || !key) throw new Error('Public Supabase configuration unavailable');
for (const rpc of ['get_company_costs_view', 'get_active_secrets_summary']) {
  const response = await fetch(`${url}/rest/v1/rpc/${rpc}?limit=0`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' } });
  if (![401, 403, 404].includes(response.status)) throw new Error(`Anonymous RPC denial failed: ${rpc}, status ${response.status}`);
  console.log(`Anonymous access denied: ${rpc}`);
}
const webhook = await fetch(`${url}/functions/v1/webhook-translation-orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
if (webhook.status !== 401) throw new Error(`Unauthenticated webhook not denied: ${webhook.status}`);
console.log('Translation webhook rejects missing shared secret');