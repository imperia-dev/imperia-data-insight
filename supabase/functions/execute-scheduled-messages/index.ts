import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledMessage {
  id: string;
  name: string;
  message_template: string;
  schedule_type: string;
  schedule_time: string;
  schedule_days: string[];
  is_active: boolean;
  include_metrics: Record<string, boolean>;
  include_pdf: boolean;
  pdf_period_type: string;
  pdf_customer_filter: string;
  next_execution: string;
  last_executed_at: string | null;
}

interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
}

interface DashboardMetrics {
  attributed: number;
  inProgress: number;
  delivered: number;
  urgencies: number;
  pendencies: number;
  delays: number;
  periodLabel: string;
}

type GeneratedPdf = {
  url: string | null;
  base64: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[execute-scheduled-messages] Checking for pending scheduled messages...');

    // Get all active scheduled messages where next_execution <= now
    const now = new Date().toISOString();
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('scheduled_messages')
      .select('*')
      .eq('is_active', true)
      .lte('next_execution', now);

    if (fetchError) {
      console.error('[execute-scheduled-messages] Error fetching messages:', fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('[execute-scheduled-messages] No pending messages to execute');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending messages',
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[execute-scheduled-messages] Found ${pendingMessages.length} pending messages`);

    const results: { messageId: string; status: string; contactsSent: number; contactsFailed: number }[] = [];

    for (const message of pendingMessages as ScheduledMessage[]) {
      console.log(`[execute-scheduled-messages] Processing message: ${message.name}`);

      // Calculate period based on pdf_period_type
      const periodType = message.pdf_period_type || 'current_month';
      const { startDate, endDate, periodLabel } = getDateRangeForPeriod(periodType);

      // Fetch dashboard metrics for this period
      const metrics = await fetchDashboardMetrics(supabase, startDate, endDate, message.pdf_customer_filter, periodLabel);
      console.log('[execute-scheduled-messages] Fetched metrics:', metrics);

      // Get contacts for this scheduled message
      const { data: contactLinks, error: contactsError } = await supabase
        .from('scheduled_message_contacts')
        .select('whatsapp_contact_id')
        .eq('scheduled_message_id', message.id);

      if (contactsError) {
        console.error(`[execute-scheduled-messages] Error fetching contacts for ${message.id}:`, contactsError);
        continue;
      }

      if (!contactLinks || contactLinks.length === 0) {
        console.log(`[execute-scheduled-messages] No contacts for message ${message.name}`);
        continue;
      }

      // Fetch actual contact details
      const contactIds = contactLinks.map((c) => c.whatsapp_contact_id);
      const { data: contacts, error: contactDetailsError } = await supabase
        .from('whatsapp_contacts')
        .select('id, name, phone')
        .in('id', contactIds);

      if (contactDetailsError || !contacts) {
        console.error(`[execute-scheduled-messages] Error fetching contact details:`, contactDetailsError);
        continue;
      }

      // Build the message with metrics
      const finalMessage = buildMessage(message.message_template, message.include_metrics, metrics);
      console.log(`[execute-scheduled-messages] Built message for ${message.name}`);

      // Generate PDF if enabled
      let pdfUrl: string | null = null;
      let pdfBase64: string | null = null;

      if (message.include_pdf) {
        try {
          console.log(`[execute-scheduled-messages] Generating PDF for ${message.name}`);
          const generated = await generateAndUploadPDF(
            supabase,
            metrics,
            message.id,
            periodLabel,
            message.pdf_customer_filter
          );
          pdfUrl = generated.url;
          pdfBase64 = generated.base64;
          console.log(`[execute-scheduled-messages] PDF generated. url=${pdfUrl ? 'ok' : 'null'} base64=${pdfBase64 ? 'ok' : 'null'}`);
        } catch (pdfError) {
          console.error(`[execute-scheduled-messages] Error generating PDF:`, pdfError);
        }
      }

      let contactsSent = 0;
      let contactsFailed = 0;
      const errors: string[] = [];

      // Send to each contact
      for (const contact of contacts as WhatsAppContact[]) {
        try {
          // Send text message first
          console.log(`[execute-scheduled-messages] Sending text to ${contact.name} (${contact.phone})`);
          const sendResult = await sendZApiMessage(contact.phone, finalMessage);

          if (sendResult.success) {
            console.log(`[execute-scheduled-messages] Text sent successfully to ${contact.name}`);
            contactsSent++;

            // Send PDF if available
            if (pdfBase64 || pdfUrl) {
              const safeFileName = sanitizeFileName(`Relatório Operacional - ${metrics.periodLabel}.pdf`);
              console.log(`[execute-scheduled-messages] Sending PDF to ${contact.name}...`);

              // Wait before sending document (helps avoid rate limiting)
              await new Promise((resolve) => setTimeout(resolve, 3500));

              // Prefer Base64 (data URI) to avoid any external URL fetch issues on WhatsApp/Z-API side
              const documentPayload = pdfBase64
                ? `data:application/pdf;base64,${pdfBase64}`
                : pdfUrl!;

              let pdfResult = await sendZApiDocument(contact.phone, documentPayload, safeFileName, 6);

              // If Base64 fails, try URL as fallback
              if (!pdfResult.success && pdfBase64 && pdfUrl) {
                console.warn(`[execute-scheduled-messages] Base64 failed for ${contact.name}, trying URL...`);
                pdfResult = await sendZApiDocument(contact.phone, pdfUrl, safeFileName, 6);
              }

              if (pdfResult.success) {
                console.log(`[execute-scheduled-messages] PDF sent successfully to ${contact.name}`);
              } else {
                console.error(`[execute-scheduled-messages] Error sending PDF to ${contact.name}:`, pdfResult.error);
              }
            }
          } else {
            console.error(`[execute-scheduled-messages] Error sending text to ${contact.name}:`, sendResult.error);
            contactsFailed++;
            errors.push(`${contact.name}: ${sendResult.error}`);
          }

          // Small delay between messages to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`[execute-scheduled-messages] Error sending to ${contact.name}:`, error);
          contactsFailed++;
          errors.push(`${contact.name}: ${error.message}`);
        }
      }

      // Log the execution
      const logStatus = contactsFailed === 0 ? 'success' : contactsSent === 0 ? 'failed' : 'partial';
      await supabase.from('scheduled_message_logs').insert({
        scheduled_message_id: message.id,
        status: logStatus,
        contacts_sent: contactsSent,
        contacts_failed: contactsFailed,
        message_sent: finalMessage,
        error_message: errors.length > 0 ? errors.join('; ') : null,
        pdf_url: pdfUrl,
        metadata: { metrics, periodLabel },
      });

      // Update last_executed_at and recalculate next_execution
      // The trigger will recalculate next_execution automatically
      await supabase
        .from('scheduled_messages')
        .update({
          last_executed_at: now,
          // Force trigger to recalculate by updating schedule_type to itself
          schedule_type: message.schedule_type,
        })
        .eq('id', message.id);

      results.push({
        messageId: message.id,
        status: logStatus,
        contactsSent,
        contactsFailed,
      });

      console.log(`[execute-scheduled-messages] Completed ${message.name}: ${contactsSent} sent, ${contactsFailed} failed`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[execute-scheduled-messages] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function getDateRangeForPeriod(periodType: string): { startDate: Date; endDate: Date; periodLabel: string } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let periodLabel: string;

  switch (periodType) {
    case 'previous_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      periodLabel = startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      break;
    case 'current_week': {
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = `Semana ${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString(
        'pt-BR',
        { day: '2-digit', month: '2-digit' }
      )}`;
      break;
    }
    case 'previous_week': {
      const prevWeekStart = new Date(now);
      prevWeekStart.setDate(now.getDate() - now.getDay() - 7);
      prevWeekStart.setHours(0, 0, 0, 0);
      startDate = prevWeekStart;
      endDate = new Date(prevWeekStart);
      endDate.setDate(prevWeekStart.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = `Semana ${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString(
        'pt-BR',
        { day: '2-digit', month: '2-digit' }
      )}`;
      break;
    }
    case 'last_7_days':
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      periodLabel = `Últimos 7 dias`;
      break;
    case 'last_30_days':
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      periodLabel = `Últimos 30 dias`;
      break;
    case 'current_month':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      periodLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      break;
  }

  return { startDate, endDate, periodLabel };
}

async function fetchDashboardMetrics(
  supabase: any,
  startDate: Date,
  endDate: Date,
  customerFilter: string,
  periodLabel: string
): Promise<DashboardMetrics> {
  // Build query for orders
  let ordersQuery = supabase
    .from('orders')
    .select('id, order_number, document_count, status_order, is_urgent, attribution_date, deadline, delivered_at, customer')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (customerFilter && customerFilter !== 'all') {
    ordersQuery = ordersQuery.eq('customer', customerFilter);
  }

  const { data: orders, error } = await ordersQuery;

  if (error) {
    console.error('[fetchDashboardMetrics] Error:', error);
    return { attributed: 0, inProgress: 0, delivered: 0, urgencies: 0, pendencies: 0, delays: 0, periodLabel };
  }

  const typedOrders = orders || [];
  const now = new Date();

  // Calculate metrics
  const attributed = typedOrders
    .filter((o: any) => o.attribution_date)
    .reduce((sum: number, o: any) => sum + (o.document_count || 0), 0);

  const inProgress = typedOrders
    .filter((o: any) => o.status_order === 'in_progress')
    .reduce((sum: number, o: any) => sum + (o.document_count || 0), 0);

  const delivered = typedOrders
    .filter((o: any) => o.status_order === 'delivered')
    .reduce((sum: number, o: any) => sum + (o.document_count || 0), 0);

  const urgencies = typedOrders.filter((o: any) => o.is_urgent).reduce((sum: number, o: any) => sum + (o.document_count || 0), 0);

  // Count delays (orders past deadline not delivered)
  const delays = typedOrders
    .filter((o: any) => {
      if (o.status_order === 'delivered') return false;
      if (!o.deadline) return false;
      return new Date(o.deadline) < now;
    })
    .reduce((sum: number, o: any) => sum + (o.document_count || 0), 0);

  // Fetch pendencies
  const pendenciesQuery = supabase
    .from('pendencies')
    .select('id')
    .eq('status', 'open')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const { data: pendenciesData } = await pendenciesQuery;
  const pendencies = pendenciesData?.length || 0;

  return { attributed, inProgress, delivered, urgencies, pendencies, delays, periodLabel };
}

function buildMessage(template: string, includeMetrics: Record<string, boolean>, metrics: DashboardMetrics): string {
  const now = new Date();

  let message = `📊 *RELATÓRIO OPERACIONAL*\n_${metrics.periodLabel}_\n\n`;

  if (includeMetrics.attributed) {
    message += `• Documentos Atribuídos: ${metrics.attributed}\n`;
  }
  if (includeMetrics.inProgress) {
    message += `• Em Andamento: ${metrics.inProgress}\n`;
  }
  if (includeMetrics.delivered) {
    message += `• Entregues: ${metrics.delivered}\n`;
  }
  if (includeMetrics.urgencies) {
    message += `• Urgências: ${metrics.urgencies}\n`;
  }
  if (includeMetrics.pendencies) {
    message += `• Pendências: ${metrics.pendencies}\n`;
  }
  if (includeMetrics.delays) {
    message += `• Atrasos: ${metrics.delays}\n`;
  }

  // Add custom template content if any
  if (template && template.trim()) {
    message += `\n${template}\n`;
  }

  message += `\n_Enviado automaticamente_\n_${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })}_`;

  return message;
}

async function generateAndUploadPDF(
  supabase: any,
  metrics: DashboardMetrics,
  messageId: string,
  periodLabel: string,
  customerFilter: string
): Promise<GeneratedPdf> {
  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Header
  page.drawText('RELATÓRIO OPERACIONAL', {
    x: 50,
    y: height - 50,
    size: 24,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.3),
  });

  // Period
  page.drawText(periodLabel, {
    x: 50,
    y: height - 80,
    size: 14,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Customer filter
  if (customerFilter && customerFilter !== 'all') {
    page.drawText(`Cliente: ${customerFilter}`, {
      x: 50,
      y: height - 100,
      size: 12,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  // Separator line
  page.drawLine({
    start: { x: 50, y: height - 120 },
    end: { x: 545, y: height - 120 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  // Metrics
  const metricsData = [
    { label: 'Documentos Atribuídos', value: metrics.attributed },
    { label: 'Em Andamento', value: metrics.inProgress },
    { label: 'Entregues', value: metrics.delivered },
    { label: 'Urgências', value: metrics.urgencies },
    { label: 'Pendências', value: metrics.pendencies },
    { label: 'Atrasos', value: metrics.delays },
  ];

  let yPosition = height - 160;

  for (const metric of metricsData) {
    // Label
    page.drawText(metric.label, {
      x: 50,
      y: yPosition,
      size: 14,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Value
    page.drawText(String(metric.value), {
      x: 450,
      y: yPosition,
      size: 14,
      font: fontBold,
      color: rgb(0.1, 0.3, 0.6),
    });

    yPosition -= 35;
  }

  // Footer
  const now = new Date();
  page.drawText(`Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`, {
    x: 50,
    y: 50,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Serialize PDF
  const pdfBytes = await pdfDoc.save();
  const pdfBase64 = uint8ToBase64(pdfBytes);

  // Upload to Supabase Storage (best-effort)
  let publicUrl: string | null = null;
  try {
    const fileName = `scheduled-reports/${messageId}/${Date.now()}-relatorio.pdf`;

    const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

    if (uploadError) {
      console.error('[generateAndUploadPDF] Upload error:', uploadError);
    } else {
      const {
        data: { publicUrl: url },
      } = supabase.storage.from('documents').getPublicUrl(fileName);

      publicUrl = url;
    }
  } catch (e) {
    console.error('[generateAndUploadPDF] Upload exception:', e);
  }

  return { url: publicUrl, base64: pdfBase64 };
}

async function sendZApiMessage(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
  const token = Deno.env.get('ZAPI_TOKEN');
  const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');

  if (!instanceId || !token) {
    return { success: false, error: 'Z-API credentials not configured' };
  }

  // Clean phone number
  const cleanPhone = phone.replace(/\D/g, '');

  try {
    const response = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(clientToken && { 'Client-Token': clientToken }),
      },
      body: JSON.stringify({
        phone: cleanPhone,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendZApiDocument(
  phone: string,
  document: string,
  fileName: string,
  delayMessageSeconds: number
): Promise<{ success: boolean; error?: string }> {
  const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
  const token = Deno.env.get('ZAPI_TOKEN');
  const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');

  if (!instanceId || !token) {
    console.error('[sendZApiDocument] Z-API credentials not configured');
    return { success: false, error: 'Z-API credentials not configured' };
  }

  // Clean phone number
  const cleanPhone = phone.replace(/\D/g, '');

  console.log(`[sendZApiDocument] Sending document to ${cleanPhone}`);
  console.log(`[sendZApiDocument] File name: ${fileName}`);

  try {
    // Use send-document/pdf endpoint for PDF files
    const endpoint = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-document/pdf`;

    const requestBody = {
      phone: cleanPhone,
      document,
      fileName,
      delayMessage: Math.max(1, Math.min(15, delayMessageSeconds)),
    };

    console.log(`[sendZApiDocument] Request URL: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(clientToken && { 'Client-Token': clientToken }),
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log(`[sendZApiDocument] Response status: ${response.status}`);
    console.log(`[sendZApiDocument] Response body: ${responseText}`);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${responseText}` };
    }

    return { success: true };
  } catch (error) {
    console.error(`[sendZApiDocument] Exception:`, error);
    return { success: false, error: error.message };
  }
}

function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.\-()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uint8ToBase64(bytes: Uint8Array) {
  // Convert Uint8Array to binary string in chunks to avoid call stack limits
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    binary += String.fromCharCode(...(bytes.subarray(i, i + chunkSize) as any));
  }
  return btoa(binary);
}
