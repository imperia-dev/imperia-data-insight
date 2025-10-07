import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProviderData {
  reviewer_id: string;
  reviewer_name: string;
  reviewer_email: string;
  orders: any[];
  totalAmount: number;
  orderCount: number;
  documentCount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { competence, preview = false } = await req.json();

    if (!competence) {
      return new Response(
        JSON.stringify({ error: 'Competence month is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const competenceDate = new Date(competence);
    const startDate = new Date(competenceDate.getFullYear(), competenceDate.getMonth(), 1);
    const endDate = new Date(competenceDate.getFullYear(), competenceDate.getMonth() + 1, 0);

    console.log('Fetching translation orders for competence:', competence);

    // Fetch completed orders without protocol in the competence month
    const { data: orders, error: ordersError } = await supabase
      .from('translation_orders')
      .select('*')
      .eq('pedido_status', 'entregue')
      .is('reviewer_protocol_id', null)
      .gte('data_entrega', startDate.toISOString())
      .lte('data_entrega', endDate.toISOString());

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No completed orders found for this competence month',
          protocols: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${orders.length} orders to process`);

    // Group orders by reviewer
    const providerMap = new Map<string, ProviderData>();

    for (const order of orders) {
      if (!order.review_id) continue;

      const reviewerId = order.review_id;
      const reviewerName = order.review_nome || 'Unknown';
      const reviewerEmail = order.review_email || '';
      
      if (!providerMap.has(reviewerId)) {
        providerMap.set(reviewerId, {
          reviewer_id: reviewerId,
          reviewer_name: reviewerName,
          reviewer_email: reviewerEmail,
          orders: [],
          totalAmount: 0,
          orderCount: 0,
          documentCount: 0,
        });
      }

      const providerData = providerMap.get(reviewerId)!;
      providerData.orders.push(order);
      providerData.orderCount++;
      providerData.documentCount += order.quantidade_documentos || 0;
      // R$ 2.00 per document
      providerData.totalAmount += (order.quantidade_documentos || 0) * 2.00;
    }

    const providers = Array.from(providerMap.values());

    // If preview mode, return data without creating protocols
    if (preview) {
      return new Response(
        JSON.stringify({
          preview: true,
          competence,
          reviewerCount: providers.length,
          totalOrders: orders.length,
          totalDocuments: providers.reduce((sum, p) => sum + p.documentCount, 0),
          totalAmount: providers.reduce((sum, p) => sum + p.totalAmount, 0),
          reviewers: providers.map(p => ({
            reviewer_id: p.reviewer_id,
            reviewer_name: p.reviewer_name,
            reviewer_email: p.reviewer_email,
            orderCount: p.orderCount,
            documentCount: p.documentCount,
            totalAmount: p.totalAmount,
          })),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create protocols
    const createdProtocols = [];
    const skippedReviewers = [];

    for (const provider of providers) {
      // Check if protocol already exists for this reviewer and competence
      const { data: existingProtocol } = await supabase
        .from('reviewer_protocols')
        .select('id, protocol_number')
        .eq('reviewer_id', provider.reviewer_id)
        .eq('competence_month', competence)
        .single();

      if (existingProtocol) {
        console.log(`Protocol already exists for reviewer ${provider.reviewer_name}`);
        skippedReviewers.push({
          reviewer_name: provider.reviewer_name,
          protocol_number: existingProtocol.protocol_number,
        });
        continue;
      }

      // Generate protocol number
      const { data: protocolNumber, error: rpcError } = await supabase.rpc(
        'generate_protocol_number',
        {
          p_type: 'reviewer',
          p_competence_month: competence,
          p_supplier_name: provider.reviewer_name,
        }
      );

      if (rpcError) {
        console.error('Error generating protocol number:', rpcError);
        throw rpcError;
      }

      console.log(`Generated protocol number: ${protocolNumber} for ${provider.reviewer_name}`);

      // Create protocol
      const { data: newProtocol, error: insertError } = await supabase
        .from('reviewer_protocols')
        .insert({
          protocol_number: protocolNumber,
          competence_month: competence,
          reviewer_id: provider.reviewer_id,
          reviewer_name: provider.reviewer_name,
          reviewer_email: provider.reviewer_email,
          total_amount: provider.totalAmount,
          order_count: provider.orderCount,
          document_count: provider.documentCount,
          orders_data: provider.orders,
          status: 'draft',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating protocol:', insertError);
        throw insertError;
      }

      createdProtocols.push(newProtocol);

      // Update orders with protocol_id
      const orderIds = provider.orders.map(o => o.id);
      const { error: updateError } = await supabase
        .from('translation_orders')
        .update({ reviewer_protocol_id: newProtocol.id })
        .in('id', orderIds);

      if (updateError) {
        console.error('Error updating orders:', updateError);
        throw updateError;
      }

      console.log(`Updated ${orderIds.length} orders with protocol ${newProtocol.protocol_number}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        competence,
        protocolsCreated: createdProtocols.length,
        protocolsSkipped: skippedReviewers.length,
        protocols: createdProtocols,
        skipped: skippedReviewers,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-reviewer-protocols:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});