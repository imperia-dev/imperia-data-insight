import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyTokenRequest {
  emailToken?: string;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { emailToken, userId }: VerifyTokenRequest = await req.json();

    console.log('Verifying reset token for user:', userId);

    // Get the reset token
    const { data: resetToken, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('email_token', emailToken)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !resetToken) {
      console.error('Token not found or expired:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update email verification status
    const { error: updateError } = await supabase
      .from('password_reset_tokens')
      .update({ email_verified: true })
      .eq('id', resetToken.id);

    if (updateError) {
      console.error('Error updating email verification:', updateError);
      throw updateError;
    }

    console.log('Email token verified for user:', userId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email verificado com sucesso',
        emailVerified: true,
        smsVerified: true, // Always true for email-only flow
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in verify-reset-token:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
