import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
}

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
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending messages',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`[execute-scheduled-messages] Found ${pendingMessages.length} pending messages`);
    
    // Fetch current dashboard metrics
    const metrics = await fetchDashboardMetrics(supabase);
    console.log('[execute-scheduled-messages] Fetched metrics:', metrics);
    
    const results: { messageId: string; status: string; contactsSent: number; contactsFailed: number }[] = [];
    
    for (const message of pendingMessages as ScheduledMessage[]) {
      console.log(`[execute-scheduled-messages] Processing message: ${message.name}`);
      
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
      const contactIds = contactLinks.map(c => c.whatsapp_contact_id);
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
      
      let contactsSent = 0;
      let contactsFailed = 0;
      const errors: string[] = [];
      
      // Send to each contact
      for (const contact of contacts as WhatsAppContact[]) {
        try {
          const sendResult = await sendZApiMessage(contact.phone, finalMessage);
          if (sendResult.success) {
            contactsSent++;
          } else {
            contactsFailed++;
            errors.push(`${contact.name}: ${sendResult.error}`);
          }
          // Small delay between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`[execute-scheduled-messages] Error sending to ${contact.name}:`, error);
          contactsFailed++;
          errors.push(`${contact.name}: ${error.message}`);
        }
      }
      
      // Log the execution
      const logStatus = contactsFailed === 0 ? 'success' : (contactsSent === 0 ? 'failed' : 'partial');
      await supabase.from('scheduled_message_logs').insert({
        scheduled_message_id: message.id,
        status: logStatus,
        contacts_sent: contactsSent,
        contacts_failed: contactsFailed,
        message_sent: finalMessage,
        error_message: errors.length > 0 ? errors.join('; ') : null,
        metadata: { metrics }
      });
      
      // Update last_executed_at and recalculate next_execution
      // The trigger will recalculate next_execution automatically
      await supabase
        .from('scheduled_messages')
        .update({ 
          last_executed_at: now,
          // Force trigger to recalculate by updating schedule_type to itself
          schedule_type: message.schedule_type
        })
        .eq('id', message.id);
      
      results.push({
        messageId: message.id,
        status: logStatus,
        contactsSent,
        contactsFailed
      });
      
      console.log(`[execute-scheduled-messages] Completed ${message.name}: ${contactsSent} sent, ${contactsFailed} failed`);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('[execute-scheduled-messages] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchDashboardMetrics(supabase: any): Promise<DashboardMetrics> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  // Fetch orders for the current month
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, document_count, status_order, is_urgent, attribution_date, deadline, delivered_at')
    .gte('created_at', startOfMonth.toISOString())
    .lte('created_at', endOfMonth.toISOString());
  
  if (error) {
    console.error('[fetchDashboardMetrics] Error:', error);
    return { attributed: 0, inProgress: 0, delivered: 0, urgencies: 0, pendencies: 0, delays: 0 };
  }
  
  const typedOrders = orders || [];
  
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
  
  const urgencies = typedOrders
    .filter((o: any) => o.is_urgent)
    .reduce((sum: number, o: any) => sum + (o.document_count || 0), 0);
  
  // Count delays (orders past deadline not delivered)
  const delays = typedOrders
    .filter((o: any) => {
      if (o.status_order === 'delivered') return false;
      if (!o.deadline) return false;
      return new Date(o.deadline) < now;
    })
    .reduce((sum: number, o: any) => sum + (o.document_count || 0), 0);
  
  // Fetch pendencies
  const { data: pendenciesData } = await supabase
    .from('pendencies')
    .select('id')
    .eq('status', 'open')
    .gte('created_at', startOfMonth.toISOString())
    .lte('created_at', endOfMonth.toISOString());
  
  const pendencies = pendenciesData?.length || 0;
  
  return { attributed, inProgress, delivered, urgencies, pendencies, delays };
}

function buildMessage(
  template: string, 
  includeMetrics: Record<string, boolean>, 
  metrics: DashboardMetrics
): string {
  const now = new Date();
  const monthYear = now.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
  
  let message = `📊 *RELATÓRIO OPERACIONAL - ${monthYear}*\n\n`;
  
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
  
  message += `\n_Enviado automaticamente_\n_${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}_`;
  
  return message;
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
    const response = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clientToken && { 'Client-Token': clientToken })
        },
        body: JSON.stringify({
          phone: cleanPhone,
          message: message
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
