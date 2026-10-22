import { supabase } from '@/integrations/supabase/client';

export async function secureSignIn(email: string, password: string) {
  const { data, error } = await supabase.functions.invoke('secure-login', { body: { email, password } });
  if (error) {
    let message = 'Não foi possível entrar. Tente novamente.';
    if ('context' in error && error.context instanceof Response) {
      const response = await error.context.json().catch(() => null);
      if (typeof response?.error === 'string') message = response.error;
    }
    return { data: { user: null, session: null }, error: new Error(message) };
  }
  if (!data?.session?.access_token || !data?.session?.refresh_token) return { data: { user: null, session: null }, error: new Error('Não foi possível entrar.') };
  return supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
}