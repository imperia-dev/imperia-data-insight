import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProviderData {
  supplier_id: string;
  provider_name: string;
  provider_email: string;
  expense_count: number;
  total_amount: number;
  expenses_data: any[];
  drive_docs: number;
  diagramming_docs: number;
  diagramming_pages: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { competence, preview = false } = await req.json();

    if (!competence) {
      throw new Error('Competence month is required (format: YYYY-MM)');
    }

    console.log(`Processing protocols for competence: ${competence}, preview: ${preview}`);

    // Calculate date range for the competence month (00:00:00 to 23:59:59)
    const year = parseInt(competence.split('-')[0]);
    const month = parseInt(competence.split('-')[1]);
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${competence}-01T00:00:00`;
    const endDate = `${competence}-${String(lastDay).padStart(2, '0')}T23:59:59`;

    // Query delivered orders from service providers in this competence month
    // Only include orders that haven't been assigned to a protocol yet
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        assigned_to,
        document_count,
        delivered_at,
        service_type,
        pages_count_diagramming,
        custom_value_diagramming,
        order_number,
        drive_document_count,
        diagramming_document_count,
        diagramming_pages_total,
        drive_value,
        diagramming_value,
        profiles!orders_assigned_to_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('status_order', 'delivered')
      .gte('delivered_at', startDate)
      .lte('delivered_at', endDate)
      .not('assigned_to', 'is', null)
      .not('document_count', 'is', null)
      .gt('document_count', 0)
      .is('service_provider_protocol_id', null);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    console.log(`Found ${orders?.length || 0} delivered orders from service providers`);

    // Group orders by provider
    const providersMap = new Map<string, ProviderData>();
    const VALUE_PER_DOCUMENT = 1.30; // R$ 1,30 por documento (mesmo valor da página Produtividade)
    
    orders?.forEach((order: any) => {
      const supplierId = order.assigned_to;
      const profile = order.profiles;
      
      if (!profile) {
        console.warn(`No profile found for order ${order.id}, assigned_to: ${supplierId}`);
        return;
      }

      let orderValue: number;
      let orderDriveDocs = 0;
      let orderDiagrammingDocs = 0;
      let orderDiagrammingPages = 0;
      
      // Usar novos campos separados se disponíveis
      if (order.drive_value !== null || order.diagramming_value !== null) {
        // NOVO SISTEMA: Usar campos separados
        // Priority: custom_value_diagramming > diagramming_value (same as Productivity page)
        const diagrammingValue = order.custom_value_diagramming || order.diagramming_value || 0;
        orderValue = (order.drive_value || 0) + diagrammingValue;
        orderDriveDocs = order.drive_document_count || 0;
        orderDiagrammingDocs = order.diagramming_document_count || 0;
        orderDiagrammingPages = order.diagramming_pages_total || 0;
        
        console.log(`Order ${order.order_number} (NEW): Drive=${orderDriveDocs} docs, Diag=${orderDiagrammingDocs} docs/${orderDiagrammingPages} pages, Value=R$ ${orderValue.toFixed(2)}`);
        
      } else {
        // SISTEMA LEGADO: Calcular baseado em campos antigos
        if (order.service_type === 'Diagramação') {
          if (order.custom_value_diagramming !== null) {
            orderValue = order.custom_value_diagramming;
            orderDiagrammingDocs = order.document_count || 0;
            orderDiagrammingPages = order.pages_count_diagramming || 0;
          } else {
            // Fallback extremo para pedidos muito antigos
            orderValue = (order.document_count || 0) * VALUE_PER_DOCUMENT;
            orderDiagrammingDocs = order.document_count || 0;
          }
          console.log(`Order ${order.order_number} (LEGACY Diag): ${orderDiagrammingPages} pages, Value=R$ ${orderValue.toFixed(2)}`);
          
        } else if (order.service_type === 'Drive + Diagramação') {
          orderValue = order.custom_value_diagramming || 0;
          orderDriveDocs = 0; // Não podemos separar no sistema legado
          orderDiagrammingDocs = order.document_count || 0;
          orderDiagrammingPages = order.pages_count_diagramming || 0;
          console.log(`Order ${order.order_number} (LEGACY Mixed): Value=R$ ${orderValue.toFixed(2)}`);
          
        } else {
          // Drive padrão
          orderValue = (order.document_count || 0) * VALUE_PER_DOCUMENT;
          orderDriveDocs = order.document_count || 0;
          console.log(`Order ${order.order_number} (LEGACY Drive): ${orderDriveDocs} docs, Value=R$ ${orderValue.toFixed(2)}`);
        }
      }

      if (!providersMap.has(supplierId)) {
        providersMap.set(supplierId, {
          supplier_id: supplierId,
          provider_name: profile.full_name || 'Prestador',
          provider_email: profile.email || '',
          expense_count: 0,
          total_amount: 0,
          expenses_data: [],
          drive_docs: 0,
          diagramming_docs: 0,
          diagramming_pages: 0,
        });
      }

      const provider = providersMap.get(supplierId)!;
      provider.expense_count += 1;
      provider.total_amount += orderValue;
      provider.drive_docs += orderDriveDocs;
      provider.diagramming_docs += orderDiagrammingDocs;
      provider.diagramming_pages += orderDiagrammingPages;
      
      provider.expenses_data.push({
        expense_id: order.id,
        description: order.service_type === 'Diagramação' && orderDiagrammingPages > 0
          ? `Pedido ${order.order_number} - Diagramação (${orderDiagrammingPages} páginas)`
          : order.service_type === 'Drive + Diagramação'
          ? `Pedido ${order.order_number} - Drive + Diagramação (${orderDriveDocs} docs drive, ${orderDiagrammingPages} páginas diag)`
          : `Pedido ${order.order_number}`,
        amount: orderValue,
        document_count: order.document_count,
        drive_docs: orderDriveDocs,
        diagramming_docs: orderDiagrammingDocs,
        diagramming_pages: orderDiagrammingPages,
        service_type: order.service_type,
        delivered_at: order.delivered_at,
      });
    });

    const providers = Array.from(providersMap.values());
    console.log(`Grouped into ${providers.length} providers`);

    // If preview mode, just return the providers list
    if (preview) {
      return new Response(
        JSON.stringify({ providers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate protocols
    let created = 0;
    let skipped = 0;

    for (const provider of providers) {
      // Check if protocol already exists
      const { data: existing } = await supabase
        .from('service_provider_protocols')
        .select('id')
        .eq('supplier_id', provider.supplier_id)
        .gte('competence_month', startDate)
        .lte('competence_month', endDate)
        .single();

      if (existing) {
        console.log(`Protocol already exists for supplier ${provider.supplier_id}`);
        skipped += 1;
        continue;
      }

      // Generate protocol number using database function
      // Use only the date part (YYYY-MM-DD) for the protocol number generation
      const competenceDate = `${competence}-01`;
      const { data: protocolNumber, error: numberError } = await supabase
        .rpc('generate_protocol_number', {
          p_type: 'service_provider',
          p_competence_month: competenceDate,
          p_supplier_name: provider.provider_name,
        });

      if (numberError) {
        console.error('Error generating protocol number:', numberError);
        throw numberError;
      }

      // Create protocol
      const { data: newProtocol, error: insertError } = await supabase
        .from('service_provider_protocols')
        .insert({
          protocol_number: protocolNumber,
          competence_month: competenceDate,
          supplier_id: provider.supplier_id,
          provider_name: provider.provider_name,
          provider_email: provider.provider_email,
          total_amount: provider.total_amount,
          expense_count: provider.expense_count,
          expenses_data: provider.expenses_data,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting protocol:', insertError);
        throw insertError;
      }

      // Update all orders in this protocol to link them
      const orderIds = provider.expenses_data.map((exp: any) => exp.expense_id);
      const { error: updateError } = await supabase
        .from('orders')
        .update({ service_provider_protocol_id: newProtocol.id })
        .in('id', orderIds);

      if (updateError) {
        console.error('Error updating orders with protocol:', updateError);
        // Don't throw - protocol was created successfully
      }

      console.log(`Created protocol ${protocolNumber} for ${provider.provider_name} with ${orderIds.length} orders`);
      created += 1;
    }

    console.log(`Completed: ${created} created, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ 
        success: true,
        created,
        skipped,
        message: `${created} protocolo(s) gerado(s), ${skipped} já existente(s)`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-provider-protocols:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
