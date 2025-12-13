import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeInput, sanitizeEmail } from "../_shared/sanitization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('TRANSLATION_WEBHOOK_SECRET');

    // Verify webhook secret
    const requestSecret = req.headers.get('x-webhook-secret');
    if (webhookSecret && requestSecret !== webhookSecret) {
      console.error('Invalid webhook secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body = await req.json();
    console.log('Received webhook data:', body);

    // Validate required fields
    const requiredFields = ['pedido_id', 'pedido_status', 'pedido_data', 'valor_pedido', 'valor_pago', 'status_pagamento'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          missing: missingFields 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare data for insertion (with sanitization)
    const translationOrder = {
      pedido_id: sanitizeInput(body.pedido_id),
      pedido_status: sanitizeInput(body.pedido_status),
      pedido_data: body.pedido_data,
      valor_pedido: parseFloat(body.valor_pedido) || 0,
      valor_pago: parseFloat(body.valor_pago) || 0,
      status_pagamento: sanitizeInput(body.status_pagamento),
      review_id: body.review_id || null,
      review_name: sanitizeInput(body.review_name) || null,
      review_email: sanitizeEmail(body.review_email) || null,
      quantidade_documentos: parseInt(body.quantidade_documentos) || 0,
      valor_total_pago_servico: body.valor_total_pago_servico ? parseFloat(body.valor_total_pago_servico) : null,
      sync_status: 'success',
      metadata: body.metadata || null,
      updated_at: new Date().toISOString()
    };

    console.log('Prepared data for upsert:', translationOrder);

    // Upsert the translation order
    const { data, error } = await supabase
      .from('translation_orders')
      .upsert(translationOrder, {
        onConflict: 'pedido_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting translation order:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save translation order',
          details: error.message 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Translation order saved successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Translation order saved successfully',
        data: data
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});