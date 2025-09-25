import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyTokenRequest {
  emailToken?: string;
  smsCode?: string;
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
    
    const { emailToken, smsCode, userId }: VerifyTokenRequest = await req.json();

    // Get the reset token
    let query = supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString());

    if (emailToken) {
      query = query.eq('email_token', emailToken);
    }

    const { data: resetToken, error: tokenError } = await query.single();

    if (tokenError || !resetToken) {
      console.error('Token not found or expired:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify email token
    if (emailToken) {
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
          message: 'Email verified successfully',
          emailVerified: true,
          smsVerified: resetToken.sms_verified,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify SMS code
    if (smsCode) {
      // Check attempts
      const { data: logs } = await supabase
        .from('sms_verification_logs')
        .select('attempts')
        .eq('user_id', userId)
        .eq('verification_type', 'password_reset')
        .eq('status', 'sent')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const attempts = logs?.attempts || 0;

      if (attempts >= 3) {
        return new Response(
          JSON.stringify({ error: 'Too many failed attempts. Please request a new code.' }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Verify the SMS code
      if (resetToken.sms_token !== smsCode) {
        // Update attempts
        if (logs) {
          await supabase
            .from('sms_verification_logs')
            .update({ attempts: attempts + 1 })
            .eq('id', logs.id);
        }

        console.error('Invalid SMS code for user:', userId);
        
        return new Response(
          JSON.stringify({ 
            error: 'Invalid code',
            attemptsRemaining: 3 - attempts - 1,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Update SMS verification status
      const { error: updateError } = await supabase
        .from('password_reset_tokens')
        .update({ sms_verified: true })
        .eq('id', resetToken.id);

      if (updateError) {
        console.error('Error updating SMS verification:', updateError);
        throw updateError;
      }

      // Update SMS log
      if (logs) {
        await supabase
          .from('sms_verification_logs')
          .update({ 
            status: 'verified',
            attempts: attempts + 1,
          })
          .eq('id', logs.id);
      }

      console.log('SMS code verified for user:', userId);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'SMS code verified successfully',
          emailVerified: resetToken.email_verified,
          smsVerified: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'No verification data provided' }),
      {
        status: 400,
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