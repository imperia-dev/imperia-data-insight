import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireRole } from "../_shared/auth.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { bindProviderRequest, webhookConfigured } from "./authorization.ts";

const BodySchema = z.object({ translationOrderId: z.string().trim().min(1).max(255), AccountId: z.string().uuid() }).strict();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require an authenticated caller before forwarding to internal n8n workflow
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const auth = await requireRole(req, ['owner', 'master', 'admin', 'operation', 'translator']);
  if (!auth.ok) return auth.response;

  try {
    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    
    const authName = Deno.env.get('N8N_WEBHOOK_HEADER_NAME') || 'x-webhook-secret';
    const authValue = Deno.env.get('N8N_WEBHOOK_SECRET');
    if (!webhookConfigured(webhookUrl, authValue, authName) || !webhookUrl || !authValue) {
      return new Response(
        JSON.stringify({ error: 'Integration security configuration pending' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 4096) return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { data: profile, error: profileError } = await auth.supabase.from('profiles').select('operation_account_id, approval_status').eq('id', auth.userId).maybeSingle();
    const { data: order, error: orderError } = await auth.supabase.from('orders').select('order_number, assigned_to, status_order, account_ID').eq('order_number', parsed.data.translationOrderId).maybeSingle();
    const payload = bindProviderRequest(auth.userId, profile?.operation_account_id ?? null, parsed.data.AccountId, order);
    if (profileError || orderError || profile?.approval_status !== 'approved' || !payload) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const outHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    outHeaders[authName] = authValue;

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: outHeaders,
      body: JSON.stringify(payload),
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });

    if (!webhookResponse.ok) return new Response(JSON.stringify({ error: 'Provider integration failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const responseText = await webhookResponse.text();
    
    console.log('n8n response status:', webhookResponse.status);
    
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = { error: 'Invalid provider response' };
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        status: webhookResponse.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Provider integration failed');
    return new Response(
      JSON.stringify({ error: 'Provider integration failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
