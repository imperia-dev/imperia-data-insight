import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SecurityAlertRequest {
  alert_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  notify_roles: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      alert_id,
      alert_type,
      severity,
      title,
      message,
      metadata = {},
      notify_roles,
    }: SecurityAlertRequest = await req.json();

    console.log("Processing security alert:", { alert_id, alert_type, severity });

    // Get users with the specified roles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .in("role", notify_roles);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      console.log("No users found with roles:", notify_roles);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No recipients found for alert" 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get alert details
    const { data: alert } = await supabase
      .from("security_alerts")
      .select("*")
      .eq("id", alert_id)
      .single();

    // Send emails to all recipients
    const emailPromises = profiles.map(async (profile) => {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${severity === 'critical' ? '#dc2626' : severity === 'high' ? '#ea580c' : '#f59e0b'}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .alert-details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${severity === 'critical' ? '#dc2626' : severity === 'high' ? '#ea580c' : '#f59e0b'}; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .badge-${severity} { background-color: ${severity === 'critical' ? '#fef2f2' : severity === 'high' ? '#fff7ed' : '#fffbeb'}; color: ${severity === 'critical' ? '#dc2626' : severity === 'high' ? '#ea580c' : '#f59e0b'}; }
            .metadata { font-size: 14px; color: #6b7280; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🚨 Alerta de Segurança</h1>
            </div>
            <div class="content">
              <h2>${title}</h2>
              <p>Olá ${profile.full_name},</p>
              <p>Um evento de segurança foi detectado em sua conta Imperia:</p>
              
              <div class="alert-details">
                <p><strong>Tipo de Alerta:</strong> ${alert_type}</p>
                <p><strong>Severidade:</strong> <span class="badge badge-${severity}">${severity.toUpperCase()}</span></p>
                <p><strong>Mensagem:</strong> ${message}</p>
                <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                
                ${Object.keys(metadata).length > 0 ? `
                  <div class="metadata">
                    <p><strong>Detalhes Adicionais:</strong></p>
                    <ul>
                      ${Object.entries(metadata).map(([key, value]) => 
                        `<li>${key}: ${JSON.stringify(value)}</li>`
                      ).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
              
              <p><strong>Ação Recomendada:</strong></p>
              <ul>
                <li>Revise os logs de auditoria no painel de segurança</li>
                <li>Verifique se há atividades não autorizadas</li>
                <li>Confirme a integridade das configurações de segurança</li>
                ${severity === 'critical' ? '<li><strong>AÇÃO IMEDIATA REQUERIDA</strong>: Este é um alerta crítico que requer atenção urgente</li>' : ''}
              </ul>
              
              <p>Se você não reconhece esta atividade ou tem dúvidas, entre em contato com o suporte imediatamente.</p>
            </div>
            <div class="footer">
              <p>Este é um e-mail automático do sistema de segurança Imperia.</p>
              <p>Para mais informações, acesse o Dashboard de Segurança.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        const result = await resend.emails.send({
          from: "Imperia Security <security@resend.dev>",
          to: profile.email,
          subject: `[${severity.toUpperCase()}] ${title}`,
          html: emailHtml,
        });

        console.log(`Email sent to ${profile.email}:`, result);
        return result;
      } catch (error) {
        console.error(`Failed to send email to ${profile.email}:`, error);
        return null;
      }
    });

    await Promise.all(emailPromises);

    // Update alert as notified
    await supabase
      .from("security_alerts")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", alert_id);

    console.log("Security alert processed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipients: profiles.length,
        message: "Alert sent successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-security-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
