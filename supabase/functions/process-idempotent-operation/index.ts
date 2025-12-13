import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';
import { sanitizeInput } from '../_shared/sanitization.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

/**
 * Process Idempotent Operation Edge Function
 * 
 * Prevents duplicate operations by using idempotency keys.
 * Usage:
 * - Send Idempotency-Key header with your request
 * - If operation exists and is completed: returns cached result
 * - If operation is processing: returns 409 Conflict
 * - If operation is new: processes and caches result
 */

interface IdempotentRequest {
  operation_type: string;
  payload: Record<string, any>;
}

async function hashRequest(payload: Record<string, any>): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get idempotency key from header
    const idempotencyKey = req.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return new Response(
        JSON.stringify({ error: 'Idempotency-Key header is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody: IdempotentRequest = await req.json();
    const { operation_type, payload } = requestBody;

    if (!operation_type || !payload) {
      return new Response(
        JSON.stringify({ error: 'operation_type and payload are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash the request for validation
    const requestHash = await hashRequest(payload);

    // Check if idempotency key already exists
    const { data: existingKey, error: checkError } = await supabase
      .from('idempotency_keys')
      .select('*')
      .eq('key', idempotencyKey)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking idempotency key:', checkError);
      throw checkError;
    }

    // If key exists
    if (existingKey) {
      // Validate that the request is the same
      if (existingKey.request_hash !== requestHash) {
        return new Response(
          JSON.stringify({ 
            error: 'Idempotency key already used with different request parameters' 
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If operation is still processing
      if (existingKey.status === 'processing') {
        return new Response(
          JSON.stringify({ 
            error: 'Operation is still processing',
            operation_id: existingKey.id
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If operation completed, return cached response
      if (existingKey.status === 'completed') {
        return new Response(
          JSON.stringify({
            ...existingKey.response_data,
            idempotent: true,
            cached: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If operation failed, return the error
      if (existingKey.status === 'failed') {
        return new Response(
          JSON.stringify({
            error: 'Previous operation failed',
            details: existingKey.response_data
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create new idempotency record
    const { data: newKey, error: insertError } = await supabase
      .from('idempotency_keys')
      .insert({
        key: idempotencyKey,
        user_id: user.id,
        operation_type,
        request_hash: requestHash,
        status: 'processing'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating idempotency key:', insertError);
      throw insertError;
    }

    // Process the operation based on type
    let result: any;
    let status = 'completed';
    
    try {
      switch (operation_type) {
        case 'approve_protocol':
          result = await approveProtocol(supabase, payload, user.id);
          break;
        case 'process_payment':
          result = await processPayment(supabase, payload, user.id);
          break;
        case 'create_expense':
          result = await createExpense(supabase, payload, user.id);
          break;
        case 'generate_consolidated_protocol':
          result = await generateConsolidatedProtocol(supabase, payload, user.id);
          break;
        default:
          throw new Error(`Unsupported operation type: ${operation_type}`);
      }
    } catch (error: any) {
      status = 'failed';
      result = { error: error.message };
      
      // Update idempotency key with failure
      await supabase
        .from('idempotency_keys')
        .update({
          status: 'failed',
          response_data: result,
          completed_at: new Date().toISOString()
        })
        .eq('id', newKey.id);

      return new Response(
        JSON.stringify(result),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update idempotency key with success result
    await supabase
      .from('idempotency_keys')
      .update({
        status,
        response_data: result,
        completed_at: new Date().toISOString()
      })
      .eq('id', newKey.id);

    return new Response(
      JSON.stringify({
        ...result,
        idempotent: true,
        cached: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Idempotent operation error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Operation handlers
async function approveProtocol(supabase: any, payload: any, userId: string) {
  const { protocol_id, approval_type, notes } = payload;
  
  const updateField = `${approval_type}_approved_at`;
  const approverField = `${approval_type}_approved_by`;
  
  const { data, error } = await supabase
    .from('service_provider_protocols')
    .update({
      [updateField]: new Date().toISOString(),
      [approverField]: userId,
      approval_notes: sanitizeInput(notes)
    })
    .eq('id', protocol_id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, protocol: data };
}

async function processPayment(supabase: any, payload: any, userId: string) {
  const { payment_request_id, amount } = payload;
  
  const { data, error } = await supabase
    .from('payment_requests')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_amount: amount
    })
    .eq('id', payment_request_id)
    .select()
    .single();

  if (error) throw error;
  return { success: true, payment: data };
}

async function createExpense(supabase: any, payload: any, userId: string) {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...payload,
      created_by: userId
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, expense: data };
}

async function generateConsolidatedProtocol(supabase: any, payload: any, userId: string) {
  const { competence_month, protocol_ids } = payload;
  
  // Generate protocol number
  const { data: protocolData, error: protocolError } = await supabase
    .rpc('generate_protocol_number', {
      p_type: 'consolidated',
      p_competence_month: competence_month
    });

  if (protocolError) throw protocolError;

  const { data, error } = await supabase
    .from('consolidated_protocols')
    .insert({
      protocol_number: protocolData,
      competence_month,
      service_provider_protocol_ids: protocol_ids,
      created_by: userId,
      status: 'draft'
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, consolidated_protocol: data };
}
