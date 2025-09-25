import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OperationalStats {
  total: number;
  inProgress: number;
  delivered: number;
  urgencies: number;
  pendencies: number;
  delays: number;
  averageTime: string;
  deliveryRate: string;
  pendencyTypes?: Array<{
    type: string;
    count: number;
    label: string;
  }>;
  translatorPerformance?: Array<{
    name: string;
    documentos: number;
  }>;
}

interface TechStats {
  total: number;
  pending: number;
  resolved: number;
  inProgress: number;
  errorTypes: Array<{
    type: string;
    count: number;
    label: string;
  }>;
}

interface FinancialStats {
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;
  ebitda: number;
  cashFlow: number;
  assets: number;
  liabilities: number;
  equity: number;
  cac: number;
  ltv: number;
  churnRate: number;
}

interface ReportData {
  phoneNumber: string;
  period: string;
  reportType: 'operational' | 'tech' | 'financial';
  stats?: OperationalStats | TechStats;
  financialStats?: FinancialStats;
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
    const { phoneNumber, period, reportType, stats, financialStats, userId, userName } = reportData;

    // Validate report data based on type
    if (reportType === 'financial') {
      if (!financialStats || typeof financialStats.revenue !== 'number') {
        console.error('Invalid financial report data structure');
        return new Response(
          JSON.stringify({ error: 'Invalid financial report data' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      if (!stats || typeof stats.total !== 'number') {
        console.error('Invalid report data structure');
        return new Response(
          JSON.stringify({ error: 'Invalid report data' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
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

    let message = '';

    // Format WhatsApp message based on report type
    if (reportType === 'financial' && financialStats) {
      const formatValue = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      };

      message = `💰 *RELATÓRIO FINANCEIRO - IMPERIA*
${dateStr} ${timeStr}
Período: ${period}

📊 *DRE - DEMONSTRAÇÃO DE RESULTADOS*
• Receita: ${formatValue(financialStats.revenue)}
• Despesas: ${formatValue(financialStats.expenses)}
• Lucro: ${formatValue(financialStats.profit)}
• Margem: ${financialStats.margin.toFixed(1)}%
• EBITDA: ${formatValue(financialStats.ebitda)}

💼 *BALANÇO PATRIMONIAL*
• Ativos: ${formatValue(financialStats.assets)}
• Passivos: ${formatValue(financialStats.liabilities)}
• Patrimônio Líquido: ${formatValue(financialStats.equity)}

📈 *FLUXO DE CAIXA*
• Saldo: ${formatValue(financialStats.cashFlow)}

🎯 *UNIT ECONOMICS*
• CAC: ${formatValue(financialStats.cac)}
• LTV: ${formatValue(financialStats.ltv)}
• Churn Rate: ${financialStats.churnRate.toFixed(1)}%
• LTV/CAC: ${financialStats.cac > 0 ? (financialStats.ltv / financialStats.cac).toFixed(1) : '0'}x

---
_Relatório gerado automaticamente_
_Sistema Imperia © 2025_`;
    } else if (reportType === 'operational' && stats) {
      const opStats = stats as OperationalStats;
      
      message = `📊 *RELATÓRIO OPERACIONAL - IMPERIA*
${dateStr} ${timeStr}
Período: ${period}

📈 *MÉTRICAS OPERACIONAIS*
• Total de Documentos: ${opStats.total}
• Em Andamento: ${opStats.inProgress}
• Entregues: ${opStats.delivered}
• Urgências: ${opStats.urgencies}
• Pendências: ${opStats.pendencies}
• Atrasos: ${opStats.delays}

⏱ *INDICADORES DE PERFORMANCE*
• Taxa de Entrega: ${opStats.deliveryRate}%
• Tempo Médio: ${opStats.averageTime}h por documento

${opStats.translatorPerformance && opStats.translatorPerformance.length > 0 ? `
👥 *TOP TRADUTORES*
${opStats.translatorPerformance.slice(0, 5).map((t, i) => 
  `${i + 1}. ${t.name}: ${t.documentos} documentos`
).join('\n')}` : ''}

${opStats.pendencyTypes && opStats.pendencyTypes.length > 0 ? `
🔴 *PRINCIPAIS TIPOS DE PENDÊNCIA*
${opStats.pendencyTypes.slice(0, 5).map((p, i) => 
  `${i + 1}. ${p.label}: ${p.count} casos`
).join('\n')}` : ''}

---
_Relatório gerado automaticamente_
_Sistema Imperia © 2025_`;
    } else if (reportType === 'tech' && stats) {
      const techStats = stats as TechStats;
      const resolvedPercentage = Math.round((techStats.resolved / techStats.total) * 100);
      const pendingPercentage = Math.round((techStats.pending / techStats.total) * 100);
      const inProgressPercentage = Math.round((techStats.inProgress / techStats.total) * 100);

      message = `🔧 *RELATÓRIO TÉCNICO - IMPERIA*
${dateStr} ${timeStr}
Período: ${period}

📈 *MÉTRICAS DO PERÍODO*
• Total de Pendências: ${techStats.total}
• ✅ Resolvidas: ${techStats.resolved} (${resolvedPercentage}%)
• ⏰ Pendentes: ${techStats.pending} (${pendingPercentage}%)
• 🔄 Em Andamento: ${techStats.inProgress} (${inProgressPercentage}%)

🔴 *TOP 5 TIPOS DE ERRO*
${techStats.errorTypes.slice(0, 5).map((error, index) => 
  `${index + 1}. ${error.label}: ${error.count} casos`
).join('\n')}

📊 *TAXA DE RESOLUÇÃO*
• Período: ${resolvedPercentage}%

---
_Relatório gerado automaticamente_
_Sistema Imperia © 2025_`;
    } else {
      console.error('Invalid report type or missing data');
      return new Response(
        JSON.stringify({ error: 'Invalid report type or missing data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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