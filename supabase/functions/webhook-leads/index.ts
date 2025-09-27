import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.2';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get IP address for logging
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  // Initialize response headers
  const responseHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json'
  };

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      console.error('Invalid method:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: responseHeaders }
      );
    }

    // Get webhook secret from environment
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify webhook signature
    const signature = req.headers.get('x-webhook-signature');
    
    if (!webhookSecret || !signature || signature !== webhookSecret) {
      console.error('Invalid webhook signature');
      
      // Log failed attempt
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from('webhook_logs').insert({
        event_type: 'lead_webhook_failed',
        payload: { error: 'Invalid signature' },
        headers: Object.fromEntries(req.headers.entries()),
        status_code: 401,
        error_message: 'Invalid webhook signature',
        ip_address: ip
      });

      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: responseHeaders }
      );
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload = await req.json();
    console.log('Webhook received:', payload);

    // Validate payload structure
    if (!payload.lead || !payload.lead.name || !payload.lead.email) {
      console.error('Invalid payload structure');
      
      // Log validation error
      await supabase.from('webhook_logs').insert({
        event_type: 'lead_webhook_validation_error',
        payload: payload,
        headers: Object.fromEntries(req.headers.entries()),
        status_code: 400,
        error_message: 'Invalid payload structure: missing required fields',
        ip_address: ip
      });

      return new Response(
        JSON.stringify({ 
          error: 'Invalid payload', 
          details: 'Missing required fields: lead.name and lead.email are required' 
        }),
        { status: 400, headers: responseHeaders }
      );
    }

    // Extract lead data
    const leadData = {
      name: payload.lead.name,
      email: payload.lead.email,
      phone: payload.lead.phone || null,
      company: payload.lead.company || null,
      message: payload.lead.message || null,
      source: payload.lead.source || 'webhook',
      metadata: payload.metadata || null
    };

    // Insert lead into database
    const { data: insertedLead, error: insertError } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting lead:', insertError);
      
      // Log database error
      await supabase.from('webhook_logs').insert({
        event_type: 'lead_webhook_database_error',
        payload: payload,
        headers: Object.fromEntries(req.headers.entries()),
        status_code: 500,
        error_message: insertError.message,
        ip_address: ip
      });

      throw insertError;
    }

    console.log('Lead inserted successfully:', insertedLead);

    // Log successful webhook
    await supabase.from('webhook_logs').insert({
      event_type: 'lead_webhook_success',
      payload: payload,
      headers: Object.fromEntries(req.headers.entries()),
      status_code: 200,
      response: { lead_id: insertedLead.id },
      ip_address: ip
    });

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead received successfully',
        lead_id: insertedLead.id
      }),
      { status: 200, headers: responseHeaders }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Try to log the error (if we can)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('webhook_logs').insert({
          event_type: 'lead_webhook_error',
          payload: await req.text().catch(() => 'Could not read body'),
          headers: Object.fromEntries(req.headers.entries()),
          status_code: 500,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          ip_address: ip
        });
      }
    } catch (logError) {
      console.error('Could not log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: responseHeaders }
    );
  }
});