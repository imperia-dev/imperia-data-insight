import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';

// Signed-in password change. The caller must prove the current password;
// failed proofs feed the same server-side lockout used by login.
const BodySchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z
    .string()
    .min(8, 'A nova senha deve ter no mínimo 8 caracteres')
    .max(128, 'A nova senha deve ter no máximo 128 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A nova senha deve conter letras maiúsculas, minúsculas e números'),
}).strict();

const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Método não permitido' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceKey) return reply({ error: 'Serviço temporariamente indisponível' }, 503);

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return reply({ error: 'Não autenticado' }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user?.id || !user.email) return reply({ error: 'Sessão inválida. Entre novamente.' }, 401);

    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > 4096) return reply({ error: 'Requisição inválida' }, 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return reply({ error: 'Requisição inválida' }, 400); }
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.find((i) => i.path[0] === 'newPassword')?.message ?? 'Dados inválidos';
      return reply({ error: msg }, 400);
    }
    const { currentPassword, newPassword } = parsed.data;
    if (currentPassword === newPassword) return reply({ error: 'A nova senha deve ser diferente da atual' }, 400);

    const email = user.email.toLowerCase();

    const { data: locks, error: lockError } = await admin
      .from('account_lockouts')
      .select('locked_until')
      .eq('identifier', email)
      .is('unlocked_at', null)
      .or(`locked_until.is.null,locked_until.gt.${new Date().toISOString()}`)
      .limit(1);
    if (lockError) return reply({ error: 'Serviço temporariamente indisponível' }, 503);
    if (locks?.length) return reply({ error: 'Conta temporariamente bloqueada. Tente novamente mais tarde.' }, 429);

    // Verify the current password against Supabase Auth.
    const verifier = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: proof, error: proofError } = await verifier.auth.signInWithPassword({ email, password: currentPassword });
    const proofOk = !proofError && !!proof.session && proof.user?.id === user.id;

    await admin.rpc('log_login_attempt', {
      p_identifier: email,
      p_attempt_type: 'login',
      p_success: proofOk,
      p_failure_reason: proofOk ? null : 'password_change_wrong_current',
      p_user_agent: (req.headers.get('user-agent') ?? '').slice(0, 512),
    });

    // Discard the temporary verification session immediately.
    if (proof?.session?.access_token) {
      await admin.auth.admin.signOut(proof.session.access_token, 'local').catch(() => null);
    }

    if (!proofOk) return reply({ error: 'Senha atual incorreta' }, 401);

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
    if (updateError) {
      const weak = /weak|pwned|leaked|breach/i.test(updateError.message ?? '');
      return reply({ error: weak ? 'Esta senha é fraca ou já apareceu em vazamentos. Escolha outra.' : 'Não foi possível alterar a senha' }, weak ? 400 : 500);
    }

    await admin.rpc('log_security_event', {
      p_event_type: 'password_changed',
      p_severity: 'info',
      p_details: { user_id: user.id, method: 'settings_current_password' },
    }).then(() => null, () => null);

    return reply({ success: true });
  } catch {
    return reply({ error: 'Serviço temporariamente indisponível' }, 503);
  }
});
