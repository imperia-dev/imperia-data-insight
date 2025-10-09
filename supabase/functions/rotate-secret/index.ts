import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Rotate Secret Edge Function
 * 
 * Manages secret rotation for API keys, tokens, and integration credentials.
 * Only accessible by owners.
 */

interface RotateSecretRequest {
  secret_name: string;
  rotation_type: 'manual' | 'scheduled' | 'compromised';
  new_secret_value?: string; // Optional: if not provided, generates random
  expires_in_days?: number; // Default: 90 days
}

// Secret expiration defaults (in days)
const SECRET_EXPIRATION_DEFAULTS: Record<string, number> = {
  'BTG_CLIENT_ID': 90,
  'BTG_CLIENT_SECRET': 90,
  'FACEBOOK_ACCESS_TOKEN': 30,
  'TWILIO_AUTH_TOKEN': 90,
  'RESEND_API_KEY': 180,
  'WEBHOOK_SECRET': 90,
  'TRANSLATION_WEBHOOK_SECRET': 90,
  'SUPABASE_SERVICE_ROLE_KEY': 365, // Annual rotation
};

async function hashSecret(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSecureSecret(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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

    // Verify user is owner
    const { data: userRole } = await supabase
      .rpc('get_user_role', { user_id: user.id });

    if (userRole !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only owners can rotate secrets' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody: RotateSecretRequest = await req.json();
    const { 
      secret_name, 
      rotation_type, 
      new_secret_value,
      expires_in_days 
    } = requestBody;

    if (!secret_name || !rotation_type) {
      return new Response(
        JSON.stringify({ error: 'secret_name and rotation_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current secret value for hashing
    const currentSecretValue = Deno.env.get(secret_name);
    const oldSecretHash = currentSecretValue ? await hashSecret(currentSecretValue) : null;

    // Generate or use provided new secret
    const newSecret = new_secret_value || generateSecureSecret();
    const newSecretHash = await hashSecret(newSecret);

    // Determine expiration period
    const expirationDays = expires_in_days || SECRET_EXPIRATION_DEFAULTS[secret_name] || 90;

    // Log the rotation
    const { data: rotationLog, error: logError } = await supabase
      .rpc('log_secret_rotation', {
        p_secret_name: secret_name,
        p_rotation_type: rotation_type,
        p_old_hash: oldSecretHash,
        p_new_hash: newSecretHash,
        p_expires_in_days: expirationDays
      });

    if (logError) {
      console.error('Error logging rotation:', logError);
      throw logError;
    }

    // Create security alert for compromised secrets
    if (rotation_type === 'compromised') {
      await supabase
        .rpc('trigger_security_alert', {
          p_alert_type: 'secret_compromised',
          p_severity: 'critical',
          p_title: `Secret Compromised: ${secret_name}`,
          p_message: `The secret ${secret_name} has been marked as compromised and rotated.`,
          p_triggered_by: user.id,
          p_metadata: {
            secret_name,
            rotation_id: rotationLog,
            rotated_at: new Date().toISOString()
          }
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Secret ${secret_name} rotated successfully`,
        rotation_id: rotationLog,
        new_secret: newSecret, // Return new secret only once
        expires_at: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString(),
        next_rotation_due: new Date(Date.now() + (expirationDays - 7) * 24 * 60 * 60 * 1000).toISOString(),
        instructions: `Update the ${secret_name} in your Supabase project settings immediately`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Secret rotation error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
