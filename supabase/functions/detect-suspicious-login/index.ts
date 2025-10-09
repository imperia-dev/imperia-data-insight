import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuspiciousLoginRequest {
  user_id: string;
  login_attempt_id: string;
  ip_address: string;
  user_agent: string;
  device_fingerprint?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, login_attempt_id, ip_address, user_agent, device_fingerprint }: SuspiciousLoginRequest = await req.json();

    // Buscar logins anteriores do usuário
    const { data: previousLogins } = await supabase
      .from('login_attempts')
      .select('ip_address, user_agent, metadata')
      .eq('identifier', user_id)
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(10);

    const suspiciousFactors: string[] = [];
    let notificationType = '';

    // Verificar novo dispositivo
    const knownUserAgents = previousLogins?.map(l => l.user_agent) || [];
    if (!knownUserAgents.includes(user_agent)) {
      suspiciousFactors.push('new_device');
      notificationType = 'new_device';
    }

    // Verificar novo IP
    const knownIPs = previousLogins?.map(l => l.ip_address) || [];
    if (!knownIPs.includes(ip_address)) {
      suspiciousFactors.push('new_ip');
      if (!notificationType) notificationType = 'new_location';
    }

    // Verificar horário incomum (exemplo: entre 2h e 6h da manhã)
    const currentHour = new Date().getUTCHours();
    if (currentHour >= 2 && currentHour <= 6) {
      suspiciousFactors.push('unusual_time');
      if (!notificationType) notificationType = 'unusual_time';
    }

    // Se houver fatores suspeitos, criar notificação
    if (suspiciousFactors.length > 0) {
      const { error: notifError } = await supabase
        .from('login_notifications')
        .insert({
          user_id,
          notification_type: notificationType,
          login_attempt_id,
          metadata: {
            ip_address,
            user_agent,
            device_fingerprint,
            suspicious_factors: suspiciousFactors,
            timestamp: new Date().toISOString()
          }
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }

      // Chamar Edge Function para enviar alerta
      await supabase.functions.invoke('send-login-alert', {
        body: {
          user_id,
          notification_type: notificationType,
          ip_address,
          user_agent,
          suspicious_factors: suspiciousFactors
        }
      });

      return new Response(
        JSON.stringify({
          suspicious: true,
          factors: suspiciousFactors,
          notification_sent: true
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ suspicious: false }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in detect-suspicious-login:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
