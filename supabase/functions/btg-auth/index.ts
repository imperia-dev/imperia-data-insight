import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get BTG credentials from environment
    const btgClientId = Deno.env.get('BTG_CLIENT_ID');
    const btgClientSecret = Deno.env.get('BTG_CLIENT_SECRET');
    
    // Check if credentials are configured
    if (!btgClientId || !btgClientSecret) {
      console.log('BTG credentials not configured yet');
      return new Response(
        JSON.stringify({ 
          error: 'BTG integration not configured',
          message: 'Please configure BTG_CLIENT_ID and BTG_CLIENT_SECRET in Supabase secrets'
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OAuth token from BTG
    const tokenResponse = await fetch('https://api.btgpactual.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: btgClientId,
        client_secret: btgClientSecret,
        scope: 'read:suppliers write:suppliers'
      })
    });

    if (!tokenResponse.ok) {
      console.error('Failed to get BTG token:', await tokenResponse.text());
      throw new Error('Failed to authenticate with BTG');
    }

    const tokenData = await tokenResponse.json();
    
    // Store token in database
    const { error: storeError } = await supabase
      .from('btg_integration')
      .upsert({
        id: 1, // Single row for storing integration data
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        last_sync_at: new Date().toISOString()
      });

    if (storeError) {
      console.error('Error storing token:', storeError);
      throw storeError;
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'BTG authentication successful',
        expiresIn: tokenData.expires_in
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('BTG auth error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Authentication failed',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});