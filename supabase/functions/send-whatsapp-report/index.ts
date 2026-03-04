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
  pendencyTypes?: Array<{ type: string; count: number; label: string }>;
  translatorPerformance?: Array<{ name: string; documentos: number }>;
}

interface TechStats {
  total: number;
  pending: number;
  resolved: number;
  inProgress: number;
  errorTypes: Array<{ type: string; count: number; label: string }>;
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function buildReportMessage(reportData: ReportData, dateStr: string, timeStr: string): string {
  const { reportType, period, stats, financialStats } = reportData;

  if (reportType === 'financial' && financialStats) {
    const ltvCacRatio = financialStats.cac > 0 ? (financialStats.ltv / financialStats.cac).toFixed(1) : '0';
    return [
      `📊 *RELATÓRIO FINANCEIRO*`,
      `_${dateStr} às ${timeStr}_`,
      `_Período: ${period}_`,
      ``,
      `💰 *Receita:* ${formatCurrency(financialStats.revenue)}`,
      `💸 *Despesas:* ${formatCurrency(financialStats.expenses)}`,
      `📈 *Lucro:* ${formatCurrency(financialStats.profit)}`,
      `📊 *Margem:* ${financialStats.margin.toFixed(1)}%`,
      ``,
      `*EBITDA:* ${formatCurrency(financialStats.ebitda)}`,
      `*Fluxo de Caixa:* ${formatCurrency(financialStats.cashFlow)}`,
      ``,
      `🏦 *Ativos:* ${formatCurrency(financialStats.assets)}`,
      `📋 *Passivos:* ${formatCurrency(financialStats.liabilities)}`,
      `💎 *Patrimônio:* ${formatCurrency(financialStats.equity)}`,
      ``,
      `*CAC:* ${formatCurrency(financialStats.cac)}`,
      `*LTV:* ${formatCurrency(financialStats.ltv)}`,
      `*Churn:* ${financialStats.churnRate.toFixed(1)}%`,
      `*LTV/CAC:* ${ltvCacRatio}x`,
      ``,
      `_Powered by Impéria Traduções_`,
    ].join('\n');
  }

  if (reportType === 'operational' && stats) {
    const opStats = stats as OperationalStats;
    const topTranslators = opStats.translatorPerformance?.slice(0, 3)
      .map((t, i) => `  ${i + 1}. ${t.name}: ${t.documentos} docs`).join('\n') || '  Nenhum dado disponível';
    const topPendencies = opStats.pendencyTypes?.slice(0, 3)
      .map((p, i) => `  ${i + 1}. ${p.label}: ${p.count}`).join('\n') || '  Nenhuma pendência';

    return [
      `📊 *RELATÓRIO OPERACIONAL*`,
      `_${dateStr} às ${timeStr}_`,
      `_Período: ${period}_`,
      ``,
      `📋 *Total:* ${opStats.total}`,
      `🔄 *Em Andamento:* ${opStats.inProgress}`,
      `✅ *Entregues:* ${opStats.delivered}`,
      `🚨 *Urgências:* ${opStats.urgencies}`,
      `⚠️ *Pendências:* ${opStats.pendencies}`,
      `⏰ *Atrasos:* ${opStats.delays}`,
      `📈 *Taxa de Entrega:* ${opStats.deliveryRate}%`,
      `⏱️ *Tempo Médio:* ${opStats.averageTime}h`,
      ``,
      `*Top Tradutores:*`,
      topTranslators,
      ``,
      `*Top Pendências:*`,
      topPendencies,
      ``,
      `_Powered by Impéria Traduções_`,
    ].join('\n');
  }

  if (reportType === 'tech' && stats) {
    const techStats = stats as TechStats;
    const resolvedPct = techStats.total > 0 ? Math.round((techStats.resolved / techStats.total) * 100) : 0;
    const pendingPct = techStats.total > 0 ? Math.round((techStats.pending / techStats.total) * 100) : 0;
    const inProgressPct = techStats.total > 0 ? Math.round((techStats.inProgress / techStats.total) * 100) : 0;
    const topErrors = techStats.errorTypes.slice(0, 5)
      .map((e, i) => `  ${i + 1}. ${e.label}: ${e.count}`).join('\n');

    return [
      `📊 *RELATÓRIO TÉCNICO*`,
      `_${dateStr} às ${timeStr}_`,
      `_Período: ${period}_`,
      ``,
      `📋 *Total:* ${techStats.total}`,
      `✅ *Resolvidos:* ${techStats.resolved} (${resolvedPct}%)`,
      `⏳ *Pendentes:* ${techStats.pending} (${pendingPct}%)`,
      `🔄 *Em Andamento:* ${techStats.inProgress} (${inProgressPct}%)`,
      ``,
      `*Tipos de Erro:*`,
      topErrors || '  Nenhum erro registrado',
      ``,
      `*Taxa de Resolução:* ${resolvedPct}%`,
      ``,
      `_Powered by Impéria Traduções_`,
    ].join('\n');
  }

  return 'Tipo de relatório inválido';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const UAZAPI_BASE_URL = Deno.env.get('UAZAPI_BASE_URL') as string;
    const UAZAPI_TOKEN = Deno.env.get('UAZAPI_TOKEN') as string;

    if (!UAZAPI_BASE_URL || !UAZAPI_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'uazapiGO credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const reportData: ReportData = await req.json();
    const { phoneNumber, period, reportType, stats, financialStats, userId } = reportData;

    // Validate report data
    if (reportType === 'financial') {
      if (!financialStats || typeof financialStats.revenue !== 'number') {
        return new Response(
          JSON.stringify({ error: 'Invalid financial report data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      if (!stats || typeof stats.total !== 'number') {
        return new Response(
          JSON.stringify({ error: 'Invalid report data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate phone number - accept both +55... and 55... formats
    const sanitizedPhone = phoneNumber.replace(/\D/g, '');
    if (!sanitizedPhone.startsWith('55') || sanitizedPhone.length < 12 || sanitizedPhone.length > 13) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting
    const { data: recentReports } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('operation', 'whatsapp_report_sent')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (recentReports && recentReports.length >= 10) {
      return new Response(
        JSON.stringify({ error: 'Too many report requests. Please wait before sending more.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const messageText = buildReportMessage(reportData, dateStr, timeStr);

    if (messageText === 'Tipo de relatório inválido') {
      return new Response(
        JSON.stringify({ error: 'Invalid report type or missing data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send via uazapiGO
    console.log('Sending WhatsApp report via uazapiGO to:', sanitizedPhone);

    const uazapiResponse = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': UAZAPI_TOKEN,
      },
      body: JSON.stringify({
        number: sanitizedPhone,
        text: messageText,
      }),
    });

    const uazapiData = await uazapiResponse.json();

    if (!uazapiResponse.ok) {
      console.error('uazapiGO error:', uazapiData);

      await supabase.from('audit_logs').insert({
        table_name: 'reports',
        operation: 'whatsapp_report_failed',
        user_id: userId,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        record_id: null,
        accessed_fields: [sanitizedPhone, `error: ${uazapiData.message || 'unknown'}`],
      });

      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp report', details: uazapiData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log success
    await supabase.from('audit_logs').insert({
      table_name: 'reports',
      operation: 'whatsapp_report_sent',
      user_id: userId,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      record_id: null,
      accessed_fields: [sanitizedPhone, period, 'uazapigo'],
    });

    console.log('WhatsApp report sent successfully. MessageId:', uazapiData.messageId);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: uazapiData.messageId,
        message: 'Report sent successfully via WhatsApp',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-whatsapp-report:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
