import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WhatsApp Template Configuration
const TEMPLATE_ID = 'HX992e37427115e30c21d520eef5f959ba'; // teste_report_imperia template

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

    // Prepare template variables based on report type
    let templateVariables: Record<string, string> = {};

    if (reportType === 'financial' && financialStats) {
      const formatValue = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(value);
      };

      templateVariables = {
        '1': 'RELATÓRIO FINANCEIRO',
        '2': dateStr,
        '3': timeStr,
        '4': period,
        '5': formatValue(financialStats.revenue),
        '6': formatValue(financialStats.expenses),
        '7': formatValue(financialStats.profit),
        '8': `${financialStats.margin.toFixed(1)}%`,
        '9': formatValue(financialStats.ebitda),
        '10': formatValue(financialStats.assets),
        '11': formatValue(financialStats.liabilities),
        '12': formatValue(financialStats.equity),
        '13': formatValue(financialStats.cashFlow),
        '14': formatValue(financialStats.cac),
        '15': formatValue(financialStats.ltv),
        '16': `${financialStats.churnRate.toFixed(1)}%`,
        '17': financialStats.cac > 0 ? `${(financialStats.ltv / financialStats.cac).toFixed(1)}x` : '0x',
      };
    } else if (reportType === 'operational' && stats) {
      const opStats = stats as OperationalStats;
      
      // Top translators and pendency types as string lists
      const topTranslators = opStats.translatorPerformance && opStats.translatorPerformance.length > 0 
        ? opStats.translatorPerformance.slice(0, 3).map((t, i) => 
            `${i + 1}. ${t.name}: ${t.documentos} docs`
          ).join(' | ')
        : 'Nenhum dado disponível';
      
      const topPendencies = opStats.pendencyTypes && opStats.pendencyTypes.length > 0
        ? opStats.pendencyTypes.slice(0, 3).map((p, i) => 
            `${i + 1}. ${p.label}: ${p.count}`
          ).join(' | ')
        : 'Nenhuma pendência';

      templateVariables = {
        '1': 'RELATÓRIO OPERACIONAL',
        '2': dateStr,
        '3': timeStr,
        '4': period,
        '5': String(opStats.total),
        '6': String(opStats.inProgress),
        '7': String(opStats.delivered),
        '8': String(opStats.urgencies),
        '9': String(opStats.pendencies),
        '10': String(opStats.delays),
        '11': `${opStats.deliveryRate}%`,
        '12': `${opStats.averageTime}h`,
        '13': topTranslators,
        '14': topPendencies,
        '15': '', // Reserved for future use
        '16': '', // Reserved for future use
        '17': '', // Reserved for future use
      };
    } else if (reportType === 'tech' && stats) {
      const techStats = stats as TechStats;
      const resolvedPercentage = Math.round((techStats.resolved / techStats.total) * 100);
      const pendingPercentage = Math.round((techStats.pending / techStats.total) * 100);
      const inProgressPercentage = Math.round((techStats.inProgress / techStats.total) * 100);

      // Top error types as string list
      const topErrors = techStats.errorTypes.slice(0, 5).map((error, index) => 
        `${index + 1}. ${error.label}: ${error.count}`
      ).join(' | ');

      templateVariables = {
        '1': 'RELATÓRIO TÉCNICO',
        '2': dateStr,
        '3': timeStr,
        '4': period,
        '5': String(techStats.total),
        '6': String(techStats.resolved),
        '7': `${resolvedPercentage}%`,
        '8': String(techStats.pending),
        '9': `${pendingPercentage}%`,
        '10': String(techStats.inProgress),
        '11': `${inProgressPercentage}%`,
        '12': topErrors,
        '13': `${resolvedPercentage}%`, // Taxa de resolução
        '14': '', // Reserved for future use
        '15': '', // Reserved for future use
        '16': '', // Reserved for future use
        '17': '', // Reserved for future use
      };
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

    console.log('Sending WhatsApp message using template:', TEMPLATE_ID);
    console.log('Template variables:', templateVariables);

    // Send via Twilio WhatsApp using the template
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', `whatsapp:${phoneNumber}`);
    formData.append('From', `whatsapp:${twilioPhoneNumber}`);
    formData.append('ContentSid', TEMPLATE_ID); // Use template instead of Body
    formData.append('ContentVariables', JSON.stringify(templateVariables)); // Add template variables

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
      console.error('Template ID used:', TEMPLATE_ID);
      console.error('Template variables:', JSON.stringify(templateVariables));
      
      // Check for specific error codes
      let errorMessage = 'Failed to send WhatsApp message';
      if (twilioData.code === 63007) {
        errorMessage = 'WhatsApp number not found. Ensure the recipient has joined the sandbox or the number is registered.';
      } else if (twilioData.code === 63018) {
        errorMessage = 'Template not found or not approved. Please verify the template configuration.';
      } else if (twilioData.code === 63016) {
        errorMessage = 'Template variables mismatch. Please check the template variable format.';
      }
      
      // Log failed attempt with more details
      await supabase
        .from('audit_logs')
        .insert({
          table_name: 'reports',
          operation: 'whatsapp_report_failed',
          user_id: userId,
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          record_id: null,
          accessed_fields: [phoneNumber, `error: ${twilioData.code || 'unknown'}`]
        });

      return new Response(
        JSON.stringify({ 
          error: errorMessage, 
          details: twilioData,
          templateId: TEMPLATE_ID 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Log successful report send with template info
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'reports',
        operation: 'whatsapp_report_sent',
        user_id: userId,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        record_id: null,
        accessed_fields: [phoneNumber, period, `template: ${TEMPLATE_ID}`]
      });

    console.log('WhatsApp report sent successfully to:', phoneNumber);
    console.log('Template ID:', TEMPLATE_ID);
    console.log('Message SID:', twilioData.sid);

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