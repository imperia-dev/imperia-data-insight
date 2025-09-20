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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if BTG credentials are configured
    const btgClientId = Deno.env.get('BTG_CLIENT_ID');
    if (!btgClientId) {
      return new Response(
        JSON.stringify({ 
          error: 'BTG integration not configured',
          message: 'BTG_CLIENT_ID not found in secrets'
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get stored access token
    const { data: integration, error: tokenError } = await supabase
      .from('btg_integration')
      .select('access_token, token_expires_at')
      .single();

    if (tokenError || !integration?.access_token) {
      console.error('No valid token found:', tokenError);
      return new Response(
        JSON.stringify({ 
          error: 'Not authenticated',
          message: 'Please authenticate with BTG first'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if token is expired
    if (new Date(integration.token_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          error: 'Token expired',
          message: 'Please re-authenticate with BTG'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch suppliers from BTG API
    const suppliersResponse = await fetch('https://api.btgpactual.com/v1/suppliers', {
      headers: {
        'Authorization': `Bearer ${integration.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!suppliersResponse.ok) {
      console.error('Failed to fetch suppliers:', await suppliersResponse.text());
      throw new Error('Failed to fetch suppliers from BTG');
    }

    const suppliersData = await suppliersResponse.json();
    const suppliers = suppliersData.data || [];

    console.log(`Fetched ${suppliers.length} suppliers from BTG`);

    // Sync suppliers to database
    let synced = 0;
    let errors = 0;

    for (const supplier of suppliers) {
      try {
        const { error: upsertError } = await supabase
          .from('suppliers')
          .upsert({
            btg_id: supplier.id,
            name: supplier.name,
            cnpj: supplier.cnpj,
            email: supplier.email,
            phone: supplier.phone,
            status: supplier.status || 'active',
            category: supplier.category,
            btg_data: supplier, // Store full BTG data
            synced_at: new Date().toISOString()
          }, {
            onConflict: 'btg_id'
          });

        if (upsertError) {
          console.error(`Error syncing supplier ${supplier.id}:`, upsertError);
          errors++;
        } else {
          synced++;
        }
      } catch (error) {
        console.error(`Error processing supplier ${supplier.id}:`, error);
        errors++;
      }
    }

    // Update last sync timestamp
    await supabase
      .from('btg_integration')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', 1);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Sync completed: ${synced} suppliers synced, ${errors} errors`,
        synced,
        errors,
        total: suppliers.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Sync failed',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});