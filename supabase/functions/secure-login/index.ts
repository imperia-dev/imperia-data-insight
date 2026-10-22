import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';

const BodySchema = z.object({ email: z.string().trim().email().max(255).transform(v => v.toLowerCase()), password: z.string().min(1).max(1024) }).strict();
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 4096) return reply({ error: 'Requisição inválida' }, 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return reply({ error: 'Requisição inválida' }, 400); }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return reply({ error: 'Email ou senha inválidos' }, 400);
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) return reply({ error: 'Entrada temporariamente indisponível' }, 503);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: locks, error: lockError } = await admin.from('account_lockouts').select('locked_until').eq('identifier', parsed.data.email).is('unlocked_at', null).or(`locked_until.is.null,locked_until.gt.${new Date().toISOString()}`).limit(1);
    if (lockError) return reply({ error: 'Entrada temporariamente indisponível' }, 503);
    if (locks?.length) return reply({ error: 'Conta temporariamente bloqueada. Tente novamente mais tarde.' }, 429);
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword(parsed.data);
    // Only the real Auth result, never a caller-supplied success flag, drives lockouts.
    const { error: logError } = await admin.rpc('log_login_attempt', {
      p_identifier: parsed.data.email, p_attempt_type: 'login', p_success: !error && !!data.session,
      p_failure_reason: error ? 'authentication_failed' : null,
      p_user_agent: (req.headers.get('user-agent') ?? '').slice(0, 512),
    });
    if (logError) return reply({ error: 'Entrada temporariamente indisponível' }, 503);
    if (error || !data.session) return reply({ error: 'Email ou senha incorretos' }, 401);
    return reply({ session: data.session });
  } catch {
    return reply({ error: 'Entrada temporariamente indisponível' }, 503);
  }
});