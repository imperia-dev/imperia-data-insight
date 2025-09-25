import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportData {
  phoneNumber: string;
  period: string;
  stats: {
    total: number;
    pending: number;
    resolved: number;
    inProgress: number;
    errorTypes: Array<{
      type: string;
      count: number;
      label: string;
    }>;
  };
  userId: string;
  userName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') as string;
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') as string;
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') as string;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const reportData: ReportData = await req.json();
    const { phoneNumber, period, stats, userId, userName } = reportData;

    // Validate that this is report data, not password reset data
    if (!stats || !stats.errorTypes || typeof stats.total !== 'number') {
      console.error('Invalid report data structure');
      return new Response(
        JSON.stringify({ error: 'Invalid report data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      console.error('Invalid phone number format:', phoneNumber);
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Rate limiting: Check recent reports sent by this user
    const { data: recentReports } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('operation', 'whatsapp_report_sent')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    if (recentReports && recentReports.length >= 10) {
      console.error('Rate limit exceeded for user:', userId);
      return new Response(
        JSON.stringify({ error: 'Too many report requests. Please wait before sending more.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Format WhatsApp message
    const resolvedPercentage = Math.round((stats.resolved / stats.total) * 100);
    const pendingPercentage = Math.round((stats.pending / stats.total) * 100);
    const inProgressPercentage = Math.round((stats.inProgress / stats.total) * 100);

    const message = `📊 *RELATÓRIO OPERACIONAL - IMPERIA*
${dateStr} ${timeStr}

📈 *MÉTRICAS DO PERÍODO*
• Total de Pendências: ${stats.total}
• ✅ Resolvidas: ${stats.resolved} (${resolvedPercentage}%)
• ⏰ Pendentes: ${stats.pending} (${pendingPercentage}%)
• 🔄 Em Andamento: ${stats.inProgress} (${inProgressPercentage}%)

🔴 *TOP 5 TIPOS DE ERRO*
${stats.errorTypes.slice(0, 5).map((error, index) => 
  `${index + 1}. ${error.label}: ${error.count} casos`
).join('\n')}

📊 *TAXA DE RESOLUÇÃO*
• Período: ${resolvedPercentage}%

---
_Relatório gerado automaticamente_
_Sistema Imperia © 2025_`;

    // Send via Twilio WhatsApp
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', `whatsapp:${phoneNumber}`);
    formData.append('From', `whatsapp:${twilioPhoneNumber}`);
    formData.append('Body', message);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio WhatsApp error:', twilioData);
      
      // Log failed attempt
      await supabase
        .from('audit_logs')
        .insert({
          table_name: 'reports',
          operation: 'whatsapp_report_failed',
          user_id: userId,
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          record_id: null,
          accessed_fields: [phoneNumber]
        });

      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', details: twilioData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Log successful report send
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'reports',
        operation: 'whatsapp_report_sent',
        user_id: userId,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        record_id: null,
        accessed_fields: [phoneNumber, period]
      });

    console.log('WhatsApp report sent successfully to:', phoneNumber);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: twilioData.sid,
        message: 'Report sent successfully via WhatsApp' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-whatsapp-report function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});