import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginAlertRequest {
  user_id: string;
  notification_type: string;
  ip_address: string;
  user_agent: string;
  suspicious_factors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const { user_id, notification_type, ip_address, user_agent, suspicious_factors }: LoginAlertRequest = await req.json();

    // Buscar email do usuário
    const { data: userData } = await supabase.auth.admin.getUserById(user_id);
    
    if (!userData?.user?.email) {
      throw new Error('User email not found');
    }

    const userEmail = userData.user.email;
    const timestamp = new Date().toLocaleString('pt-BR');

    // Gerar token para "Não fui eu" que revoga todas as sessões
    const { data: tokenData } = await supabase
      .from('security_alerts')
      .insert({
        alert_type: 'suspicious_login',
        severity: 'medium',
        title: 'Login Suspeito Detectado',
        message: `Login suspeito de ${ip_address}`,
        triggered_by: user_id,
        metadata: {
          ip_address,
          user_agent,
          suspicious_factors,
          timestamp
        }
      })
      .select()
      .single();

    const revokeToken = tokenData?.id || '';

    let notificationTitle = 'Login Suspeito Detectado';
    let notificationMessage = '';

    switch (notification_type) {
      case 'new_device':
        notificationTitle = 'Novo Dispositivo Detectado';
        notificationMessage = 'Um login foi realizado de um dispositivo não reconhecido.';
        break;
      case 'new_location':
        notificationTitle = 'Novo Local Detectado';
        notificationMessage = 'Um login foi realizado de um local não reconhecido.';
        break;
      case 'unusual_time':
        notificationTitle = 'Login em Horário Incomum';
        notificationMessage = 'Um login foi realizado em um horário atípico.';
        break;
    }

    // Enviar email se Resend estiver configurado
    if (resend) {
      await resend.emails.send({
        from: 'Segurança Impéria <security@resend.dev>',
        to: [userEmail],
        subject: `🔐 ${notificationTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">${notificationTitle}</h2>
            <p>${notificationMessage}</p>
            
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Detalhes do Login:</strong></p>
              <ul style="list-style: none; padding-left: 0;">
                <li>📅 <strong>Data/Hora:</strong> ${timestamp}</li>
                <li>🌐 <strong>IP:</strong> ${ip_address}</li>
                <li>💻 <strong>Dispositivo:</strong> ${user_agent.substring(0, 100)}</li>
              </ul>
            </div>

            <p><strong>Se este login não foi você:</strong></p>
            <a href="${supabaseUrl}/rest/v1/rpc/revoke_user_sessions?user_id=${user_id}" 
               style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0;">
              ⚠️ Não fui eu - Revogar Sessões
            </a>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Se você reconhece esta atividade, pode ignorar este email.
            </p>
          </div>
        `,
      });
    }

    // Log evento de segurança
    await supabase.rpc('log_security_event', {
      p_event_type: 'login_alert_sent',
      p_severity: 'info',
      p_details: {
        user_id,
        notification_type,
        ip_address,
        factors: suspicious_factors
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        alert_sent: true,
        notification_type
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in send-login-alert:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
