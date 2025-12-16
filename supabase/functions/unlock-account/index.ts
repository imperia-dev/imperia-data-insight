import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // First verify the user's JWT
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin/master/owner role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData, error: roleError } = await supabaseAdmin.rpc('get_user_role', {
      user_id: user.id
    });

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify user role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedRoles = ['owner', 'master', 'admin'];
    if (!allowedRoles.includes(roleData)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Only owner, master, or admin can unlock accounts.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the request body
    const { identifier, reason } = await req.json();

    if (!identifier) {
      return new Response(
        JSON.stringify({ error: 'Missing identifier (email) parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${user.email} unlocking account: ${identifier}`);

    // Unlock the account
    const { data: unlockData, error: unlockError } = await supabaseAdmin
      .from('account_lockouts')
      .update({
        unlocked_at: new Date().toISOString(),
        unlocked_by: user.id,
        metadata: {
          unlock_reason: reason || 'Manual unlock by admin',
          unlocked_by_email: user.email
        }
      })
      .eq('identifier', identifier)
      .is('unlocked_at', null)
      .select();

    if (unlockError) {
      console.error('Unlock error:', unlockError);
      return new Response(
        JSON.stringify({ error: 'Failed to unlock account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the unlock action
    await supabaseAdmin.rpc('log_login_attempt', {
      p_identifier: identifier,
      p_attempt_type: 'account_unlock',
      p_success: true,
      p_metadata: {
        unlocked_by: user.id,
        unlocked_by_email: user.email,
        reason: reason || 'Manual unlock by admin'
      }
    });

    // Log security event
    await supabaseAdmin.rpc('log_security_event', {
      p_event_type: 'account_unlocked',
      p_severity: 'info',
      p_details: {
        identifier,
        unlocked_by: user.id,
        unlocked_by_email: user.email,
        reason: reason || 'Manual unlock by admin',
        lockouts_cleared: unlockData?.length || 0
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Account ${identifier} has been unlocked`,
        lockouts_cleared: unlockData?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
